/**
 * ui.js — єдина система повідомлень і безпечного рендеру.
 * Замінює alert() / prompt() на власні модалки в стилі застосунку.
 */

/* ── Безпека: екранування тексту ──────────────────────────── */

/** Створює елемент і безпечно вставляє текст (без innerHTML). */
function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
}

/**
 * Перевіряє URL зображення перед вставкою в src.
 * Пропускає лише http(s) та data:image — усе інше відкидаємо,
 * щоб javascript:-URL з бази не потрапив у DOM.
 */
function safeImageUrl(url) {
    if (typeof url !== "string" || !url) return "";
    const trimmed = url.trim();
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    if (/^data:image\/(png|jpe?g|gif|webp|svg\+xml);base64,/i.test(trimmed)) return trimmed;
    return "";
}

/** Перевіряє CSS-колір (#hex або назва) перед підстановкою в style. */
function safeColor(color) {
    if (typeof color !== "string") return "";
    return /^#[0-9a-f]{3,8}$/i.test(color.trim()) ? color.trim() : "";
}

/* ── Toast ────────────────────────────────────────────────── */

let toastTimer = null;

function toast(message, kind = "info") {
    let box = document.getElementById("appToast");
    if (!box) {
        box = el("div", "toast");
        box.id = "appToast";
        document.body.appendChild(box);
    }
    box.textContent = message;
    box.className = `toast toast--${kind} toast--open`;

    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => box.classList.remove("toast--open"), 2800);
}

/* ── Dialog (confirm / prompt) ────────────────────────────── */

let dialogResolve = null;

function ensureDialog() {
    let backdrop = document.getElementById("appDialogBackdrop");
    if (backdrop) return;

    backdrop = el("div", "modal-backdrop");
    backdrop.id = "appDialogBackdrop";

    const modal = el("div", "win-modal app-dialog");
    modal.id = "appDialog";

    const title = el("p", "confirm-modal__title");
    title.id = "appDialogTitle";

    const text = el("p", "confirm-modal__text");
    text.id = "appDialogText";

    const input = el("input", "field__input");
    input.id = "appDialogInput";
    input.type = "number";
    input.style.display = "none";
    input.style.marginBottom = "18px";

    // Кнопки-іконки: хрестик і галочка (макет 2)
    const actions = el("div", "dialog-icons");

    const no = el("button", "dialog-icon-btn dialog-icon-btn--no");
    no.id = "appDialogNo";
    no.type = "button";
    no.setAttribute("aria-label", "Ні");
    no.innerHTML = '<svg viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>';

    const yes = el("button", "dialog-icon-btn dialog-icon-btn--yes");
    yes.id = "appDialogYes";
    yes.type = "button";
    yes.setAttribute("aria-label", "Так");
    yes.innerHTML = '<svg viewBox="0 0 24 24" fill="none"><path d="M4.5 12.5l5 5 10-11" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';

    actions.append(no, yes);

    modal.append(title, text, input, actions);
    document.body.append(backdrop, modal);

    const close = (result) => {
        backdrop.classList.remove("modal-backdrop--open");
        modal.classList.remove("win-modal--open");
        const r = dialogResolve;
        dialogResolve = null;
        if (r) r(result);
    };

    no.addEventListener("click", () => close(null));
    backdrop.addEventListener("click", () => close(null));
    yes.addEventListener("click", () => {
        close(input.style.display === "none" ? true : input.value);
    });
}

/**
 * Показує діалог. Повертає Promise:
 *   confirm → true / null
 *   prompt  → рядок / null
 */
function dialog({ title, text = "", input = false, confirmLabel }) {
    ensureDialog();

    const backdrop = document.getElementById("appDialogBackdrop");
    const modal    = document.getElementById("appDialog");
    const inputEl  = document.getElementById("appDialogInput");

    document.getElementById("appDialogTitle").textContent = title;
    document.getElementById("appDialogText").textContent  = text;

    inputEl.style.display = input ? "block" : "none";
    inputEl.value = "";

    backdrop.classList.add("modal-backdrop--open");
    modal.classList.add("win-modal--open");
    if (input) setTimeout(() => inputEl.focus(), 250);

    return new Promise((resolve) => { dialogResolve = resolve; });
}

/* ── Error state для списків ──────────────────────────────── */

/** Вставляє в контейнер стан помилки з кнопкою повтору. */
function renderError(container, retryFn) {
    container.innerHTML = "";
    const box = el("div", "shop-empty");
    box.append(el("p", "empty-state__title", t("errLoad")));
    if (retryFn) {
        const btn = el("button", "btn btn--ghost", t("retry"));
        btn.style.marginTop = "12px";
        btn.addEventListener("click", retryFn);
        box.appendChild(btn);
    }
    container.appendChild(box);
}

/** Вставляє порожній стан. */
function renderEmpty(container, titleKey, textKey) {
    container.innerHTML = "";
    const box = el("div", "shop-empty");
    box.append(
        el("p", "empty-state__title", t(titleKey)),
        el("p", "empty-state__text",  t(textKey))
    );
    container.appendChild(box);
}

/* ── Звук ─────────────────────────────────────────────────────
   Спільний генератор для всіх ігор — щоб модулі не залежали
   один від одного і порядок підключення не мав значення.
   ──────────────────────────────────────────────────────────── */

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
