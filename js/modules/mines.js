/**
 * mines.js — гра «Міни».
 * Позиції мін живуть тільки на сервері: клієнт дізнається про них
 * лише після підриву або кешауту.
 */

const MINES_CELLS = 25;

let minesActive   = false;
let minesOpened   = [];
let minesBusy     = false;
let minesCurrency = "coins";
let minesCount    = 3;

const GEM_SVG  = '<svg viewBox="0 0 24 24" fill="none"><path d="M6 3h12l4 6-10 12L2 9l4-6z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M2 9h20M9 3l-3 6 6 12M15 3l3 6-6 12" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>';
const MINE_SVG = '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="13.5" r="5.5"/><path d="M12 7.4V4.2M12 4.2l2-1.2M18.6 7.2l1.8-1.8M5.4 7.2L3.6 5.4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" fill="none"/></svg>';

/* ── Звуки ────────────────────────────────────────────────── */

const MSOUND = {
    gem: function (step) {
        // Нота підвищується з кожною відкритою клітинкою
        const base = 440 * Math.pow(1.06, Math.min(step, 18));
        beep(base, 0.1, "sine", 0.05);
    },
    boom: function () {
        beep(90, 0.32, "sawtooth", 0.08);
        setTimeout(function () { beep(60, 0.4, "sawtooth", 0.06); }, 60);
    },
    cash: function () {
        beep(523, 0.1, "sine", 0.06);
        setTimeout(function () { beep(659, 0.1, "sine", 0.06); }, 85);
        setTimeout(function () { beep(784, 0.1, "sine", 0.06); }, 170);
        setTimeout(function () { beep(1047, 0.24, "sine", 0.07); }, 255);
    },
    start: function () { beep(330, 0.09, "triangle", 0.05); },
};

/* ── Поле ─────────────────────────────────────────────────── */

function buildMinesField() {
    const field = document.getElementById("minesField");
    if (!field) return;

    field.innerHTML = "";
    const frag = document.createDocumentFragment();
    for (let i = 0; i < MINES_CELLS; i++) {
        const cell = el("div", "mine-cell");
        cell.dataset.index = i;
        cell.addEventListener("click", function () { onMineClick(i); });
        frag.appendChild(cell);
    }
    field.appendChild(frag);
    field.classList.toggle("mines-field--idle", !minesActive);
}

function markCellOpen(index) {
    const cell = document.getElementById("minesField").children[index];
    if (!cell) return;
    cell.classList.add("mine-cell--open");
    const gem = el("span", "mine-cell__gem");
    gem.innerHTML = GEM_SVG;
    cell.appendChild(gem);
}

function markCellBoom(index) {
    const cell = document.getElementById("minesField").children[index];
    if (!cell) return;
    cell.classList.add("mine-cell--boom");
    const m = el("span", "mine-cell__mine");
    m.innerHTML = MINE_SVG;
    cell.appendChild(m);
}

/** Показує решту мін після програшу — з каскадною затримкою. */
function revealMines(positions, skipIndex) {
    const field = document.getElementById("minesField");
    positions.forEach(function (pos, i) {
        if (pos === skipIndex) return;
        const cell = field.children[pos];
        if (!cell || cell.classList.contains("mine-cell--open")) return;

        setTimeout(function () {
            cell.classList.add("mine-cell--revealed");
            const m = el("span", "mine-cell__mine");
            m.innerHTML = MINE_SVG;
            cell.appendChild(m);
        }, 90 + i * 55);
    });
}

/* ── Табло ────────────────────────────────────────────────── */

function updateMinesHud(mult, payout, next, bump) {
    const multEl = document.getElementById("minesMult");
    const box    = document.getElementById("minesMultBox");
    const payEl  = document.getElementById("minesPayout");
    const nextEl = document.getElementById("minesNext");

    multEl.textContent = (mult || 1).toFixed(2) + "×";
    box.classList.toggle("mines-hud__mult--active", !!(mult && mult > 1));

    payEl.textContent = payout
        ? payout.toLocaleString("uk") + " " + curLabel()
        : "—";

    nextEl.textContent = next ? next.toFixed(2) + "×" : "—";

    if (bump) {
        multEl.classList.remove("mines-hud__mult-val--bump");
        void multEl.offsetWidth;
        multEl.classList.add("mines-hud__mult-val--bump");
    }
}

function curLabel() {
    return minesCurrency === "donate" ? t("donateShort") : t("coinsShort");
}

/* ── Керування станом кнопок ──────────────────────────────── */

