/**
 * user.js — ініціалізація даних користувача,
 * завантаження балансу з сервера, редагування профілю
 */

const FALLBACK_EMOJI = "🙂";
let currentAdminLevel = 0;
let currentUserId = null;

function initUserData() {
    const tg = window.Telegram?.WebApp;

    // Локальний запуск у звичайному браузері — Telegram SDK відсутній.
    // Показуємо банер і не падаємо: інтерфейс лишається придатним для верстки.
    if (!tg || !tg.initDataUnsafe?.user) {
        const banner = el("div", "dev-banner", t("devMode"));
        document.body.appendChild(banner);
        return;
    }

    tg.ready();
    tg.expand();
    const user = tg.initDataUnsafe.user;
    currentUserId = user.id;

    const fullName = [user.first_name, user.last_name].filter(Boolean).join(" ");

    // Ім'я скрізь
    ["homeGreetingName"].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.textContent = fullName + "!";
    });
    ["profileName", "settingsName", "adminName"].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.textContent = fullName;
    });

    // Юзертег скрізь
    const tag = user.username ? "@" + user.username : "без юзертегу";
    ["userTag", "settingsTag"].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.textContent = tag;
    });

    // Аватар скрізь
    if (user.photo_url) {
        ["avatar", "miniAvatar", "settingsAvatar", "adminAvatar"].forEach((id) => {
            const el = document.getElementById(id);
            if (el) el.style.backgroundImage = `url(${user.photo_url})`;
        });
    } else {
        const avatarEl = document.getElementById("avatar");
        if (avatarEl) {
            const fb = document.createElement("div");
            fb.className = "avatar__fallback";
            fb.innerHTML = `<span>${FALLBACK_EMOJI}</span>`;
            avatarEl.appendChild(fb);
        }
    }

    // Premium
    if (user.is_premium) {
        document.getElementById("premiumStar")?.style && (document.getElementById("premiumStar").style.display = "inline");
    }
}

/** Завантажити профіль з сервера і оновити баланс/рівень/bio. */
async function loadFromServer() {
    let data;
    try {
        data = await API.getMe();
    } catch (e) {
        console.warn("loadFromServer:", e.message);
        return;
    }

    const u = data.user || data;

    // Баланс і рівень
    const fields = {
        statLevel:    u.level ?? 1,
        statCoins:    u.coins ?? 0,
        statDonate:   u.donate ?? 0,
        profileCoins: u.coins ?? 0,
        profileDonate: u.donate ?? 0,
        shopCoins:    u.coins ?? 0,
        shopDonate:   u.donate ?? 0,
        rouletteCoins:  u.coins ?? 0,
        rouletteDonate: u.donate ?? 0,
        profileLevel: u.level ?? 1,
        profileBadge: u.level ?? 1,
        adminLevel:   u.admin_level ?? 0,
    };
    Object.entries(fields).forEach(([id, val]) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    });

    // Bio
    setBioText(u.bio || "");

    // Видимість у топах — з сервера, щоб UI не розходився з БД
    const serverVis = u.settings?.top_visibility;
    if (serverVis && typeof applyServerVisibility === "function") {
        applyServerVisibility(serverVis);
    }

    // Адмін-рівень
    const adminLevel = u.admin_level ?? 0;
    currentAdminLevel = adminLevel;

    if (typeof updateAdminBar === "function") updateAdminBar();
    if (adminLevel >= 1) {
        document.getElementById("adminGroupLabel")?.classList.remove("admin-only");
        document.getElementById("adminGroup")?.classList.remove("admin-only");
    }
}

/** Оновити баланс скрізь з об'єкта {coins, donate}. */
function syncBalance(balance) {
    const { coins, donate } = balance;
    [
        ["statCoins", coins], ["statDonate", donate],
        ["profileCoins", coins], ["profileDonate", donate],
        ["shopCoins", coins], ["shopDonate", donate],
        ["rouletteCoins", coins], ["rouletteDonate", donate],
    ].forEach(([id, val]) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    });
}

