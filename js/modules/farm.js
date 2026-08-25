/**
 * farm.js — гра «Ферма» + прогрес рівня гравця.
 * Таймер рахується від серверного planted_at, тому час іде
 * і поки застосунок закритий.
 */

const CROP_ICON = {
    carrot:  "🥕",
    potato:  "🥔",
    beet:    "🍠",
    cabbage: "🥬",
};

let farmState   = null;
let selectedCrop = null;
let farmTicker  = null;
let localPlots  = [];

/* ── Звук ─────────────────────────────────────────────────── */

let audioCtx = null;

/** Короткий синтезований звук — без зовнішніх файлів. */
function beep(freq, duration, type, gainValue) {
    try {
        if (!audioCtx) {
            const AC = window.AudioContext || window.webkitAudioContext;
            if (!AC) return;
            audioCtx = new AC();
        }
        if (audioCtx.state === "suspended") audioCtx.resume();

        const osc  = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = type || "sine";
        osc.frequency.value = freq;
        gain.gain.value = gainValue || 0.06;

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        const now = audioCtx.currentTime;
        gain.gain.setValueAtTime(gain.gain.value, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + (duration || 0.12));

        osc.start(now);
        osc.stop(now + (duration || 0.12));
    } catch (e) { /* звук не критичний */ }
}

const SOUND = {
    plant:   function () { beep(420, 0.09, "sine", 0.05); },
    select:  function () { beep(620, 0.06, "triangle", 0.04); },
    harvest: function () {
        beep(523, 0.1, "sine", 0.06);
        setTimeout(function () { beep(659, 0.1, "sine", 0.06); }, 90);
        setTimeout(function () { beep(784, 0.18, "sine", 0.07); }, 180);
    },
    upgrade: function () {
        beep(392, 0.12, "sine", 0.06);
        setTimeout(function () { beep(523, 0.12, "sine", 0.06); }, 110);
        setTimeout(function () { beep(659, 0.24, "sine", 0.07); }, 220);
    },
    error:   function () { beep(180, 0.16, "sawtooth", 0.04); },
};

/* ── Формат часу ──────────────────────────────────────────── */

function formatTime(sec) {
    const s = Math.max(0, Math.floor(sec));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return String(m).padStart(2, "0") + ":" + String(r).padStart(2, "0");
}

/* ── Рендер ───────────────────────────────────────────────── */

function renderFarmField() {
    const field = document.getElementById("farmField");
    if (!field || !farmState) return;

    const count = farmState.plot_count || 25;
    const ready = farmState.ready;

    // Клітинки створюємо один раз; далі лише оновлюємо вміст,
    // щоб не втрачати обробники і не смикати макет щосекунди.
    if (field.children.length !== count) {
        field.innerHTML = "";
        const frag = document.createDocumentFragment();
        for (let i = 0; i < count; i++) {
            const cell = el("div", "plot");
            cell.dataset.index = i;
            cell.appendChild(el("span", "plot__crop"));
            cell.addEventListener("click", function () { onPlotClick(i); });
            frag.appendChild(cell);
        }
        field.appendChild(frag);
    }

    Array.from(field.children).forEach(function (cell, i) {
        const crop = localPlots[i] || "";
        const span = cell.querySelector(".plot__crop");
        span.textContent = crop ? (CROP_ICON[crop] || "🌱") : "";

        cell.classList.toggle("plot--planted", !!crop);
        cell.classList.toggle("plot--growing", !!crop && !ready && !!farmState.planted_at);
        cell.classList.toggle("plot--ready", !!crop && ready);
    });
}

function renderFarmCrops() {
    const box = document.getElementById("farmCrops");
    if (!box || !farmState) return;

    const crops = farmState.crops || {};
    const level = farmState.farm_level || 1;

    box.innerHTML = "";
    const frag = document.createDocumentFragment();

    Object.keys(crops).forEach(function (key) {
        const spec = crops[key];
        const locked = spec.min_level > level;

        const btn = el("button", "crop-btn" + (locked ? " crop-btn--locked" : ""));
        btn.type = "button";
        btn.appendChild(el("span", null, CROP_ICON[key] || "🌱"));

        if (locked) {
            btn.appendChild(el("span", "crop-btn__lock", "Lv " + spec.min_level));
        } else {
            btn.addEventListener("click", function () {
                selectedCrop = selectedCrop === key ? null : key;
                SOUND.select();
                renderFarmCrops();
            });
        }
        if (selectedCrop === key) btn.classList.add("crop-btn--active");
        frag.appendChild(btn);
    });

    box.appendChild(frag);
}