function setMinesUI(active) {
    minesActive = active;

    document.getElementById("minesSetup").classList.toggle("mines-setup--hidden", active);
    document.getElementById("minesStartBtn").style.display = active ? "none" : "flex";
    document.getElementById("minesCashBtn").style.display  = active ? "flex" : "none";
    document.getElementById("minesField").classList.toggle("mines-field--idle", !active);
}

function updateCashLabel(payout) {
    const label = document.getElementById("minesCashLabel");
    label.textContent = payout
        ? t("minesCash") + " " + payout.toLocaleString("uk") + " " + curLabel()
        : t("minesCash");
}

/* ── Дії ──────────────────────────────────────────────────── */

async function startMines() {
    if (minesBusy) return;
    const errEl = document.getElementById("minesError");
    errEl.textContent = "";

    const bet = parseInt(document.getElementById("minesBet").value, 10);
    if (!bet || bet <= 0) { errEl.textContent = t("minesNoBet"); return; }

    minesBusy = true;
    document.getElementById("minesStartBtn").disabled = true;

    try {
        const r = await API.minesStart(bet, minesCurrency, minesCount);
        MSOUND.start();

        minesOpened = [];
        syncBalance(r.balance);
        buildMinesField();
        setMinesUI(true);
        updateMinesHud(1, 0, r.next_multiplier, false);
        updateCashLabel(0);
    } catch (e) {
        const msg = String(e.message || "");
        errEl.textContent = msg.indexOf("400") !== -1 ? t("errFunds") : t("errGeneric");
    } finally {
        minesBusy = false;
        document.getElementById("minesStartBtn").disabled = false;
    }
}

async function onMineClick(index) {
    if (!minesActive || minesBusy) return;
    if (minesOpened.indexOf(index) !== -1) return;

    minesBusy = true;
    try {
        const r = await API.minesOpen(index);

        if (r.hit) {
            // Підрив
            MSOUND.boom();
            markCellBoom(index);
            revealMines(r.mines || [], index);
            setMinesUI(false);
            updateMinesHud(1, 0, null, false);

            setTimeout(function () {
                showMinesResult(false, r.lost, 0);
            }, 850);
            return;
        }

        minesOpened = r.opened || [];
        markCellOpen(index);
        MSOUND.gem(minesOpened.length);
        updateMinesHud(r.multiplier, r.payout, r.next_multiplier, true);
        updateCashLabel(r.payout);

        // Все безпечне відкрито — забираємо автоматично
        if (r.all_open) {
            setTimeout(cashoutMines, 400);
        }
    } catch (e) {
        toast(t("errGeneric"), "error");
    } finally {
        minesBusy = false;
    }
}

async function cashoutMines() {
    if (!minesActive || minesBusy) return;
    minesBusy = true;

    try {
        const r = await API.minesCashout();
        MSOUND.cash();

        syncBalance(r.balance);
        revealMines(r.mines || [], -1);
        setMinesUI(false);

        setTimeout(function () {
            showMinesResult(true, r.payout, r.multiplier);
        }, 600);
    } catch (e) {
        const msg = String(e.message || "");
        toast(msg.indexOf("400") !== -1 ? t("minesOpenFirst") : t("errGeneric"), "error");
    } finally {
        minesBusy = false;
    }
}

/* ── Результат ────────────────────────────────────────────── */

function showMinesResult(win, amount, mult) {
    const icon   = document.getElementById("minesResIcon");
    const title  = document.getElementById("minesResTitle");
    const amtEl  = document.getElementById("minesResAmount");
    const textEl = document.getElementById("minesResText");

    icon.className = "mines-res__icon " + (win ? "mines-res__icon--win" : "mines-res__icon--lose");
    icon.textContent = win ? "💎" : "💥";

    title.textContent = win ? t("minesWin") : t("minesLose");

    amtEl.className = "mines-res__amount " + (win ? "mines-res__amount--win" : "mines-res__amount--lose");
    amtEl.textContent = (win ? "+" : "−") + amount.toLocaleString("uk") + " " + curLabel();

    textEl.textContent = win
        ? t("minesWinText").replace("{m}", (mult || 1).toFixed(2))
        : t("minesLoseText");

    document.getElementById("minesResBackdrop").classList.add("modal-backdrop--open");
    document.getElementById("minesResModal").classList.add("center-modal--open");
}

function closeMinesResult() {
    document.getElementById("minesResBackdrop").classList.remove("modal-backdrop--open");
    document.getElementById("minesResModal").classList.remove("center-modal--open");
    buildMinesField();
    updateMinesHud(1, 0, null, false);
}

