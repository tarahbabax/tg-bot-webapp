/**
 * slots.js — каскадні слоти з множниками і фріспінами.
 * Сервер прораховує весь ланцюг наперед; клієнт лише програє анімацію.
 */

const SLOT_EMOJI = {
    cherry: "🍒", banana: "🍌", grape: "🍇", melon: "🍉", plum: "🫐",
    gem_blue: "💎", gem_green: "💚", gem_purple: "🔮", crown: "👑",
    scatter: "⚡",
};

const SLOT_COLS = 6;
const SLOT_ROWS = 5;
const SLOT_CELLS = SLOT_COLS * SLOT_ROWS;

let slotsBet      = 100;
let slotsCurrency = "coins";
let slotsBusy     = false;
let slotsFree     = 0;
let slotsPayTable = null;
let slotsAutoRunning = false;
let slotsBonusEarned = 0;

/* ── Звуки ────────────────────────────────────────────────── */

const SSOUND = {
    spin:    function () { beep(280, 0.14, "triangle", 0.045); },
    reelStop: function (col) {
        // Кожен наступний барабан зупиняється нижчою нотою
        beep(340 - col * 18, 0.07, "square", 0.035);
    },
    cascade: function (step) {
        beep(392 * Math.pow(1.09, Math.min(step, 10)), 0.11, "sine", 0.055);
    },
    mult: function () {
        beep(880, 0.09, "square", 0.04);
        setTimeout(function () { beep(1175, 0.13, "square", 0.045); }, 70);
    },
    win: function () {
        [523, 659, 784, 1047].forEach(function (f, i) {
            setTimeout(function () { beep(f, 0.13, "sine", 0.06); }, i * 85);
        });
    },
    bonus: function () {
        [440, 554, 659, 880, 1109].forEach(function (f, i) {
            setTimeout(function () { beep(f, 0.18, "sine", 0.07); }, i * 110);
        });
    },
    lose: function () { beep(200, 0.16, "sine", 0.03); },
};

/* ── Поле ─────────────────────────────────────────────────── */

function buildSlotsGrid() {
    const grid = document.getElementById("slotsGrid");
    if (!grid) return;
    grid.innerHTML = "";
    const frag = document.createDocumentFragment();
    for (let i = 0; i < SLOT_CELLS; i++) {
        const cell = el("div", "slot-cell");
        cell.dataset.index = i;
        frag.appendChild(cell);
    }
    grid.appendChild(frag);
}

/** Малює поле; drop=true запускає анімацію падіння. */
function paintGrid(symbols, mults, drop, onlyIndices) {
    const grid = document.getElementById("slotsGrid");
    if (!grid) return;

    symbols.forEach(function (sym, i) {
        if (onlyIndices && onlyIndices.indexOf(i) === -1) return;

        const cell = grid.children[i];
        if (!cell) return;

        cell.className = "slot-cell";
        cell.textContent = SLOT_EMOJI[sym] || "❔";

        if (sym === "scatter") cell.classList.add("slot-cell--scatter");

        if (drop) {
            cell.classList.add("slot-cell--drop");
            // Хвиля згори вниз по стовпчиках
            cell.style.animationDelay = ((i % SLOT_COLS) * 28 + Math.floor(i / SLOT_COLS) * 14) + "ms";
        } else {
            cell.style.animationDelay = "";
        }

        const m = mults && mults[String(i)];
        if (m) {
            const badge = el("div", "slot-cell__mult", "×" + m);
            cell.appendChild(badge);
        }
    });
}

function burstCells(indices) {
    const grid = document.getElementById("slotsGrid");
    indices.forEach(function (i, k) {
        const cell = grid.children[i];
        if (!cell) return;
        cell.style.animationDelay = (k * 12) + "ms";
        cell.classList.add("slot-cell--burst");
    });
}