function renderFarmStats() {
    if (!farmState) return;

    document.getElementById("farmLevel").textContent = farmState.farm_level || 1;

    const timerEl = document.getElementById("farmTimer");
    const timerCard = timerEl.closest(".farm-stat");

    if (farmState.ready) {
        timerEl.textContent = t("farmReady");
        timerCard.classList.add("farm-stat--ready");
    } else if (farmState.planted_at) {
        timerEl.textContent = formatTime(farmState.seconds_left);
        timerCard.classList.remove("farm-stat--ready");
    } else {
        timerEl.textContent = "--:--";
        timerCard.classList.remove("farm-stat--ready");
    }

    // Кнопка покращення
    const upBtn = document.getElementById("farmUpgradeBtn");
    const canUpgrade = !!farmState.upgrade_cost;
    upBtn.disabled = !canUpgrade;
    upBtn.querySelector("span").textContent = canUpgrade ? t("farmUpgrade") : t("farmMaxLevel");
}

function renderFarm() {
    renderFarmStats();
    renderFarmField();
    renderFarmCrops();
}

/* ── Дії ──────────────────────────────────────────────────── */

async function onPlotClick(index) {
    if (!farmState) return;

    // Готовий урожай — збираємо все поле
    if (farmState.ready) {
        await harvestFarm();
        return;
    }

    // Поле вже росте — не чіпаємо
    if (farmState.planted_at) {
        toast(t("farmGrowing"), "info");
        return;
    }

    if (!selectedCrop) {
        SOUND.error();
        toast(t("farmPickCrop"), "info");
        return;
    }

    // Ставимо культуру локально — миттєвий відгук
    if (localPlots[index] === selectedCrop) return;
    localPlots[index] = selectedCrop;
    SOUND.plant();

    const cell = document.getElementById("farmField").children[index];
    if (cell) {
        const span = cell.querySelector(".plot__crop");
        span.textContent = CROP_ICON[selectedCrop] || "🌱";
        span.classList.remove("plot__crop--new");
        void span.offsetWidth;
        span.classList.add("plot__crop--new");
        cell.classList.add("plot--planted");
    }

    // Відправляємо на сервер (він стартує таймер коли поле повне)
    try {
        const filled = localPlots.filter(Boolean).length;
        const data = await API.farmPlant(normalizedPlots());
        farmState = data;
        localPlots = (data.plots || []).slice();

        if (filled === (farmState.plot_count || 25)) {
            SOUND.harvest();
            toast(t("farmPlanted"), "success");
        }
        renderFarm();
        startFarmTicker();
    } catch (e) {
        const msg = String(e.message || "");
        toast(msg.indexOf("403") !== -1 ? t("farmLocked") : t("errGeneric"), "error");
        loadFarm();
    }
}

/** Масив рівно з plot_count елементів (сервер очікує саме такий). */
function normalizedPlots() {
    const count = (farmState && farmState.plot_count) || 25;
    const out = [];
    for (let i = 0; i < count; i++) out.push(localPlots[i] || "");
    return out;
}

async function harvestFarm() {
    try {
        const r = await API.farmHarvest();
        SOUND.harvest();

        if (r.balance) syncBalance(r.balance);
        if (r.progress) applyLevelProgress(r.progress);

        toast(t("farmHarvested") + " +" + r.coins + " " + t("coinsShort")
              + " · +" + r.xp + " XP", "success");

        localPlots = [];
        await loadFarm();
    } catch (e) {
        SOUND.error();
        toast(t("errGeneric"), "error");
    }
}

/* ── Таймер ───────────────────────────────────────────────── */