/* ── Довідка ──────────────────────────────────────────────── */

function openMinesHelp() {
    const body = document.getElementById("minesHelpBody");
    body.innerHTML = "";

    [t("minesStep1"), t("minesStep2"), t("minesStep3"), t("minesStep4")]
        .forEach(function (text, i) {
            const row = el("div", "mines-help__row");
            row.appendChild(el("span", "mines-help__num", String(i + 1)));
            row.appendChild(el("p", "mines-help__text", text));
            body.appendChild(row);
        });

    body.appendChild(el("p", "mines-help__note", t("minesHelpNote")));

    document.getElementById("minesHelpBackdrop").classList.add("modal-backdrop--open");
    document.getElementById("minesHelpModal").classList.add("center-modal--open");
}

function closeMinesHelp() {
    document.getElementById("minesHelpBackdrop").classList.remove("modal-backdrop--open");
    document.getElementById("minesHelpModal").classList.remove("center-modal--open");
}

/* ── Відновлення гри ──────────────────────────────────────── */

async function loadMinesState() {
    try {
        const s = await API.minesState();
        buildMinesField();

        if (!s.active) {
            setMinesUI(false);
            updateMinesHud(1, 0, null, false);
            return;
        }

        // Гра лишилась активною — відновлюємо поле
        minesCurrency = s.currency;
        minesCount    = s.mines_count;
        minesOpened   = s.opened || [];

        setMinesUI(true);
        minesOpened.forEach(markCellOpen);
        updateMinesHud(s.multiplier, s.payout, s.next_multiplier, false);
        updateCashLabel(s.payout);
    } catch (e) {
        console.warn("mines:", e.message);
    }
}

/* ── Ініціалізація ────────────────────────────────────────── */

function initMines() {
    const openBtn = document.getElementById("openMines");
    const screen  = document.getElementById("minesScreen");
    if (!openBtn || !screen) return;

    openBtn.addEventListener("click", function () {
        screen.classList.add("fullscreen--open");
        loadMinesState();
    });

    const back = document.getElementById("minesBack");
    if (back) back.addEventListener("click", function () {
        // Активну гру не кидаємо — вона збережеться на сервері
        screen.classList.remove("fullscreen--open");
        snapScreensToActiveTab();
    });

    // Валюта
    const cc = document.getElementById("minesCurCoins");
    const cd = document.getElementById("minesCurDonate");
    if (cc) cc.addEventListener("click", function () {
        minesCurrency = "coins";
        cc.classList.add("currency-pill--active");
        cd.classList.remove("currency-pill--active");
    });
    if (cd) cd.addEventListener("click", function () {
        minesCurrency = "donate";
        cd.classList.add("currency-pill--active");
        cc.classList.remove("currency-pill--active");
    });

    // Повзунок мін
    const slider = document.getElementById("minesSlider");
    const valEl  = document.getElementById("minesCountVal");

    function setCount(n) {
        minesCount = Math.max(1, Math.min(20, n));
        if (slider) slider.value = minesCount;
        if (valEl)  valEl.textContent = minesCount;
        document.querySelectorAll(".mines-preset").forEach(function (b) {
            b.classList.toggle("mines-preset--active",
                parseInt(b.dataset.mines, 10) === minesCount);
        });
    }

    if (slider) slider.addEventListener("input", function (e) {
        setCount(parseInt(e.target.value, 10));
    });

    document.querySelectorAll(".mines-preset").forEach(function (b) {
        b.addEventListener("click", function () {
            setCount(parseInt(b.dataset.mines, 10));
        });
    });

    // Дії
    const start = document.getElementById("minesStartBtn");
    if (start) start.addEventListener("click", startMines);

    const cash = document.getElementById("minesCashBtn");
    if (cash) cash.addEventListener("click", cashoutMines);

    const ok = document.getElementById("minesResOk");
    if (ok) ok.addEventListener("click", closeMinesResult);
    const rb = document.getElementById("minesResBackdrop");
    if (rb) rb.addEventListener("click", closeMinesResult);

    // Довідка
    const help = document.getElementById("minesHelp");
    if (help) help.addEventListener("click", openMinesHelp);
    ["minesHelpClose", "minesHelpOk", "minesHelpBackdrop"].forEach(function (id) {
        const n = document.getElementById(id);
        if (n) n.addEventListener("click", closeMinesHelp);
    });

    buildMinesField();
    setCount(3);
}