/** Оновлює баланс над полем; gain=true підсвічує зростання. */
function syncSlotsBalance(balance, animate) {
    if (!balance) return;
    const c = document.getElementById("slotsBalCoins");
    const d = document.getElementById("slotsBalDonate");
    if (!c || !d) return;

    const oldCoins  = parseInt(c.textContent.replace(/\s/g, ""), 10) || 0;
    const oldDonate = parseInt(d.textContent.replace(/\s/g, ""), 10) || 0;

    c.textContent = (balance.coins || 0).toLocaleString("uk");
    d.textContent = (balance.donate || 0).toLocaleString("uk");

    if (!animate) return;

    if ((balance.coins || 0) > oldCoins) flashBalance(c);
    if ((balance.donate || 0) > oldDonate) flashBalance(d);
}

function flashBalance(node) {
    node.classList.remove("slots-balance__item--gain");
    void node.offsetWidth;
    node.classList.add("slots-balance__item--gain");
}

/* ── Прокручування барабанів ──────────────────────────────── */

let reelTimer = null;

/** Запускає швидку зміну символів — ілюзія обертання. */
function startReels() {
    const grid  = document.getElementById("slotsGrid");
    const frame = document.querySelector(".slots-frame");
    if (!grid) return;

    grid.classList.add("slots-grid--spinning");
    if (frame) frame.classList.add("slots-frame--active");

    const keys = Object.keys(SLOT_EMOJI).filter(function (k) { return k !== "scatter"; });

    Array.from(grid.children).forEach(function (cell) {
        cell.className = "slot-cell slot-cell--spinning";
        cell.style.animationDelay = "";
    });

    // Швидко міняємо символи, поки чекаємо відповідь сервера
    reelTimer = setInterval(function () {
        Array.from(grid.children).forEach(function (cell) {
            cell.textContent = SLOT_EMOJI[keys[Math.floor(Math.random() * keys.length)]];
        });
    }, 70);
}

/**
 * Зупиняє барабани по одному стовпчику зліва направо
 * і виставляє фінальні символи.
 */
async function stopReels(symbols, mults) {
    const grid  = document.getElementById("slotsGrid");
    const frame = document.querySelector(".slots-frame");
    if (!grid) return;

    if (reelTimer) { clearInterval(reelTimer); reelTimer = null; }

    for (let col = 0; col < SLOT_COLS; col++) {
        for (let row = 0; row < SLOT_ROWS; row++) {
            const i = row * SLOT_COLS + col;
            const cell = grid.children[i];
            if (!cell) continue;

            const sym = symbols[i];
            cell.className = "slot-cell slot-cell--stopped";
            cell.textContent = SLOT_EMOJI[sym] || "❔";
            if (sym === "scatter") cell.classList.add("slot-cell--scatter");

            const m = mults && mults[String(i)];
            if (m) cell.appendChild(el("div", "slot-cell__mult", "×" + m));
        }
        SSOUND.reelStop(col);
        await wait(110);
    }

    grid.classList.remove("slots-grid--spinning");
    if (frame) frame.classList.remove("slots-frame--active");
}

/* ── Множник ──────────────────────────────────────────────── */

function setTotalMult(value, pop) {
    const bar = document.getElementById("slotsMultBar");
    const val = document.getElementById("slotsMultVal");
    if (!val) return;

    val.textContent = "×" + value;
    bar.classList.toggle("slots-mult--hot", value > 1);

    if (pop) {
        val.classList.remove("slots-mult__val--pop");
        void val.offsetWidth;
        val.classList.add("slots-mult__val--pop");
    }
}

/* ── Банер виграшу ────────────────────────────────────────── */

function showWinBanner(amount, big) {
    const b = document.getElementById("slotsWinBanner");
    if (!b) return;
    b.textContent = "+" + amount.toLocaleString("uk") + " " + curLabelSlots();
    b.className = "slots-winline slots-winline--show" + (big ? " slots-winline--big" : "");
}

function hideWinBanner() {
    const b = document.getElementById("slotsWinBanner");
    if (b) b.className = "slots-winline";
}

function curLabelSlots() {
    return slotsCurrency === "donate" ? t("donateShort") : t("coinsShort");
}

/* ── Програвання спіну ────────────────────────────────────── */

function wait(ms) {
    return new Promise(function (r) { setTimeout(r, ms); });
}

