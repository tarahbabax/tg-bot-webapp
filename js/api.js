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
    notifications: () => request("/api/notifications"),
    notifCount:    () => request("/api/notifications/count"),
    notifRead:     () => request("/api/notifications/read", { method: "POST" }),

    friendRequest: (user_id) => request("/api/friends/request", {
        method: "POST", body: JSON.stringify({ user_id }),
    }),
    friendAccept:  (user_id) => request("/api/friends/accept", {
        method: "POST", body: JSON.stringify({ user_id }),
    }),
    friendDecline: (user_id) => request("/api/friends/decline", {
        method: "POST", body: JSON.stringify({ user_id }),
    }),
    friendRemove:  (user_id) => request("/api/friends/remove", {
        method: "POST", body: JSON.stringify({ user_id }),
    }),

    socialUnread:        () => request("/api/social/unread"),
    socialNotifications: () => request("/api/social/notifications"),
    socialRead:          () => request("/api/social/read", { method: "POST" }),
    notifClear:          () => request("/api/social/notifications/clear", { method: "POST" }),
    notifDelete: (notif_id) => request("/api/social/notifications/delete", {
        method: "POST", body: JSON.stringify({ notif_id }),
    }),
    friendRequest: (user_id) => request("/api/social/friend/request", {
        method: "POST", body: JSON.stringify({ user_id }),
    }),
    friendAccept:  (user_id) => request("/api/social/friend/accept", {
        method: "POST", body: JSON.stringify({ user_id }),
    }),
    friendDecline: (user_id) => request("/api/social/friend/decline", {
        method: "POST", body: JSON.stringify({ user_id }),
    }),
    friendRemove:  (user_id) => request("/api/social/friend/remove", {
        method: "POST", body: JSON.stringify({ user_id }),
    }),

    durakRooms:  () => request("/api/game/durak/rooms"),
    durakState:  () => request("/api/game/durak/state"),
    durakCreate: (deck_size, bet, currency, max_players) =>
        request("/api/game/durak/create", {
            method: "POST",
            body: JSON.stringify({ deck_size, bet, currency, max_players }),
        }),
    durakJoin:   (room_id) => request("/api/game/durak/join", {
        method: "POST", body: JSON.stringify({ room_id }),
    }),
    durakLeave:  () => request("/api/game/durak/leave", { method: "POST" }),
    durakStart:  () => request("/api/game/durak/start", { method: "POST" }),
    durakMove:   (action, card) => request("/api/game/durak/move", {
        method: "POST", body: JSON.stringify({ action, card }),
    }),

    slotsState: () => request("/api/game/slots"),
    slotsSpin:  (bet, currency) => request("/api/game/slots/spin", {
        method: "POST", body: JSON.stringify({ bet, currency }),
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