function startFarmTicker() {
    if (farmTicker) clearInterval(farmTicker);
    if (!farmState || !farmState.planted_at || farmState.ready) return;

    farmTicker = setInterval(function () {
        if (!farmState) return;
        farmState.seconds_left = Math.max(0, farmState.seconds_left - 1);

        if (farmState.seconds_left <= 0) {
            clearInterval(farmTicker);
            farmTicker = null;
            // Підтверджуємо готовність у сервера
            loadFarm();
        } else {
            renderFarmStats();
        }
    }, 1000);
}

/* ── Завантаження ─────────────────────────────────────────── */

async function loadFarm() {
    try {
        const data = await API.farmState();
        farmState = data;
        localPlots = (data.plots || []).slice();

        // Перша доступна культура обирається сама
        if (!selectedCrop) {
            const crops = data.crops || {};
            const avail = Object.keys(crops).filter(function (k) {
                return crops[k].min_level <= (data.farm_level || 1);
            });
            selectedCrop = avail[0] || null;
        }

        renderFarm();
        startFarmTicker();
    } catch (e) {
        console.warn("farm:", e.message);
    }
}

/* ── Покращення ───────────────────────────────────────────── */

function openFarmUpgrade() {
    if (!farmState || !farmState.upgrade_cost) return;

    const next = (farmState.farm_level || 1) + 1;
    const cost = farmState.upgrade_cost;

    // Яка культура відкриється
    const crops = farmState.crops || {};
    const unlocked = Object.keys(crops).find(function (k) {
        return crops[k].min_level === next;
    });

    document.getElementById("farmUpEmoji").textContent = CROP_ICON[unlocked] || "🌱";
    document.getElementById("farmUpFrom").textContent = farmState.farm_level;
    document.getElementById("farmUpTo").textContent = next;
    document.getElementById("farmUpText").textContent = t("farmUpText");
    document.getElementById("farmUpCoinsLabel").textContent = cost[0].toLocaleString("uk");
    document.getElementById("farmUpDonateLabel").textContent = cost[1].toLocaleString("uk");

    document.getElementById("farmUpBackdrop").classList.add("modal-backdrop--open");
    document.getElementById("farmUpModal").classList.add("center-modal--open");
}

function closeFarmUpgrade() {
    document.getElementById("farmUpBackdrop").classList.remove("modal-backdrop--open");
    document.getElementById("farmUpModal").classList.remove("center-modal--open");
}

async function doFarmUpgrade(currency) {
    try {
        const r = await API.farmUpgrade(currency);
        SOUND.upgrade();
        if (r.balance) syncBalance(r.balance);
        closeFarmUpgrade();
        toast(t("farmUpgraded") + " " + r.farm_level, "success");
        selectedCrop = null;
        await loadFarm();
    } catch (e) {
        SOUND.error();
        const msg = String(e.message || "");
        toast(msg.indexOf("400") !== -1 ? t("errFunds") : t("errGeneric"), "error");
    }
}

/* ── Довідка ──────────────────────────────────────────────── */

function openFarmHelp() {
    const body = document.getElementById("farmHelpBody");
    body.innerHTML = "";

    const crops = (farmState && farmState.crops) || {};
    const names = {
        carrot: t("cropCarrot"), potato: t("cropPotato"),
        beet: t("cropBeet"), cabbage: t("cropCabbage"),
    };

    Object.keys(crops).forEach(function (key) {
        const spec = crops[key];
        const row = el("div", "farm-help__row");
        row.appendChild(el("span", "farm-help__emoji", CROP_ICON[key] || "🌱"));

        const b = el("div", "farm-help__body");
        b.appendChild(el("p", "farm-help__name", names[key] || key));
        b.appendChild(el("p", "farm-help__reward",
            "+" + spec.coins + " " + t("coinsShort") + " · +" + spec.xp + " XP"));
        row.appendChild(b);

        row.appendChild(el("span", "farm-help__lvl", "Lv " + spec.min_level));
        body.appendChild(row);
    });

    body.appendChild(el("p", "farm-help__note", t("farmHelpNote")));

    document.getElementById("farmHelpBackdrop").classList.add("modal-backdrop--open");
    document.getElementById("farmHelpModal").classList.add("center-modal--open");
}