async function playSpin(data) {
    hideWinBanner();
    setTotalMult(1, false);

    // 1. Барабани зупиняються по одному стовпчику
    await stopReels(data.grid, data.mults);
    await wait(200);

    let runningMult = 0;
    let currentGrid = data.grid.slice();

    // Множники, що вже лежали на полі
    const startMults = Object.values(data.mults || {});
    if (startMults.length) {
        startMults.forEach(function (m) { runningMult += m; });
        SSOUND.mult();
        setTotalMult(runningMult, true);
        await wait(320);
    }

    // 2. Каскади
    for (let s = 0; s < data.steps.length; s++) {
        const step = data.steps[s];

        burstCells(step.removed);
        SSOUND.cascade(s);
        await wait(430);

        currentGrid = step.grid;
        paintGrid(currentGrid, step.mults, true, step.removed);
        await wait(380);

        const newMults = Object.values(step.mults || {});
        if (newMults.length) {
            newMults.forEach(function (m) { runningMult += m; });
            SSOUND.mult();
            setTotalMult(runningMult || 1, true);
            await wait(300);
        }
    }

    // 3. Підсумок
    if (data.win > 0) {
        setTotalMult(data.multiplier, true);
        const big = data.win >= slotsBet * 20;
        showWinBanner(data.win, big);
        SSOUND.win();
        await wait(big ? 1900 : 1300);
        hideWinBanner();
    } else {
        SSOUND.lose();
        await wait(300);
    }

    // 4. Бонус
    if (data.bonus_triggered) {
        SSOUND.bonus();
        openBonusModal(data.free_spins);
        await wait(400);
    }
}

/* ── Спін ─────────────────────────────────────────────────── */

async function doSlotsSpin(isAuto) {
    if (slotsBusy) return;

    const errEl = document.getElementById("slotsError");
    errEl.textContent = "";

    const bet = parseInt(document.getElementById("slotsBet").value, 10);
    if (!bet || bet <= 0) { errEl.textContent = t("minesNoBet"); return; }
    slotsBet = bet;

    slotsBusy = true;
    const btn = document.getElementById("slotsSpinBtn");
    btn.disabled = true;
    btn.classList.add("slots-spin-btn--spinning");
    document.getElementById("slotsControls").classList.add("slots-controls--locked");

    // Крутимо одразу, не чекаючи сервера — відгук миттєвий
    startReels();
    SSOUND.spin();

    try {
        const spinPromise = API.slotsSpin(bet, slotsCurrency);
        // Мінімальний час обертання, щоб анімацію було видно
        const [data] = await Promise.all([spinPromise, wait(900)]);

        syncBalance(data.balance);
        syncSlotsBalance(data.balance, true);

        await playSpin(data);

        if (data.was_free && data.win) slotsBonusEarned += data.win;

        slotsFree = data.free_spins || 0;
        updateFreeSpinsUI(data.bonus_total);
    } catch (e) {
        if (reelTimer) { clearInterval(reelTimer); reelTimer = null; }
        const grid = document.getElementById("slotsGrid");
        const frame = document.querySelector(".slots-frame");
        if (grid) grid.classList.remove("slots-grid--spinning");
        if (frame) frame.classList.remove("slots-frame--active");

        const msg = String(e.message || "");
        errEl.textContent = msg.indexOf("400") !== -1 ? t("errFunds") : t("errGeneric");
    } finally {
        slotsBusy = false;
        btn.disabled = false;
        btn.classList.remove("slots-spin-btn--spinning");
        document.getElementById("slotsControls").classList.remove("slots-controls--locked");
    }
}

/* ── Фріспіни ─────────────────────────────────────────────── */

function updateFreeSpinsUI(bonusTotal) {
    const bar = document.getElementById("slotsBonusBar");
    const cnt = document.getElementById("slotsFreeCount");
    const tot = document.getElementById("slotsBonusTotal");
    const btn = document.getElementById("slotsSpinBtn");
    const lbl = document.getElementById("slotsSpinLabel");

    bar.classList.toggle("slots-bonus--active", slotsFree > 0);
    cnt.textContent = slotsFree;

    tot.textContent = (bonusTotal && slotsFree > 0)
        ? "+" + bonusTotal.toLocaleString("uk")
        : "";

    // У бонусі ставка не змінюється і кнопка золота
    btn.classList.toggle("slots-spin-btn--free", slotsFree > 0);
    lbl.textContent = slotsFree > 0 ? t("slotsFreeSpin") : t("slotsSpin");
    document.getElementById("slotsControls").classList.toggle("slots-controls--locked", slotsFree > 0);
}

