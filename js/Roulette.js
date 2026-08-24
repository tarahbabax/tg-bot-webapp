/**
 * roulette.js — Колесо фортуни
 */

// Той самий масив що і в api.py → SEGMENT_COLORS
const SEGMENT_COLORS = [
    "green","red","black","red","black","red","black","red","black",
    "white","black","red","black","red","black","red","black","red",
    "black","red","black","red","black","red","black","red","black",
    "white","black","red","black","red","black","red","black","red","black"
];

const PAYOUTS = { green: 100, white: 10, red: 2, black: 2 };

const SHADE = { red: "#D6281A", black: "#17171B", green: "#1E8F52", white: "#E8E8ED" };

function buildWheelGradient() {
    const seg = 360 / SEGMENT_COLORS.length;
    const stops = SEGMENT_COLORS.map((c, i) =>
        `${SHADE[c]} ${(i * seg).toFixed(3)}deg ${((i + 1) * seg).toFixed(3)}deg`
    );
    return `conic-gradient(${stops.join(", ")})`;
}

function angleForIndex(index) {
    const seg = 360 / SEGMENT_COLORS.length;
    return index * seg + seg / 2;
}

function initRoulette() {
    const openBtn  = document.getElementById("openRoulette");
    const backBtn  = document.getElementById("rouletteBack");
    const helpBtn  = document.getElementById("rouletteHelp");
    const screen   = document.getElementById("rouletteScreen");
    const wheel    = document.getElementById("wheel");
    const ballPivot = document.getElementById("ballPivot");
    if (!openBtn || !wheel) return;

    wheel.style.background = buildWheelGradient();

    const coinsEl  = document.getElementById("rouletteCoins");
    const donateEl = document.getElementById("rouletteDonate");
    const curCoinsBtn  = document.getElementById("curCoins");
    const curDonateBtn = document.getElementById("curDonate");
    const amountInput  = document.getElementById("betAmount");
    const spinBtn      = document.getElementById("spinBtn");
    const errorEl      = document.getElementById("rouletteError");

    const winBackdrop = document.getElementById("winBackdrop");
    const winModal    = document.getElementById("winModal");
    const winAmount   = document.getElementById("winAmount");
    const winBetInfo  = document.getElementById("winBetInfo");
    const winOk       = document.getElementById("winOk");

    const helpBackdrop = document.getElementById("helpBackdrop");
    const helpModal    = document.getElementById("helpModal");
    const helpOk       = document.getElementById("helpOk");

    const diceButtons = {
        green: document.getElementById("colorGreen"),
        white: document.getElementById("colorWhite"),
        red:   document.getElementById("colorRed"),
        black: document.getElementById("colorBlack"),
    };

    let selectedCurrency  = "coins";
    let selectedColor     = null;
    let currentBallAngle  = 0;
    let currentWheelAngle = 0;
    let spinning = false;

    function syncBalances() {
        if (coinsEl)  coinsEl.textContent  = document.getElementById("statCoins")?.textContent  || "0";
        if (donateEl) donateEl.textContent = document.getElementById("statDonate")?.textContent || "0";
    }

    // Відкрити / закрити
    openBtn.addEventListener("click", () => { syncBalances(); screen.classList.add("fullscreen--open"); });
    backBtn.addEventListener("click", () => {
        if (spinning) return;
        screen.classList.remove("fullscreen--open");
        snapScreensToActiveTab();
    });

    // Довідка
    helpBtn?.addEventListener("click", () => {
        helpBackdrop.classList.add("modal-backdrop--open");
        helpModal.classList.add("win-modal--open");
    });
    function closeHelp() {
        helpBackdrop.classList.remove("modal-backdrop--open");
        helpModal.classList.remove("win-modal--open");
    }
    helpOk?.addEventListener("click", closeHelp);
    helpBackdrop?.addEventListener("click", closeHelp);

    // Валюта
    curCoinsBtn?.addEventListener("click", () => {
        selectedCurrency = "coins";
        curCoinsBtn.classList.add("currency-pill--active");
        curDonateBtn.classList.remove("currency-pill--active");
    });
    curDonateBtn?.addEventListener("click", () => {
        selectedCurrency = "donate";
        curDonateBtn.classList.add("currency-pill--active");
        curCoinsBtn.classList.remove("currency-pill--active");
    });

    // Колір
    Object.entries(diceButtons).forEach(([color, btn]) => {
        btn?.addEventListener("click", () => {
            selectedColor = selectedColor === color ? null : color;
            Object.entries(diceButtons).forEach(([c, b]) =>
                b?.classList.toggle("dice-btn--selected", c === selectedColor)
            );
        });
    });

    // Результат
    function openWinModal(won, payout, betLabel) {
        winAmount.textContent = won ? `+${payout}` : "0";
        winAmount.classList.toggle("win-modal__amount--lose", !won);
        winBetInfo.textContent = betLabel;
        winBackdrop.classList.add("modal-backdrop--open");
        winModal.classList.add("win-modal--open");
    }
    function closeWinModal() {
        winBackdrop.classList.remove("modal-backdrop--open");
        winModal.classList.remove("win-modal--open");
    }
    winOk?.addEventListener("click", closeWinModal);
    winBackdrop?.addEventListener("click", closeWinModal);

    // Анімація
    function spinWheelAndBall(segmentIndex) {
        return new Promise((resolve) => {
            const target = angleForIndex(segmentIndex);
            const wheelSpins = 3 + Math.floor(Math.random() * 2);
            currentWheelAngle += wheelSpins * 360;
            wheel.style.transition = "transform 4.6s cubic-bezier(0.13,0.62,0.15,1)";
            wheel.style.transform  = `rotate(${currentWheelAngle}deg)`;

            const ballSpins = 5 + Math.floor(Math.random() * 3);
            const finalBall = currentBallAngle + ballSpins * 360 + ((target - (currentBallAngle % 360) + 360) % 360);
            ballPivot.style.transition = "transform 4.2s cubic-bezier(0.11,0.71,0.16,1)";
            ballPivot.style.transform  = `rotate(${finalBall}deg)`;
            currentBallAngle = finalBall;

            setTimeout(resolve, 4700);
        });
    }

    const COLOR_LABELS = { green: "зелене", white: "біле", red: "червоне", black: "чорне" };

    spinBtn?.addEventListener("click", async () => {
        if (spinning) return;
        errorEl.textContent = "";

        const amount = parseInt(amountInput?.value, 10);
        if (!amount || amount <= 0) { errorEl.textContent = "Вкажи суму ставки"; return; }
        if (!selectedColor)         { errorEl.textContent = "Обери колір"; return; }

        spinning = true;
        spinBtn.disabled = true;

        try {
            const data = await API.spinRoulette({ currency: selectedCurrency, color: selectedColor, amount });
            await spinWheelAndBall(data.segment_index);
            syncBalance(data.balance);
            syncBalances();
            openWinModal(data.won, data.payout, `Ставка: ${amount} на ${COLOR_LABELS[selectedColor]}`);
        } catch (e) {
            errorEl.textContent = "Помилка з'єднання";
        } finally {
            spinning = false;
            spinBtn.disabled = false;
        }
    });
}
