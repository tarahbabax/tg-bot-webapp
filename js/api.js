/**
 * Обгортка над HTTP API бота.
 *
 * Кожен запит несе initData — підписаний Telegram рядок,
 * за яким сервер перевіряє, що запит справді від цього користувача.
 */

/**
 * Адреса бекенду.
 *
 * Розробка: фронтенд на GitHub Pages, сервер локально на ПК.
 *   → працює лише в Telegram Desktop (телефон не бачить localhost твого ПК)
 *
 * Хостинг: замінити на публічну адресу сервісу,
 *   напр. "https://vlkmanagebot.onrender.com"
 */
const API_URL = "http://localhost:8000";

const initData = window.Telegram.WebApp.initData || "";

async function request(path, options = {}) {
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