function openBonusModal(count) {
    document.getElementById("slotsBonusCount").textContent = count;
    document.getElementById("slotsBonusTitleText").textContent = t("slotsBonusTitle");
    document.getElementById("slotsBonusTextEl").textContent = t("slotsBonusText");

    const okBtn = document.getElementById("slotsBonusOk");
    okBtn.textContent = t("slotsBonusGo");
    delete okBtn.dataset.summary;
    document.getElementById("slotsBonusBackdrop").classList.add("modal-backdrop--open");
    document.getElementById("slotsBonusModal").classList.add("center-modal--open");
}

function closeBonusModal() {
    document.getElementById("slotsBonusBackdrop").classList.remove("modal-backdrop--open");
    document.getElementById("slotsBonusModal").classList.remove("center-modal--open");

    // Бонус крутиться сам — гравцю не треба тиснути 10 разів
    if (slotsFree > 0) runFreeSpins();
}

/**
 * Автоматично прокручує всі безкоштовні спіни підряд,
 * з паузою між ними щоб було видно результат кожного.
 */
async function runFreeSpins() {
    if (slotsAutoRunning) return;
    slotsAutoRunning = true;

    try {
        while (slotsFree > 0) {
            const screen = document.getElementById("slotsScreen");
            // Гравець вийшов з гри — зупиняємось
            if (!screen || !screen.classList.contains("fullscreen--open")) break;

            await wait(700);
            await doSlotsSpin(true);
        }

        // Підсумок бонусу
        if (slotsBonusEarned > 0) {
            showBonusSummary(slotsBonusEarned);
        }
    } finally {
        slotsAutoRunning = false;
        slotsBonusEarned = 0;
    }
}

function showBonusSummary(total) {
    document.getElementById("slotsBonusCount").textContent =
        "+" + total.toLocaleString("uk");
    document.getElementById("slotsBonusTitleText").textContent = t("slotsBonusEnd");
    document.getElementById("slotsBonusTextEl").textContent = t("slotsBonusEndText");

    const okBtn = document.getElementById("slotsBonusOk");
    okBtn.textContent = t("ok");
    okBtn.dataset.summary = "1";

    document.getElementById("slotsBonusBackdrop").classList.add("modal-backdrop--open");
    document.getElementById("slotsBonusModal").classList.add("center-modal--open");
}

/* ── Довідка ──────────────────────────────────────────────── */

function openSlotsHelp() {
    const body = document.getElementById("slotsHelpBody");
    body.innerHTML = "";

    if (slotsPayTable) {
        Object.keys(slotsPayTable).forEach(function (sym) {
            const p = slotsPayTable[sym];
            const row = el("div", "slots-pay-row");
            row.appendChild(el("span", "slots-pay-row__sym", SLOT_EMOJI[sym] || "❔"));

            const vals = el("div", "slots-pay-row__vals");
            [8, 10, 12].forEach(function (n) {
                const span = el("span", null, null);
                span.innerHTML = n + "+ <b>" + (p[n] || p[String(n)] || 0) + "×</b>";
                vals.appendChild(span);
            });
            row.appendChild(vals);
            body.appendChild(row);
        });
    }

    body.appendChild(el("p", "slots-help__note", t("slotsHelpNote")));

    document.getElementById("slotsHelpBackdrop").classList.add("modal-backdrop--open");
    document.getElementById("slotsHelpModal").classList.add("center-modal--open");
}

function closeSlotsHelp() {
    document.getElementById("slotsHelpBackdrop").classList.remove("modal-backdrop--open");
    document.getElementById("slotsHelpModal").classList.remove("center-modal--open");
}

/* ── Завантаження ─────────────────────────────────────────── */

