/**
 * Обгортка над HTTP API бота.
 *
 * Кожен запит несе initData — підписаний Telegram рядок,
 * за яким сервер перевіряє, що запит справді від цього користувача.
 */

const API_URL = "https://78.27.235.159.nip.io";

async function request(path, options = {}) {
    // Читаємо initData щоразу заново, а не один раз при завантаженні —
    // інакше якщо Telegram заповнює це поле на мить пізніше за наш скрипт,
    // усі запити до кінця сесії йдуть з порожнім значенням і сервер
    // відповідає 401 "Немає initData", хоча дані насправді вже є.
    const initData = window.Telegram.WebApp.initData || "";

    const response = await fetch(API_URL + path, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            "X-Init-Data": initData,
            ...(options.headers || {}),
        },
    });

    if (!response.ok) {
        throw new Error(`API ${path} → ${response.status}`);
    }

    return response.json();
}

const API = {
    getMe: () => request("/api/me"),

    saveBio: (bio) =>
        request("/api/me/bio", {
            method: "POST",
            body: JSON.stringify({ bio }),
        }),

    saveSettings: (settings) =>
        request("/api/me/settings", {
            method: "POST",
            body: JSON.stringify({ settings }),
        }),

    getUsers: () => request("/api/users"),

    spinRoulette: (payload) =>
        request("/api/game/roulette/spin", {
            method: "POST",
            body: JSON.stringify(payload),
        }),
};
