/**
 * user.js — ініціалізація даних користувача,
 * завантаження балансу з сервера, редагування профілю
 */

const FALLBACK_EMOJI = "🙂";
let currentAdminLevel = 0;

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
    const bioEl = document.getElementById("bioText");
    if (bioEl) bioEl.textContent = u.bio || "";

    // Видимість у топах — з сервера, щоб UI не розходився з БД
    const serverVis = u.settings?.top_visibility;
    if (serverVis && typeof applyServerVisibility === "function") {
        applyServerVisibility(serverVis);
    }

    // Адмін-рівень
    const adminLevel = u.admin_level ?? 0;
    currentAdminLevel = adminLevel;

    if (adminLevel >= 5) {
        document.getElementById("shopAdminBar")?.style && (document.getElementById("shopAdminBar").style.display = "block");
    }
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
    // Bio editor
    const editBtn   = document.getElementById("editBioBtn");
    const editor    = document.getElementById("bioEditor");
    const input     = document.getElementById("bioInput");
    const saveBtn   = document.getElementById("bioSave");
    const cancelBtn = document.getElementById("bioCancel");
    const bioText   = document.getElementById("bioText");

    editBtn?.addEventListener("click", () => {
        if (input) input.value = bioText?.textContent || "";
        editor?.classList.add("bio-editor--open");
    });
    cancelBtn?.addEventListener("click", () => editor?.classList.remove("bio-editor--open"));
    saveBtn?.addEventListener("click", async () => {
        const bio = input?.value?.trim() ?? "";
        try {
            await API.saveBio(bio);
            if (bioText) bioText.textContent = bio;
            editor?.classList.remove("bio-editor--open");
        } catch (e) {
            alert("Помилка збереження");
        }
    });
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
    });
    backBtn?.addEventListener("click", () => {
        screen?.classList.remove("fullscreen--open");
        snapScreensToActiveTab();
    });
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

        users.forEach((u) => {
            const item = el("div", "user-item");

            const av = el("div", "user-item__avatar");
            const src = safeImageUrl(u.photo_url);
            if (src) av.style.backgroundImage = `url("${src}")`;
            item.appendChild(av);

            const body = el("div", "user-item__body");
            const name = [u.first_name, u.last_name].filter(Boolean).join(" ");
            body.appendChild(el("p", "user-item__name", name || "—"));
            body.appendChild(el("p", "user-item__tag", u.username ? "@" + u.username : ""));
            item.appendChild(body);

            item.appendChild(el("span", "user-item__level", "Lv " + (u.level || 1)));
            list.appendChild(item);
        });
    } catch (e) {
        renderError(list, loadUsers);
    }
}