async function loadSlots() {
    try {
        const s = await API.slotsState();
        slotsFree = s.free_spins || 0;
        slotsPayTable = s.symbols || null;

        if (s.bet) {
            slotsBet = s.bet;
            document.getElementById("slotsBet").value = s.bet;
        }
        if (s.currency) {
            slotsCurrency = s.currency;
            document.getElementById("slotsCurCoins").classList.toggle("currency-pill--active", s.currency === "coins");
            document.getElementById("slotsCurDonate").classList.toggle("currency-pill--active", s.currency === "donate");
        }

        updateFreeSpinsUI(s.bonus_total);

        // Баланс беремо з головного екрана
        syncSlotsBalance({
            coins:  parseInt((document.getElementById("statCoins") || {}).textContent, 10) || 0,
            donate: parseInt((document.getElementById("statDonate") || {}).textContent, 10) || 0,
        }, false);

        // Початкове поле — випадкові символи для вигляду
        const demo = [];
        const keys = Object.keys(SLOT_EMOJI).filter(function (k) { return k !== "scatter"; });
        for (let i = 0; i < SLOT_CELLS; i++) {
            demo.push(keys[Math.floor(Math.random() * keys.length)]);
        }
        paintGrid(demo, {}, false);
    } catch (e) {
        console.warn("slots:", e.message);
    }
}

/* ── Ініціалізація ────────────────────────────────────────── */

function initSlots() {
    const openBtn = document.getElementById("openSlots");
    const screen  = document.getElementById("slotsScreen");
    if (!openBtn || !screen) return;

    buildSlotsGrid();

    openBtn.addEventListener("click", function () {
        screen.classList.add("fullscreen--open");
        loadSlots();
    });

    const back = document.getElementById("slotsBack");
    if (back) back.addEventListener("click", function () {
        if (slotsBusy) return;
        screen.classList.remove("fullscreen--open");
        snapScreensToActiveTab();
    });

    // Валюта
    const cc = document.getElementById("slotsCurCoins");
    const cd = document.getElementById("slotsCurDonate");
    if (cc) cc.addEventListener("click", function () {
        if (slotsFree > 0) return;
        slotsCurrency = "coins";
        cc.classList.add("currency-pill--active");
        cd.classList.remove("currency-pill--active");
    });
    if (cd) cd.addEventListener("click", function () {
        if (slotsFree > 0) return;
        slotsCurrency = "donate";
        cd.classList.add("currency-pill--active");
        cc.classList.remove("currency-pill--active");
    });

    // Ставка
    const betInput = document.getElementById("slotsBet");
    const step = function (dir) {
        const cur = parseInt(betInput.value, 10) || 100;
        // Крок пропорційний ставці — зручно і на малих, і на великих
        const s = cur < 100 ? 10 : cur < 1000 ? 50 : cur < 10000 ? 500 : 5000;
        betInput.value = Math.max(1, cur + dir * s);
        slotsBet = parseInt(betInput.value, 10);
    };
    const minus = document.getElementById("slotsBetMinus");
    const plus  = document.getElementById("slotsBetPlus");
    if (minus) minus.addEventListener("click", function () { step(-1); });
    if (plus)  plus.addEventListener("click", function () { step(1); });

    // Спін
    const spin = document.getElementById("slotsSpinBtn");
    if (spin) spin.addEventListener("click", doSlotsSpin);

    // Бонус
    const bonusOk = document.getElementById("slotsBonusOk");
    if (bonusOk) bonusOk.addEventListener("click", function () {
        const isSummary = bonusOk.dataset.summary === "1";
        document.getElementById("slotsBonusBackdrop").classList.remove("modal-backdrop--open");
        document.getElementById("slotsBonusModal").classList.remove("center-modal--open");
        if (!isSummary && slotsFree > 0) runFreeSpins();
    });
    const bonusBd = document.getElementById("slotsBonusBackdrop");
    if (bonusBd) bonusBd.addEventListener("click", function () {
        document.getElementById("slotsBonusBackdrop").classList.remove("modal-backdrop--open");
        document.getElementById("slotsBonusModal").classList.remove("center-modal--open");
    });

    // Довідка
    const help = document.getElementById("slotsHelp");
    if (help) help.addEventListener("click", openSlotsHelp);
    ["slotsHelpClose", "slotsHelpOk", "slotsHelpBackdrop"].forEach(function (id) {
        const n = document.getElementById(id);
        if (n) n.addEventListener("click", closeSlotsHelp);
    });
}