function initProfileEditors() {
    // ВАЖЛИВО: id кнопки в HTML — bioEdit (раніше шукали editBioBtn і нічого не працювало)
    const editBtn   = document.getElementById("bioEdit");
    const editor    = document.getElementById("bioEditor");
    const input     = document.getElementById("bioInput");
    const saveBtn   = document.getElementById("bioSave");
    const cancelBtn = document.getElementById("bioCancel");
    const bioText   = document.getElementById("bioText");
    const counter   = document.getElementById("bioCounter");

    if (!editBtn || !editor) return;

    const updateCounter = () => {
        if (counter && input) counter.textContent = `${input.value.length}/200`;
    };

    editBtn.addEventListener("click", () => {
        // Якщо стоїть заглушка «Опис поки порожній» — починаємо з чистого поля
        const current = bioText.dataset.raw || "";
        input.value = current;
        updateCounter();
        editor.classList.add("bio-editor--open");
        setTimeout(() => input.focus(), 200);
    });

    input?.addEventListener("input", updateCounter);

    cancelBtn?.addEventListener("click", () => editor.classList.remove("bio-editor--open"));

    saveBtn?.addEventListener("click", async () => {
        const bio = (input.value || "").trim();
        try {
            await API.saveBio(bio);
            setBioText(bio);
            editor.classList.remove("bio-editor--open");
            toast(t("saved"), "success");
        } catch (e) {
            toast(t("errGeneric"), "error");
        }
    });
}

/** Показує опис або заглушку, зберігаючи «сирий» текст для редактора. */
function setBioText(bio) {
    const bioText = document.getElementById("bioText");
    if (!bioText) return;
    bioText.dataset.raw = bio || "";
    if (bio) {
        bioText.textContent = bio;
        bioText.removeAttribute("data-i18n");
        bioText.classList.remove("profile-card__text--empty");
    } else {
        bioText.textContent = t("bioEmpty");
        bioText.dataset.i18n = "bioEmpty";
        bioText.classList.add("profile-card__text--empty");
    }
}

function initAdminPanel() {
    const openBtn = document.getElementById("adminOpen");
    const backBtn = document.getElementById("adminBack");
    const screen  = document.getElementById("adminScreen");
    if (!openBtn) return;

    openBtn.addEventListener("click", () => {
        // Синхронізуємо аватар/ім'я з профілю
        const avatarSrc = document.getElementById("avatar")?.style.backgroundImage;
        const adminAv   = document.getElementById("adminAvatar");
        if (adminAv && avatarSrc) adminAv.style.backgroundImage = avatarSrc;
        const nameEl    = document.getElementById("profileName");
        const adminName = document.getElementById("adminName");
        if (adminName && nameEl) adminName.textContent = nameEl.textContent;
        screen?.classList.add("fullscreen--open");
        refreshAdminStats();
    });
    backBtn?.addEventListener("click", () => {
        screen?.classList.remove("fullscreen--open");
        snapScreensToActiveTab();
    });

    // Інструменти адмін-панелі
    document.getElementById("admGoShop")?.addEventListener("click", () => {
        screen?.classList.remove("fullscreen--open");
        document.getElementById("settingsScreen")?.classList.remove("fullscreen--open");
        // Перемикаємо на вкладку "Магазин"
        document.querySelectorAll(".tabbar__item")[3]?.click();
    });

    document.getElementById("admGoUsers")?.addEventListener("click", () => {
        document.getElementById("usersScreen")?.classList.add("fullscreen--open");
        loadUsers();
    });

    document.getElementById("admRefresh")?.addEventListener("click", async () => {
        await loadFromServer();
        if (typeof loadShopItems === "function") await loadShopItems();
        await refreshAdminStats();
        toast(t("admRefreshed"), "success");
    });
}

/** Підтягує цифри для адмін-панелі з уже завантажених даних. */
async function refreshAdminStats() {
    const set = (id, val) => {
        const node = document.getElementById(id);
        if (node) node.textContent = val;
    };

    try {
        const users = await API.getUsers();
        set("adminStatUsers", (users.users || []).length);
    } catch { set("adminStatUsers", "—"); }

    try {
        const shop  = await API.getShopItems();
        const items = shop.items || [];
        set("adminStatItems", items.length);
        // Продано = скільки одиниць пішло з початкового запасу
        const sold = items.reduce((acc, i) =>
            acc + Math.max(0, (i.stock_total || 0) - (i.stock_left || 0)), 0);
        set("adminStatSold", sold);
    } catch {
        set("adminStatItems", "—");
        set("adminStatSold", "—");
    }
}

function initUsersScreen() {
    const openBtn = document.getElementById("usersOpen");
    const backBtn = document.getElementById("usersBack");
    const screen  = document.getElementById("usersScreen");
    if (!openBtn) return;

    openBtn.addEventListener("click", () => {
        screen?.classList.add("fullscreen--open");
        loadUsers();
    });
    backBtn?.addEventListener("click", () => {
        screen?.classList.remove("fullscreen--open");
        snapScreensToActiveTab();
    });
}