function closeFarmHelp() {
    document.getElementById("farmHelpBackdrop").classList.remove("modal-backdrop--open");
    document.getElementById("farmHelpModal").classList.remove("center-modal--open");
}

/* ── Прогрес рівня ────────────────────────────────────────── */

function applyLevelProgress(p) {
    if (!p) return;

    const numEl = document.getElementById("levelNum");
    const fill  = document.getElementById("levelFill");
    const info  = document.getElementById("levelInfo");
    const hint  = document.getElementById("levelHint");

    if (numEl) numEl.textContent = p.level;
    if (fill)  fill.style.width = p.percent + "%";

    if (info) {
        info.textContent = p.max_level
            ? p.xp.toLocaleString("uk") + " XP"
            : p.current.toLocaleString("uk") + " / " + p.needed.toLocaleString("uk") + " XP";
    }
    if (hint) {
        hint.textContent = p.max_level
            ? t("levelMax")
            : t("levelToNext").replace("{n}", p.level + 1)
                .replace("{xp}", (p.needed - p.current).toLocaleString("uk"));
    }

    // Синхронізуємо цифру рівня на головній і в профілі
    ["statLevel", "profileLevel", "profileBadge"].forEach(function (id) {
        const node = document.getElementById(id);
        if (node) node.textContent = p.level;
    });
}

async function openLevelModal() {
    document.getElementById("levelBackdrop").classList.add("modal-backdrop--open");
    document.getElementById("levelModal").classList.add("center-modal--open");
    try {
        const p = await API.myProgress();
        applyLevelProgress(p);
    } catch (e) { /* показуємо те що є */ }
}

function closeLevelModal() {
    document.getElementById("levelBackdrop").classList.remove("modal-backdrop--open");
    document.getElementById("levelModal").classList.remove("center-modal--open");
}

/* ── Ініціалізація ────────────────────────────────────────── */

function initFarm() {
    const openBtn = document.getElementById("openFarm");
    const screen  = document.getElementById("farmScreen");
    if (!openBtn || !screen) return;

    openBtn.addEventListener("click", function () {
        screen.classList.add("fullscreen--open");
        loadFarm();
    });

    const back = document.getElementById("farmBack");
    if (back) back.addEventListener("click", function () {
        screen.classList.remove("fullscreen--open");
        if (farmTicker) { clearInterval(farmTicker); farmTicker = null; }
        snapScreensToActiveTab();
    });

    // Довідка
    const help = document.getElementById("farmHelp");
    if (help) help.addEventListener("click", openFarmHelp);
    ["farmHelpClose", "farmHelpOk", "farmHelpBackdrop"].forEach(function (id) {
        const n = document.getElementById(id);
        if (n) n.addEventListener("click", closeFarmHelp);
    });

    // Покращення
    const upBtn = document.getElementById("farmUpgradeBtn");
    if (upBtn) upBtn.addEventListener("click", openFarmUpgrade);
    ["farmUpClose", "farmUpBackdrop"].forEach(function (id) {
        const n = document.getElementById(id);
        if (n) n.addEventListener("click", closeFarmUpgrade);
    });

    const upCoins = document.getElementById("farmUpCoins");
    if (upCoins) upCoins.addEventListener("click", function () { doFarmUpgrade("coins"); });
    const upDonate = document.getElementById("farmUpDonate");
    if (upDonate) upDonate.addEventListener("click", function () { doFarmUpgrade("donate"); });

    // Прогрес рівня — клік по картці рівня на головній
    const lvlCard = document.getElementById("statLevelCard");
    if (lvlCard) lvlCard.addEventListener("click", openLevelModal);
    ["levelClose", "levelBackdrop"].forEach(function (id) {
        const n = document.getElementById(id);
        if (n) n.addEventListener("click", closeLevelModal);
    });

    // Повернулись у вкладку — звіряємо стан із сервером
    document.addEventListener("visibilitychange", function () {
        if (!document.hidden && screen.classList.contains("fullscreen--open")) {
            loadFarm();
        }
    });
}
