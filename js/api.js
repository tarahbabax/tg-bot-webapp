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
    // Telegram може бути недоступний (локальний браузер) — тоді initData порожній,
    // сервер поверне 401, і UI покаже демо-стан замість падіння зі скриптовою помилкою.
    const initData = window.Telegram?.WebApp?.initData || "";

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

    getShopItems: () => request("/api/shop/items"),

    createItem: (data) => request("/api/shop/items", {
        method: "POST",
        body: JSON.stringify(data),
    }),

    deleteItem: (id) => request(`/api/shop/items/${id}`, { method: "DELETE" }),

    restockItem: (id, amount) => request(`/api/shop/items/${id}/restock`, {
        method: "POST",
        body: JSON.stringify({ amount }),
    }),

    buyItem: (item_id, currency) => request("/api/shop/buy", {
        method: "POST",
        body: JSON.stringify({ item_id, currency }),
    }),

    getInventory: () => request("/api/me/inventory"),

    sellInventoryItem: (invId) =>
        request(`/api/me/inventory/${invId}/sell`, { method: "POST" }),

    dropInventoryItem: (invId) =>
        request(`/api/me/inventory/${invId}`, { method: "DELETE" }),

    getShopVersion: () => request("/api/shop/version"),

    farmState:   () => request("/api/game/farm"),
    farmPlant:   (plots) => request("/api/game/farm/plant", {
        method: "POST", body: JSON.stringify({ plots }),
    }),
    farmHarvest: () => request("/api/game/farm/harvest", { method: "POST" }),
    farmUpgrade: (currency) => request("/api/game/farm/upgrade", {
        method: "POST", body: JSON.stringify({ currency }),
    }),
    minesState:   () => request("/api/game/mines"),
    minesStart:   (bet, currency, mines_count) => request("/api/game/mines/start", {
        method: "POST", body: JSON.stringify({ bet, currency, mines_count }),
    }),
    minesOpen:    (index) => request("/api/game/mines/open", {
        method: "POST", body: JSON.stringify({ index }),
    }),
    minesCashout: () => request("/api/game/mines/cashout", { method: "POST" }),

    myProgress:  () => request("/api/me/progress"),

    getAdminUsers: (q) => request("/api/admin/users?q=" + encodeURIComponent(q || "")),
    getAdminList:  () => request("/api/admin/list"),
    setAdminLevel: (user_id, level) => request("/api/admin/set", {
        method: "POST",
        body: JSON.stringify({ user_id, level }),
    }),

    spinRoulette: (payload) =>
        request("/api/game/roulette/spin", {
            method: "POST",
            body: JSON.stringify(payload),
        }),
};