async function loadUsers() {
    const list = document.getElementById("usersList");
    if (!list) return;

    list.innerHTML = "";
    list.appendChild(el("p", "users-loading", t("usersLoading")));

    try {
        const data  = await API.getUsers();
        const users = data.users || [];

        // Лічильник у шапці
        const countEl = document.getElementById("usersCount");
        if (countEl) countEl.textContent = users.length;

        list.innerHTML = "";
        if (!users.length) {
            renderEmpty(list, "usersEmpty", "usersEmptyDesc");
            return;
        }

        // Свій профіль — першим і з бейджем «ТИ»
        const me = users.filter((u) => u.user_id === currentUserId);
        const rest = users.filter((u) => u.user_id !== currentUserId);

        [...me, ...rest].forEach((u) => {
            const isMe = u.user_id === currentUserId;
            const item = el("div", "user-item" + (isMe ? " user-item--me" : ""));

            const av = el("div", "user-item__avatar");
            const src = safeImageUrl(u.photo_url);
            if (src) av.style.backgroundImage = `url("${src}")`;
            item.appendChild(av);

            const body = el("div", "user-item__body");
            const name = [u.first_name, u.last_name].filter(Boolean).join(" ");
            body.appendChild(el("p", "user-item__name", name || "—"));
            body.appendChild(el("p", "user-item__tag", u.username ? "@" + u.username : ""));
            // Опис «Про мене» бачать усі
            if (u.bio) body.appendChild(el("p", "user-item__bio", u.bio));
            item.appendChild(body);

            if (isMe) item.appendChild(el("span", "user-item__me-badge", t("youBadge")));

            // Статус дружби поруч із рівнем — через спільну
            // функцію з social.js, щоб класи й ключі не розходились
            if (!isMe && typeof friendBadge === "function") {
                const badge = friendBadge(u.friend_status);
                if (badge) item.appendChild(badge);
            }

            item.appendChild(el("span", "user-item__level", "Lv " + (u.level || 1)));

            item.addEventListener("click", function () { openUserCard(u); });
            list.appendChild(item);
        });
    } catch (e) {
        renderError(list, loadUsers);
    }
}


/* ── Картка користувача ───────────────────────────────────── */

function openUserCard(u) {
    const av = document.getElementById("userCardAvatar");
    const src = safeImageUrl(u.photo_url);
    av.style.backgroundImage = src ? 'url("' + src + '")' : "";

    const name = [u.first_name, u.last_name].filter(Boolean).join(" ");
    document.getElementById("userCardName").textContent  = name || "—";
    document.getElementById("userCardLevel").textContent = u.level || 1;
    document.getElementById("userCardTag").textContent   =
        u.username ? "@" + u.username : "ID: " + (u.user_id || "—");

    // Опис показуємо лише якщо він є — інакше блок згортається
    document.getElementById("userCardBio").textContent = u.bio || "";

    // Кнопка дружби залежить від поточного статусу
    if (typeof renderFriendButton === "function") {
        renderFriendButton({
            user_id: u.user_id,
            name: name || "—",
            friend_status: u.user_id === currentUserId ? "self" : (u.friend_status || "none"),
        });
    }

    // Запам'ятовуємо для кнопки дружби
    if (typeof openedUser !== "undefined") {
        openedUser = {
            user_id: u.user_id,
            name: [u.first_name, u.last_name].filter(Boolean).join(" "),
        };
    }
    if (typeof setFriendButton === "function") {
        setFriendButton(u.friend_status || "none");
    }

    document.getElementById("userCardBackdrop").classList.add("modal-backdrop--open");
    document.getElementById("userCardModal").classList.add("center-modal--open");
}

function closeUserCard() {
    document.getElementById("userCardBackdrop").classList.remove("modal-backdrop--open");
    document.getElementById("userCardModal").classList.remove("center-modal--open");
}

function initUserCard() {
    ["userCardClose", "userCardBackdrop"].forEach(function (id) {
        const n = document.getElementById(id);
        if (n) n.addEventListener("click", closeUserCard);
    });

    const friend = document.getElementById("userCardFriend");
    if (friend) friend.addEventListener("click", function () {
        toast(t("soonFeature"), "info");
    });
}
