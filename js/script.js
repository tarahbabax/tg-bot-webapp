const FALLBACK_EMOJI = "🙂";

function initUserData() {
    const tg = window.Telegram.WebApp;
    tg.ready();
    tg.expand();

    const user = tg.initDataUnsafe?.user;

    const tagEl = document.getElementById("userTag");
    const avatarEl = document.getElementById("avatar");
    const starEl = document.getElementById("premiumStar");
    const greetingNameEl = document.getElementById("homeGreetingName");
    const miniAvatarEl = document.getElementById("miniAvatar");

    if (!user) {
        return;
    }

    const fullName = [user.first_name, user.last_name].filter(Boolean).join(" ");

    tagEl.textContent = user.username ? "@" + user.username : "без юзертегу";
    greetingNameEl.textContent = fullName + "!";

    const settingsNameEl = document.getElementById("settingsName");
    const settingsTagEl = document.getElementById("settingsTag");
    const settingsAvatarEl = document.getElementById("settingsAvatar");

    document.getElementById("profileName").textContent = fullName;

    const level = document.getElementById("profileLevel").textContent;
    document.getElementById("profileBadge").textContent = level;
    settingsNameEl.textContent = fullName;
    settingsTagEl.textContent = tagEl.textContent;

    if (user.photo_url) {
        avatarEl.style.backgroundImage = `url(${user.photo_url})`;
        miniAvatarEl.style.backgroundImage = `url(${user.photo_url})`;
        settingsAvatarEl.style.backgroundImage = `url(${user.photo_url})`;
    } else {
        const fallback = document.createElement("div");
        fallback.className = "avatar__fallback";
        fallback.innerHTML = `<span>${FALLBACK_EMOJI}</span>`;
        avatarEl.appendChild(fallback);
    }

    if (user.photo_url) {
        document.querySelectorAll(".profile-head__avatar-wrap .avatar").forEach((el) => {
            el.style.backgroundImage = `url(${user.photo_url})`;
        });
    }

    if (user.is_premium) {
        starEl.style.display = "inline";
    }
}

let activeTabIndex = 0;

/**
 * Примусово повертає стрічку вкладок на позицію активної вкладки.
 *
 * У десктопному Telegram (інший рушій рендерингу, ніж на телефоні)
 * трапляється візуальний глюк: після закриття повноекранного вікна
 * (рулетка/налаштування/користувачі) transform стрічки лишається
 * "застряглим" між двома вкладками, і видно одразу дві напівпрозоро.
 * Викликаємо цю функцію щоразу, коли закривається такий екран —
 * навіть якщо позиція мала б бути правильною, повторне встановлення
 * того самого значення примушує браузер перерахувати кадр заново.
 */
function snapScreensToActiveTab() {
    const screens = document.getElementById("screens");
    const total = document.querySelectorAll(".tabbar__item").length;

    screens.style.transition = "none";
    // читання offsetHeight форсує reflow між вимкненням і увімкненням transition,
    // інакше браузер може "з'їсти" наступну зміну без анімації взагалі
    void screens.offsetHeight;
    screens.style.transform = `translateX(-${activeTabIndex * (100 / total)}%)`;
    void screens.offsetHeight;
    screens.style.transition = "";
}

function initTabs() {
    const screens = document.getElementById("screens");
    const items = Array.from(document.querySelectorAll(".tabbar__item"));
    const total = items.length;

    items.forEach((item) => {
        item.addEventListener("click", () => {
            const index = Number(item.dataset.index);
            activeTabIndex = index;

            items.forEach((i) => i.classList.remove("tabbar__item--active"));
            item.classList.add("tabbar__item--active");

            screens.style.transform = `translateX(-${index * (100 / total)}%)`;
        });
    });
}

const PREFS_KEY = "app_prefs";

function loadPrefs() {
    try { return JSON.parse(localStorage.getItem(PREFS_KEY) || "{}"); } catch { return {}; }
}

function savePrefs(obj) {
    const current = loadPrefs();
    localStorage.setItem(PREFS_KEY, JSON.stringify({ ...current, ...obj }));
}

function applyPrefsOnLoad() {
    const prefs = loadPrefs();
    if (prefs.theme === "light") setTheme("light");
    if (prefs.noAnim) document.body.classList.add("no-anim");
    if (prefs.noOrbs) document.body.classList.add("orbs-off");
    if (prefs.topVisibility) {
        const sel = prefs.topVisibility;
        const pub = document.getElementById("visPublic");
        const anon = document.getElementById("visAnon");
        if (pub && anon) {
            pub.classList.toggle("visibility-opt--active", sel === "public");
            anon.classList.toggle("visibility-opt--active", sel === "anon");
        }
    }
}

function setTheme(theme) {
    document.body.dataset.theme = theme;
    savePrefs({ theme });

    const themeSwitch = document.getElementById("themeSwitch");
    const isDark = theme === "dark";
    themeSwitch.classList.toggle("switch--on", isDark);
    themeSwitch.setAttribute("aria-checked", String(isDark));
}

function initTheme() {
    document.getElementById("themeToggle").addEventListener("click", () => {
        setTheme(document.body.dataset.theme === "dark" ? "light" : "dark");
    });
}

function initSettings() {
    const openBtn = document.getElementById("settingsBtn");
    const backBtn = document.getElementById("settingsBack");
    const screen = document.getElementById("settingsScreen");

    openBtn.addEventListener("click", () => screen.classList.add("fullscreen--open"));
    backBtn.addEventListener("click", () => {
        screen.classList.remove("fullscreen--open");
        collapseAll();
        snapScreensToActiveTab();
    });

    function collapseAll() {
        document.getElementById("langOptions").classList.remove("lang-options--open");
        document.getElementById("langToggle").classList.remove("setting-link--open");
        document.querySelectorAll(".panel-drop").forEach((p) => p.classList.remove("panel-drop--open"));
        document.querySelectorAll(".expander").forEach((b) => b.classList.remove("setting-link--open"));
    }
}

function initExpanders() {
    document.querySelectorAll(".expander").forEach((btn) => {
        btn.addEventListener("click", () => {
            const panel = document.getElementById(btn.dataset.expands);
            const willOpen = !panel.classList.contains("panel-drop--open");

            document.querySelectorAll(".panel-drop").forEach((p) => p.classList.remove("panel-drop--open"));
            document.querySelectorAll(".expander").forEach((b) => b.classList.remove("setting-link--open"));

            if (willOpen) {
                panel.classList.add("panel-drop--open");
                btn.classList.add("setting-link--open");
            }
        });
    });
}

function initSwitchesAndToggles() {
    document.querySelectorAll(".switch").forEach((sw) => {
        sw.addEventListener("click", () => {
            const isOn = sw.classList.toggle("switch--on");
            sw.setAttribute("aria-checked", String(isOn));

            if (sw.id === "themeSwitch") {
                setTheme(isOn ? "dark" : "light");
            }
            if (sw.id === "orbsSwitch") {
                document.body.classList.toggle("orbs-off", !isOn);
                savePrefs({ noOrbs: !isOn });
            }
            if (sw.id === "animSwitch") {
                document.body.classList.toggle("no-anim", !isOn);
                savePrefs({ noAnim: !isOn });
            }
        });
    });
}

const TRANSLATIONS = {
    uk: {
        hello: "Привіт,", level: "Рівень", coins: "Коіни", donate: "Донат-коіни",
        allQuests: "Усі квести", info: "Інформація",
        docs: "Документація", docsDesc: "Гайди, команди та інструкції", docsShort: "Гайди та команди",
        noGames: "Ігор поки немає", noGamesDesc: "Тут з'являться ігри",
        noShop: "Магазин порожній", noShopDesc: "Тут з'являться товари",
        tabHome: "Головна", tabGames: "Ігри", tabProfile: "Профіль", tabShop: "Магазин",
        settings: "Налаштування", appearance: "Вигляд",
        darkTheme: "Темна тема", darkThemeDesc: "Темне оформлення застосунку",
        animations: "Анімації", animationsDesc: "Плавні переходи між екранами",
        glow: "Фонове свічення", glowDesc: "Кольорові відблиски на фоні",
        notifications: "Сповіщення",
        newQuests: "Нові квести", newQuestsDesc: "Коли з'являється завдання",
        rewards: "Нагороди", rewardsDesc: "Коли нараховано коіни",
        news: "Новини каналу", newsDesc: "Оголошення та оновлення",
        privacy: "Приватність",
        showProfile: "Показувати профіль", showProfileDesc: "Інші бачать твій рівень",
        leaderboard: "Рейтинг", leaderboardDesc: "Брати участь у таблиці лідерів",
        lang: "Мова", langTitle: "Мова застосунку",
        other: "Інше", support: "Підтримка", supportDesc: "Написати адміністрації",
        about: "Про застосунок", version: "Версія 1.0.0",
        wheelTitle: "Колесо фортуни", wheelDesc: "Крути колесо і вигравай коіни", soon: "Незабаром",
        betAmount: "Ставка", red: "Червоне", black: "Чорне",
        payoutsTitle: "Виплати", colorGreen: "Зелене", colorWhite: "Біле",
        placeBet: "Зробити ставку", ok: "Добре!",
        filterCase: "Кейс", filterGift: "Подарунок", filterPrefix: "Префікс", allTypes: "Всі типи",
        invEmpty: "Інвентар порожній", invEmptyDesc: "Придбай предмети у магазині",
        showcaseDesc: "Вітрина видна у твоєму публічному профілі.",
        showcaseEmpty: "Вітрина порожня", showcaseEmptyDesc: "Додай предмети з інвентарю",
        addItem: "Додати скін", addItem2: "Додати предмет",
        addItemTitle: "Додавання предмету", addItemTypeDesc: "Оберіть тип предмету.",
        typeGift: "Подарунок", typeGiftDesc: "Предмет з фото та кількістю",
        typePrefix: "Префікс", typePrefixDesc: "Текстовий привілей з кольором",
        itemName: "Назва", itemDesc: "Опис", priceCoins: "Ціна (коіни)", priceDonate: "Ціна (донат)",
        stockTotal: "Кількість", uploadPhoto: "Завантажити фото", prefixText: "Текст", prefixColor: "Колір",
        addItemBtn: "Додати предмет", confirmTitle: "Підтвердити?", confirm: "Так, додати",
        buyCoins: "Купити за коіни", buyDonate: "Купити за донат", deleteItem: "Видалити з магазину", restockItem: "Додати кількість",
        tops: "Топи", topsDesc: "Рейтинги гравців",
        showcase: "Вітрина",
        tabShopStore: "Магазин", tabShopItems: "Мої предмети", tabShopTrade: "Обміни",
        shopSearch: "Пошук за назвою", shopFilter: "Тип предмета",
        shopEmpty: "Товарів поки немає", shopEmptyDesc: "Скоро тут з'являться цікаві речі",
        visibilityDesc: "Обери, як тебе бачитимуть інші у рейтингах. Налаштування зберігається і застосовується одразу.",
        visPublicTitle: "Показувати в топах", visPublicDesc: "Твій нік, рівень і монети видно всім учасникам",
        visAnonTitle: "Анонімний режим", visAnonDesc: "Ти не з'являєшся в рейтингах і топах",
        docsIntro: "Вітаємо у VLKManageBot.",
        docsNavTitle: "Навігація", docsNavText: "Внизу чотири вкладки: Головна, Ігри, Профіль, Магазин.",
        docsCoinsTitle: "Коіни", docsCoinsText: "Основна валюта каналу.",
        docsDonateTitle: "Донат-коіни", docsDonateText: "Преміум-валюта з особливим статусом.",
        docsQuestsTitle: "Квести", docsQuestsText: "Щоденні завдання за коіни.",
        docsGamesTitle: "Ігри", docsGamesText: "Колесо фортуни вже доступне.",
        docsFooter: "Залишились питання? Зв'яжись з @vlod12k.",
        admin: "Адміністрування", adminPanel: "Адмін панель",
        adminLevel: "Рівень адміністратора", adminSoon: "Функціонал у розробці",
        adminSoonDesc: "Тут з'являться інструменти керування",
        otherUsers: "Інші користувачі", usersTitle: "Користувачі", usersLoading: "Завантаження…",
        aboutMe: "Про мене", editBio: "Редагувати", bioEmpty: "Опис поки порожній",
        save: "Зберегти", cancel: "Скасувати",
        functions: "Функції", inventory: "Інвентар", commands: "Команди", emoji: "Емоджі",
        skins: "Вітрина скінів", topVisibility: "Видимість у топах", openProfile: "Відкрити профіль",
        docsLead: "Основне, що варто знати про застосунок.",
        docsStart: "Відкриває головне меню бота",
        docsQuestsKey: "Квести", docsQuests: "Виконуй завдання і отримуй коіни за кожне",
        docsLevelKey: "Рівень", docsLevel: "Росте з накопиченими коінами і відкриває нові можливості",
        docsCoinsKey: "Донат-коіни", docsCoins: "Окрема валюта для магазину, купується окремо",
        supportLead: "Щось не працює або є ідея? Напиши — розберемось.",
        supportNote: "Відповідь зазвичай протягом доби.",
        aboutLead: "VLKManageBot — застосунок-менеджер для Telegram-каналу: квести, рівні, внутрішня валюта та керування спільнотою в одному місці.",
        aboutAuthorKey: "Автор", aboutAuthor: "Владислав (@vlod12k) — ідея, дизайн і розробка",
        aboutVersionKey: "Версія", aboutStackKey: "Технології",
        q1t: "Щоденний вхід", q1d: "Заходь щодня в застосунок",
        q2t: "Напиши в чат", q2d: "Залиш повідомлення в чаті",
        q3t: "Заверши профіль", q3d: "Заповни дані профілю",
        q4t: "Запроси друга", q4d: "Поклич друга в канал",
        q5t: "Онови статус", q5d: "Онови інформацію про себе",
        q6t: "Переглянь документацію", q6d: "Ознайомся з правилами",
        q7t: "Взаємодій з ботом", q7d: "Натисни будь-яку кнопку",
        q8t: "Постав реакцію", q8d: "Постав реакцію на пост",
        q9t: "Поділись каналом", q9d: "Розкажи про канал другу"
    },
    en: {
        hello: "Hi,", level: "Level", coins: "Coins", donate: "Premium coins",
        allQuests: "All quests", info: "Information",
        docs: "Documentation", docsDesc: "Guides, commands and instructions", docsShort: "Guides and commands",
        noGames: "No games yet", noGamesDesc: "Games will appear here",
        noShop: "Shop is empty", noShopDesc: "Items will appear here",
        tabHome: "Home", tabGames: "Games", tabProfile: "Profile", tabShop: "Shop",
        settings: "Settings", appearance: "Appearance",
        darkTheme: "Dark theme", darkThemeDesc: "Dark app appearance",
        animations: "Animations", animationsDesc: "Smooth screen transitions",
        glow: "Background glow", glowDesc: "Colour highlights in the background",
        notifications: "Notifications",
        newQuests: "New quests", newQuestsDesc: "When a task appears",
        rewards: "Rewards", rewardsDesc: "When coins are credited",
        news: "Channel news", newsDesc: "Announcements and updates",
        privacy: "Privacy",
        showProfile: "Show profile", showProfileDesc: "Others can see your level",
        leaderboard: "Leaderboard", leaderboardDesc: "Take part in the rankings",
        lang: "Language", langTitle: "App language",
        other: "Other", support: "Support", supportDesc: "Contact the admins",
        about: "About the app", version: "Version 1.0.0",
        wheelTitle: "Wheel of Fortune", wheelDesc: "Spin the wheel and win coins", soon: "Coming soon",
        betAmount: "Bet", red: "Red", black: "Black",
        payoutsTitle: "Payouts", colorGreen: "Green", colorWhite: "White",
        placeBet: "Place bet", ok: "Nice!",
        filterCase: "Case", filterGift: "Gift", filterPrefix: "Prefix", allTypes: "All types",
        invEmpty: "Inventory is empty", invEmptyDesc: "Buy items in the shop",
        showcaseDesc: "Showcase is visible on your public profile.",
        showcaseEmpty: "Showcase is empty", showcaseEmptyDesc: "Add items from your inventory",
        addItem: "Add skin", addItem2: "Add item",
        addItemTitle: "Add item", addItemTypeDesc: "Choose item type.",
        typeGift: "Gift", typeGiftDesc: "Item with photo and quantity",
        typePrefix: "Prefix", typePrefixDesc: "Text privilege with color",
        itemName: "Name", itemDesc: "Description", priceCoins: "Price (coins)", priceDonate: "Price (donate)",
        stockTotal: "Quantity", uploadPhoto: "Upload photo", prefixText: "Text", prefixColor: "Color",
        addItemBtn: "Add item", confirmTitle: "Confirm?", confirm: "Yes, add",
        buyCoins: "Buy with coins", buyDonate: "Buy with donate", deleteItem: "Remove from shop", restockItem: "Add stock",
        tops: "Tops", topsDesc: "Player rankings",
        showcase: "Showcase",
        tabShopStore: "Shop", tabShopItems: "My items", tabShopTrade: "Trades",
        shopSearch: "Search by name", shopFilter: "Item type",
        shopEmpty: "No items yet", shopEmptyDesc: "Exciting things coming soon",
        visibilityDesc: "Choose how others see you in rankings.",
        visPublicTitle: "Show in rankings", visPublicDesc: "Your name, level and coins are visible to all",
        visAnonTitle: "Anonymous mode", visAnonDesc: "You don't appear in rankings or leaderboards",
        docsIntro: "Welcome to VLKManageBot.",
        docsNavTitle: "Navigation", docsNavText: "Four tabs at the bottom: Home, Games, Profile, Shop.",
        docsCoinsTitle: "Coins", docsCoinsText: "The main channel currency.",
        docsDonateTitle: "Premium coins", docsDonateText: "Premium currency with special status.",
        docsQuestsTitle: "Quests", docsQuestsText: "Daily tasks for coins.",
        docsGamesTitle: "Games", docsGamesText: "Wheel of Fortune is already available.",
        docsFooter: "Questions? Contact @vlod12k.",
        admin: "Administration", adminPanel: "Admin panel",
        adminLevel: "Admin level", adminSoon: "Coming soon",
        adminSoonDesc: "Management tools will appear here",
        otherUsers: "Other users", usersTitle: "Users", usersLoading: "Loading…",
        aboutMe: "About me", editBio: "Edit", bioEmpty: "No description yet",
        save: "Save", cancel: "Cancel",
        functions: "Functions", inventory: "Inventory", commands: "Commands", emoji: "Emoji",
        skins: "Skin showcase", topVisibility: "Leaderboard visibility", openProfile: "Open profile",
        docsLead: "The essentials worth knowing about the app.",
        docsStart: "Opens the bot's main menu",
        docsQuestsKey: "Quests", docsQuests: "Complete tasks and earn coins for each one",
        docsLevelKey: "Level", docsLevel: "Grows with the coins you collect and unlocks new features",
        docsCoinsKey: "Premium coins", docsCoins: "A separate shop currency, purchased on its own",
        supportLead: "Something broken or got an idea? Message me and we'll sort it out.",
        supportNote: "Usually answered within a day.",
        aboutLead: "VLKManageBot is a manager app for a Telegram channel: quests, levels, in-app currency and community tools in one place.",
        aboutAuthorKey: "Author", aboutAuthor: "Vladyslav (@vlod12k) — idea, design and development",
        aboutVersionKey: "Version", aboutStackKey: "Built with",
        q1t: "Daily login", q1d: "Open the app every day",
        q2t: "Write in chat", q2d: "Leave a message in the chat",
        q3t: "Complete profile", q3d: "Fill in your profile details",
        q4t: "Invite a friend", q4d: "Bring a friend to the channel",
        q5t: "Update status", q5d: "Update your info",
        q6t: "Read the docs", q6d: "Get to know the rules",
        q7t: "Interact with the bot", q7d: "Press any button",
        q8t: "Leave a reaction", q8d: "React to a post",
        q9t: "Share the channel", q9d: "Tell a friend about the channel"
    }
};

function initLanguage() {
    const toggle = document.getElementById("langToggle");
    const options = document.getElementById("langOptions");
    const current = document.getElementById("langCurrent");
    const buttons = Array.from(options.querySelectorAll(".lang-option"));

    toggle.addEventListener("click", () => {
        toggle.classList.toggle("setting-link--open");
        options.classList.toggle("lang-options--open");
    });

    function applyLanguage(lang) {
        const dict = TRANSLATIONS[lang];
        if (!dict) return;

        document.querySelectorAll("[data-i18n]").forEach((el) => {
            const value = dict[el.dataset.i18n];
            if (value) el.textContent = value;
        });

        current.textContent = lang === "uk" ? "Українська" : "English";
        document.documentElement.lang = lang;
    }

    buttons.forEach((btn) => {
        btn.addEventListener("click", () => {
            buttons.forEach((b) => b.classList.remove("lang-option--active"));
            btn.classList.add("lang-option--active");
            applyLanguage(btn.dataset.lang);
        });
    });
}

function initSwitches() {
    document.querySelectorAll(".switch:not(#themeSwitch)").forEach((sw) => {
        sw.addEventListener("click", () => {
            const isOn = sw.classList.toggle("switch--on");
            sw.setAttribute("aria-checked", String(isOn));
        });
    });
}

let serverAvailable = false;

/** Тягне дані з сервера і розкладає їх по інтерфейсу. */
async function loadFromServer() {
    try {
        const data = await API.getMe();
        serverAvailable = true;

        const u = data.user;

        document.getElementById("statLevel").textContent = u.level;
        document.getElementById("statCoins").textContent = u.coins;
        document.getElementById("statDonate").textContent = u.donate;

        document.getElementById("profileLevel").textContent = u.level;
        document.getElementById("profileBadge").textContent = u.level;
        document.getElementById("profileCoins").textContent = u.coins;
        document.getElementById("profileDonate").textContent = u.donate;
        if (document.getElementById("shopCoins")) {
            document.getElementById("shopCoins").textContent = u.coins;
            document.getElementById("shopDonate").textContent = u.donate;
        }

        const adminLevel = u.admin_level ?? 0;
        document.getElementById("adminLevel").textContent = adminLevel;
        currentAdminLevel = adminLevel;
        if (adminLevel >= 5) {
            document.getElementById("shopAdminBar").style.display = "block";
            document.getElementById("adminGroupLabel").classList.remove("admin-only");
            document.getElementById("adminGroup").classList.remove("admin-only");
        } else if (adminLevel >= 1) {
            document.getElementById("adminGroupLabel").classList.remove("admin-only");
            document.getElementById("adminGroup").classList.remove("admin-only");
        }

        // Пункт "Адмін панель" видно тільки якщо сервер підтвердив admin_level > 0.
        // Перевірка тут — лише щоб не показувати пункт меню звичайним людям;
        // сама панель поки без функціоналу, тому приховування в інтерфейсі
        // достатньо. Коли додамо дії всередині — кожен запит з неї теж
        // муситиме перевірятись на сервері окремо, бо будь-хто технічний
        // може відкрити цей екран напряму через консоль браузера.


        if (u.bio) {
            const bioText = document.getElementById("bioText");
            const bioInput = document.getElementById("bioInput");
            bioText.textContent = u.bio;
            bioText.removeAttribute("data-i18n");
            bioInput.value = u.bio;
            document.getElementById("bioCounter").textContent = `${u.bio.length}/200`;
        }
    } catch (error) {
        console.warn("Сервер недоступний, працюємо локально:", error.message);
        serverAvailable = false;
    }
}

/** Завантажує реальних користувачів бота з сервера. */
async function loadUsers() {
    const list = document.getElementById("usersList");
    const countEl = document.getElementById("usersCount");
    if (!list) return;

    const myId = window.Telegram.WebApp.initDataUnsafe?.user?.id;
    const palette = ["#6E8BFF", "#3FD9C7", "#A78BFA", "#F0B95A", "#F06478"];

    try {
        const data = await API.getUsers();

        countEl.textContent = data.total;
        list.innerHTML = "";

        if (!data.users.length) {
            list.innerHTML = '<p class="users-empty">Поки нікого немає</p>';
            return;
        }

        data.users.forEach((user, index) => {
            const name = [user.first_name, user.last_name].filter(Boolean).join(" ");
            const letter = (name || "?").charAt(0).toUpperCase();
            const colour = palette[index % palette.length];
            const isMe = user.user_id === myId;

            const row = document.createElement("div");
            row.className = "user-row" + (isMe ? " user-row--me" : "");
            row.innerHTML = `
                <span class="user-row__avatar" style="--c:${colour}">${letter}</span>
                <span class="user-row__body">
                    <span class="user-row__name">
                        ${name || "Без імені"}
                        ${isMe ? '<span class="user-row__me-badge">ти</span>' : ""}
                    </span>
                    <span class="user-row__tag">${user.username ? "@" + user.username : "—"}</span>
                </span>
                <span class="user-row__lvl">
                    <span class="user-row__lvl-value">${user.level}</span>
                    <span class="user-row__lvl-label">рів</span>
                </span>
            `;

            if (user.photo_url) {
                const avatar = row.querySelector(".user-row__avatar");
                avatar.textContent = "";
                avatar.style.backgroundImage = `url(${user.photo_url})`;
            }

            list.appendChild(row);
        });
    } catch (error) {
        console.warn("Не вдалося завантажити користувачів:", error.message);
        list.innerHTML = '<p class="users-empty">Сервер недоступний</p>';
    }
}

function initAdminPanel() {
    const openBtn = document.getElementById("adminOpen");
    const backBtn = document.getElementById("adminBack");
    const screen = document.getElementById("adminScreen");

    openBtn.addEventListener("click", () => {
        const avatarEl = document.getElementById("avatar");
        const nameEl = document.getElementById("profileName");

        document.getElementById("adminAvatar").style.backgroundImage = avatarEl.style.backgroundImage;
        document.getElementById("adminName").textContent = nameEl.textContent;

        screen.classList.add("fullscreen--open");
    });

    backBtn.addEventListener("click", () => {
        screen.classList.remove("fullscreen--open");
    });
}

function initInventory() {
    const openBtn = document.getElementById("inventoryOpen");
    const backBtn = document.getElementById("inventoryBack");
    const screen = document.getElementById("inventoryScreen");
    if (!openBtn) return;
    makeFilter("invFilterBtn", "invFilterDrop");
    openBtn.addEventListener("click", () => {
        screen.classList.add("fullscreen--open");
        loadInventoryScreen();
    });
    backBtn.addEventListener("click", () => {
        screen.classList.remove("fullscreen--open");
        snapScreensToActiveTab();
    });
}

function initShowcase() {
    const openBtn = document.getElementById("showcaseOpen");
    const backBtn = document.getElementById("showcaseBack");
    const screen = document.getElementById("showcaseScreen");
    if (!openBtn) return;
    openBtn.addEventListener("click", () => screen.classList.add("fullscreen--open"));
    backBtn.addEventListener("click", () => {
        screen.classList.remove("fullscreen--open");
        snapScreensToActiveTab();
    });
}

function makeFilter(btnId, dropId) {
    const btn = document.getElementById(btnId);
    const drop = document.getElementById(dropId);
    if (!btn || !drop) return;

    btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const isOpen = drop.classList.toggle("filter-drop--open");
        btn.classList.toggle("shop-filter--open", isOpen);
    });

    document.addEventListener("click", (e) => {
        if (!btn.contains(e.target) && !drop.contains(e.target)) {
            drop.classList.remove("filter-drop--open");
            btn.classList.remove("shop-filter--open");
        }
    });
}

function initShopFilter() {
    makeFilter("shopFilterBtn", "shopFilterDrop");
}

function initDocsScreen() {
    const openBtn = document.getElementById("docsOpen");
    const backBtn = document.getElementById("docsBack");
    const screen = document.getElementById("docsScreen");
    if (!openBtn) return;
    openBtn.addEventListener("click", () => screen.classList.add("fullscreen--open"));
    backBtn.addEventListener("click", () => {
        screen.classList.remove("fullscreen--open");
        snapScreensToActiveTab();
    });
}

function initTopVisibility() {
    const openBtn = document.getElementById("topVisibilityOpen");
    const backBtn = document.getElementById("topVisibilityBack");
    const screen = document.getElementById("topVisibilityScreen");
    const pubBtn = document.getElementById("visPublic");
    const anonBtn = document.getElementById("visAnon");
    const saveBtn = document.getElementById("visSave");
    const resultEl = document.getElementById("visResult");
    if (!openBtn) return;

    let selected = "public";

    openBtn.addEventListener("click", () => {
        screen.classList.add("fullscreen--open");
        // Скидаємо повідомлення при кожному відкритті
        document.getElementById("visResult").textContent = "";
    });
    backBtn.addEventListener("click", () => {
        screen.classList.remove("fullscreen--open");
        snapScreensToActiveTab();
    });

    function pick(val) {
        selected = val;
        pubBtn.classList.toggle("visibility-opt--active", val === "public");
        anonBtn.classList.toggle("visibility-opt--active", val === "anon");
    }

    pubBtn.addEventListener("click", () => pick("public"));
    anonBtn.addEventListener("click", () => pick("anon"));

    saveBtn.addEventListener("click", async () => {
        resultEl.textContent = "";
        savePrefs({ topVisibility: selected });
        try {
            await API.saveSettings({ top_visibility: selected });
            resultEl.textContent = "✓ Збережено";
            resultEl.style.color = "var(--teal)";
        } catch {
            resultEl.textContent = "✓ Збережено (локально)";
            resultEl.style.color = "var(--teal)";
        }
    });
}

function initShopTabs() {
    const tabs = document.querySelectorAll(".shop-tab");
    tabs.forEach((tab) => {
        tab.addEventListener("click", () => {
            tabs.forEach((t) => t.classList.remove("shop-tab--active"));
            tab.classList.add("shop-tab--active");
        });
    });
}

function initUsersScreen() {
    const openBtn = document.getElementById("usersOpen");
    const backBtn = document.getElementById("usersBack");
    const screen = document.getElementById("usersScreen");

    openBtn.addEventListener("click", () => {
        screen.classList.add("fullscreen--open");
        loadUsers();
    });

    backBtn.addEventListener("click", () => {
        screen.classList.remove("fullscreen--open");
        snapScreensToActiveTab();
    });
}

function initEditor(config) {
    const editBtn = document.getElementById(config.editBtn);
    const editor = document.getElementById(config.editor);
    const input = document.getElementById(config.input);
    const counter = document.getElementById(config.counter);
    const text = document.getElementById(config.text);
    const saveBtn = document.getElementById(config.saveBtn);
    const cancelBtn = document.getElementById(config.cancelBtn);

    function render(value) {
        if (value && value.trim()) {
            text.textContent = value;
            text.removeAttribute("data-i18n");
        } else {
            text.setAttribute("data-i18n", config.emptyKey);
            text.textContent = config.emptyText;
        }
    }

    input.addEventListener("input", () => {
        counter.textContent = `${input.value.length}/${config.max}`;
    });

    editBtn.addEventListener("click", () => {
        editor.classList.toggle("bio-editor--open");
        if (editor.classList.contains("bio-editor--open")) input.focus();
    });

    cancelBtn.addEventListener("click", () => {
        editor.classList.remove("bio-editor--open");
    });

    saveBtn.addEventListener("click", async () => {
        const value = input.value.trim();

        render(value);
        editor.classList.remove("bio-editor--open");

        try {
            await API.saveBio(value);
        } catch (error) {
            console.warn("Не вдалося зберегти на сервері:", error.message);
        }
    });
}

function initProfileEditors() {
    initEditor({
        max: 200, emptyKey: "bioEmpty", emptyText: "Опис поки порожній",
        editBtn: "bioEdit", editor: "bioEditor", input: "bioInput",
        counter: "bioCounter", text: "bioText", saveBtn: "bioSave", cancelBtn: "bioCancel"
    });
}

applyPrefsOnLoad();
initUserData();
initProfileEditors();
initTabs();
initTheme();
initSettings();
initUsersScreen();
initAdminPanel();
initInventory();
initShowcase();
initShopFilter();
initDocsScreen();
initTopVisibility();
initShopTabs();
initExpanders();
initLanguage();
initSwitchesAndToggles();

loadFromServer();

/* ---------- Roulette ---------- */

// Колесо — це просто 37 кольорових секторів, без жодної прив'язки до чисел.
// Той самий масив (літерал!) має бути в api.py — інакше кольори на екрані
// розійдуться з тим, що рахує сервер.
const SEGMENT_COLORS = ["green","red","black","red","black","red","black","red","black","white","black","red","black","red","black","red","black","red","black","red","black","red","black","red","black","red","black","white","black","red","black","red","black","red","black","red","black"];

const PAYOUTS = { green: 100, white: 10, red: 2, black: 2 };

function buildWheelGradient() {
    const segment = 360 / SEGMENT_COLORS.length;
    const shades = { red: "#D6281A", black: "#17171B", green: "#1E8F52", white: "#E8E8ED" };

    const stops = SEGMENT_COLORS.map((color, i) => {
        const from = (i * segment).toFixed(3);
        const to = ((i + 1) * segment).toFixed(3);
        return `${shades[color]} ${from}deg ${to}deg`;
    });

    return `conic-gradient(${stops.join(", ")})`;
}

function angleForSegmentIndex(index) {
    const segment = 360 / SEGMENT_COLORS.length;
    return index * segment + segment / 2;
}

function initRoulette() {
    const openBtn = document.getElementById("openRoulette");
    const backBtn = document.getElementById("rouletteBack");
    const helpBtn = document.getElementById("rouletteHelp");
    const screen = document.getElementById("rouletteScreen");
    const wheel = document.getElementById("wheel");
    const ballPivot = document.getElementById("ballPivot");

    const coinsEl = document.getElementById("rouletteCoins");
    const donateEl = document.getElementById("rouletteDonate");

    const curCoinsBtn = document.getElementById("curCoins");
    const curDonateBtn = document.getElementById("curDonate");

    const amountInput = document.getElementById("betAmount");

    const diceButtons = {
        green: document.getElementById("colorGreen"),
        white: document.getElementById("colorWhite"),
        red: document.getElementById("colorRed"),
        black: document.getElementById("colorBlack"),
    };

    const spinBtn = document.getElementById("spinBtn");
    const errorEl = document.getElementById("rouletteError");

    const winBackdrop = document.getElementById("winBackdrop");
    const winModal = document.getElementById("winModal");
    const winAmount = document.getElementById("winAmount");
    const winBetInfo = document.getElementById("winBetInfo");
    const winOk = document.getElementById("winOk");

    const helpBackdrop = document.getElementById("helpBackdrop");
    const helpModal = document.getElementById("helpModal");
    const helpOk = document.getElementById("helpOk");

    if (!openBtn || !wheel) return;

    wheel.style.background = buildWheelGradient();

    let selectedCurrency = "coins";
    let selectedColor = null;
    let currentBallAngle = 0;
    let currentWheelAngle = 0;
    let spinning = false;

    function syncBalances() {
        coinsEl.textContent = document.getElementById("statCoins").textContent;
        donateEl.textContent = document.getElementById("statDonate").textContent;
    }

    openBtn.addEventListener("click", () => {
        syncBalances();
            screen.classList.add("fullscreen--open");
    });

    backBtn.addEventListener("click", () => {
        if (spinning) return;
        screen.classList.remove("fullscreen--open");
        snapScreensToActiveTab();
    });

    helpBtn.addEventListener("click", () => {
        helpBackdrop.classList.add("modal-backdrop--open");
        helpModal.classList.add("win-modal--open");
    });

    function closeHelp() {
        helpBackdrop.classList.remove("modal-backdrop--open");
        helpModal.classList.remove("win-modal--open");
    }

    helpOk.addEventListener("click", closeHelp);
    helpBackdrop.addEventListener("click", closeHelp);

    curCoinsBtn.addEventListener("click", () => {
        selectedCurrency = "coins";
        curCoinsBtn.classList.add("currency-pill--active");
        curDonateBtn.classList.remove("currency-pill--active");
    });

    curDonateBtn.addEventListener("click", () => {
        selectedCurrency = "donate";
        curDonateBtn.classList.add("currency-pill--active");
        curCoinsBtn.classList.remove("currency-pill--active");
    });

    Object.entries(diceButtons).forEach(([color, btn]) => {
        btn.addEventListener("click", () => {
            selectedColor = selectedColor === color ? null : color;
            Object.entries(diceButtons).forEach(([c, b]) => {
                b.classList.toggle("dice-btn--selected", c === selectedColor);
            });
        });
    });

    function showError(text) {
        errorEl.textContent = text;
    }

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

    winOk.addEventListener("click", closeWinModal);
    winBackdrop.addEventListener("click", closeWinModal);

    function spinWheelAndBall(segmentIndex) {
        return new Promise((resolve) => {
            const target = angleForSegmentIndex(segmentIndex);

            // Колесо завжди прокручується на ЦІЛУ кількість повних обертів,
            // тому воно візуально крутиться, але повертається в ту саму
            // орієнтацію — розрахунок позиції кульки лишається простим і точним.
            const wheelSpins = 3 + Math.floor(Math.random() * 2);
            currentWheelAngle += wheelSpins * 360;
            wheel.style.transition = "transform 4.6s cubic-bezier(0.13,0.62,0.15,1)";
            wheel.style.transform = `rotate(${currentWheelAngle}deg)`;

            const ballSpins = 5 + Math.floor(Math.random() * 3);
            const finalBallAngle = currentBallAngle + ballSpins * 360 + ((target - (currentBallAngle % 360) + 360) % 360);
            ballPivot.style.transition = "transform 4.2s cubic-bezier(0.11,0.71,0.16,1)";
            ballPivot.style.transform = `rotate(${finalBallAngle}deg)`;
            currentBallAngle = finalBallAngle;

            setTimeout(resolve, 4700);
        });
    }

    const COLOR_LABELS = { green: "зелене", white: "біле", red: "червоне", black: "чорне" };

    spinBtn.addEventListener("click", async () => {
        if (spinning) return;
        showError("");

        const amount = parseInt(amountInput.value, 10);

        if (!amount || amount <= 0) {
            showError("Вкажи суму ставки");
            return;
        }
        if (!selectedColor) {
            showError("Обери колір");
            return;
        }

        const payload = {
            currency: selectedCurrency,
            color: selectedColor,
            amount,
        };

        spinning = true;
        spinBtn.disabled = true;

        try {
            const data = await API.spinRoulette(payload);

            await spinWheelAndBall(data.segment_index);

            coinsEl.textContent = data.balance.coins;
            donateEl.textContent = data.balance.donate;

            document.getElementById("statCoins").textContent = data.balance.coins;
            document.getElementById("statDonate").textContent = data.balance.donate;
            document.getElementById("profileCoins").textContent = data.balance.coins;
            document.getElementById("profileDonate").textContent = data.balance.donate;

            const betLabel = `Ставка: ${amount} на ${COLOR_LABELS[selectedColor]}`;
            openWinModal(data.won, data.payout, betLabel);
        } catch (error) {
            showError(error.message.includes("400") ? "Недостатньо коштів" : "Помилка з'єднання");
        } finally {
            spinning = false;
            spinBtn.disabled = false;
        }
    });
}

initRoulette();
initShop();

/* ---------- Shop ---------- */

let currentAdminLevel = 0;
let shopItems = [];
let pendingItemData = null;
let selectedItemId = null;

function renderShopItems(items) {
    const grid = document.getElementById("shopGrid");
    const empty = document.getElementById("shopEmptyState");
    if (!grid) return;

    // прибираємо старі картки (але не empty-state)
    Array.from(grid.children).forEach(c => {
        if (c.id !== 'shopEmptyState') c.remove();
    });

    if (!items.length) {
        empty.style.display = "";
        return;
    }
    empty.style.display = "none";

    items.forEach(item => {
        const el = document.createElement("div");
        const isOut = item.stock_left <= 0;
        const outBadge = isOut ? `<span class="item-out-badge">Закінчився</span>` : "";

        if (item.type === "gift") {
            el.className = "shop-item-gift" + (isOut ? " shop-item-gift--out" : "");
            el.innerHTML = `
                <div style="position:relative;">
                    ${item.photo_url
                        ? `<img class="shop-item-gift__img" src="${item.photo_url}" alt="${item.name}">`
                        : `<div class="shop-item-gift__img-placeholder"><svg viewBox="0 0 24 24" fill="none"><path d="M20 12v9H4v-9M22 7H2v5h20V7z" stroke="currentColor" stroke-width="1.5"/></svg></div>`}
                    ${outBadge}
                </div>
                <div class="shop-item-gift__body">
                    <span class="shop-item-gift__stock">залишилось: ${item.stock_left}/${item.stock_total}</span>
                    <p class="shop-item-gift__name">${item.name}</p>
                    <p class="shop-item-gift__type">Подарунок</p>
                    <p class="shop-item-gift__price">${item.price_coins} коінів</p>
                </div>`;
        } else {
            el.className = "shop-item-prefix" + (isOut ? " shop-item-prefix--out" : "");
            el.innerHTML = `
                <span class="shop-item-prefix__tag" style="color:${item.prefix_color}">${item.prefix_text}</span>
                <span class="shop-item-prefix__body">
                    <span class="shop-item-prefix__name">${item.name}</span>
                    <span class="shop-item-prefix__price">${item.price_coins} коінів</span>
                </span>
                ${outBadge}`;
        }
        el.addEventListener("click", () => openItemDetail(item));
        grid.appendChild(el);
    });
}

function openItemDetail(item) {
    // Зберігаємо весь об'єкт, а не тільки id — щоб id не загубився при закритті
    selectedItemId = item.item_id;
    const modal = document.getElementById("itemDetailModal");
    const backdrop = document.getElementById("itemDetailBackdrop");

    document.getElementById("itemDetailImg").style.display = "none";
    document.getElementById("itemDetailPrefix").style.display = "none";

    if (item.type === "gift" && item.photo_url) {
        const img = document.getElementById("itemDetailImg");
        img.src = item.photo_url;
        img.style.display = "block";
    } else if (item.type === "prefix") {
        const pre = document.getElementById("itemDetailPrefix");
        pre.textContent = item.prefix_text;
        pre.style.color = item.prefix_color;
        pre.style.display = "block";
    }

    document.getElementById("itemDetailName").textContent = item.name;
    document.getElementById("itemDetailDesc").textContent = item.description || "";
    document.getElementById("itemDetailCoins").textContent = `${item.price_coins} коінів`;
    document.getElementById("itemDetailDonate").textContent = `${item.price_donate} донат`;
    document.getElementById("itemDetailStock").textContent = `Залишилось: ${item.stock_left} з ${item.stock_total}`;

    const isOut = item.stock_left <= 0;
    const isAdmin = currentAdminLevel >= 5;

    const buyCoins = document.getElementById("buyCoinsBtn");
    const buyDonate = document.getElementById("buyDonateBtn");
    const deleteBtn = document.getElementById("deleteItemBtn");
    const restockBtn = document.getElementById("restockItemBtn");

    // Для адміна коли товар закінчився — тільки restock і delete
    if (isAdmin && isOut) {
        buyCoins.style.display = "none";
        buyDonate.style.display = "none";
        restockBtn.style.display = "block";
        deleteBtn.style.display = "block";
    } else if (isAdmin) {
        buyCoins.style.display = "block";
        buyDonate.style.display = "block";
        buyCoins.disabled = false;
        buyDonate.disabled = false;
        restockBtn.style.display = "block";
        deleteBtn.style.display = "block";
    } else {
        // Звичайний юзер — тільки купити
        buyCoins.style.display = "block";
        buyDonate.style.display = "block";
        buyCoins.disabled = isOut;
        buyDonate.disabled = isOut;
        restockBtn.style.display = "none";
        deleteBtn.style.display = "none";
    }

    modal.classList.add("item-detail-modal--open");
    backdrop.classList.add("modal-backdrop--open");
}

function closeItemDetail() {
    document.getElementById("itemDetailModal").classList.remove("item-detail-modal--open");
    document.getElementById("itemDetailBackdrop").classList.remove("modal-backdrop--open");
    // НЕ скидаємо selectedItemId тут — скидаємо лише після виконання дії
}

function openScreen(id) {
    document.getElementById(id).classList.add("fullscreen--open");
}

function closeScreen(id) {
    document.getElementById(id).classList.remove("fullscreen--open");
}

let _confirmController = null;

function openConfirm(text, onYes) {
    document.getElementById("confirmText").textContent = text;
    document.getElementById("confirmBackdrop").classList.add("modal-backdrop--open");
    document.getElementById("confirmModal").classList.add("win-modal--open");

    // Відміняємо попередній listener якщо він є
    if (_confirmController) _confirmController.abort();
    _confirmController = new AbortController();

    document.getElementById("confirmYes").addEventListener("click", () => {
        closeConfirm();
        onYes();
    }, { once: true, signal: _confirmController.signal });
}

function closeConfirm() {
    document.getElementById("confirmBackdrop").classList.remove("modal-backdrop--open");
    document.getElementById("confirmModal").classList.remove("win-modal--open");
}

async function submitItem(data, successScreenId) {
    try {
        await API.createItem(data);
        closeScreen(successScreenId);
        closeScreen("addItemTypeScreen");
        const items = await API.getShopItems();
        shopItems = items.items;
        renderShopItems(shopItems);
        syncShopBalances();
    } catch (e) {
        return e.message;
    }
    return null;
}

function syncShopBalances() {
    const coins = document.getElementById("statCoins")?.textContent || "0";
    const donate = document.getElementById("statDonate")?.textContent || "0";
    const sc = document.getElementById("shopCoins");
    const sd = document.getElementById("shopDonate");
    if (sc) sc.textContent = coins;
    if (sd) sd.textContent = donate;
}

async function loadShopItems() {
    try {
        const data = await API.getShopItems();
        shopItems = data.items;
        // Сервер підтверджує рівень адміна незалежно від client-side
        if (data.is_admin !== undefined) {
            currentAdminLevel = data.is_admin ? 5 : currentAdminLevel;
        }
        renderShopItems(shopItems);
    } catch (e) {
        console.warn("Не вдалося завантажити товари:", e.message);
    }
}

async function loadInventoryScreen() {
    // Рендерить інвентар прямо в fullscreen #inventoryScreen
    const screen = document.getElementById("inventoryScreen");
    if (!screen) return;
    let grid = screen.querySelector(".inv-screen-grid");
    if (!grid) {
        grid = document.createElement("div");
        grid.className = "inv-screen-grid shop-grid";
        screen.querySelector(".fullscreen__body").appendChild(grid);
    }
    grid.innerHTML = "<p style='grid-column:1/-1;text-align:center;color:var(--muted);padding:20px'>Завантаження...</p>";

    try {
        const data = await API.getInventory();
        grid.innerHTML = "";
        if (!data.items.length) {
            grid.innerHTML = "<div class='shop-empty'><p class='empty-state__title'>Інвентар порожній</p><p class='empty-state__text'>Придбай предмети у магазині</p></div>";
            return;
        }
        data.items.forEach(item => {
            const el = document.createElement("div");
            if (item.type === "gift") {
                el.className = "shop-item-gift";
                el.innerHTML = `
                    ${item.photo_url
                        ? `<img class="shop-item-gift__img" src="${item.photo_url}">`
                        : `<div class="shop-item-gift__img-placeholder"><svg viewBox="0 0 24 24" fill="none"><path d="M20 12v9H4v-9M22 7H2v5h20V7z" stroke="currentColor" stroke-width="1.5"/></svg></div>`}
                    <div class="shop-item-gift__body">
                        <p class="shop-item-gift__name">${item.name}</p>
                        <p class="shop-item-gift__type">Подарунок</p>
                    </div>`;
            } else {
                el.className = "shop-item-prefix";
                el.innerHTML = `
                    <span class="shop-item-prefix__tag" style="color:${item.prefix_color}">${item.prefix_text}</span>
                    <span class="shop-item-prefix__body">
                        <span class="shop-item-prefix__name">${item.name}</span>
                    </span>`;
            }
            grid.appendChild(el);
        });
    } catch (e) {
        grid.innerHTML = "<div class='shop-empty'><p class='empty-state__title'>Помилка завантаження</p></div>";
    }
}

async function loadInventory() {
    try {
        const data = await API.getInventory();
        renderInventory(data.items);
    } catch (e) {
        console.warn("Інвентар:", e.message);
    }
}

function renderInventory(items) {
    const container = document.getElementById("invContainer");
    if (!container) return;
    container.innerHTML = "";

    if (!items.length) {
        container.innerHTML = '<div class="shop-empty"><p class="empty-state__title">Інвентар порожній</p><p class="empty-state__text">Придбай предмети у магазині</p></div>';
        return;
    }

    // items є, рендеримо
    items.forEach(item => {
        const el = document.createElement("div");
        if (item.type === "gift") {
            el.className = "shop-item-gift";
            el.innerHTML = `
                ${item.photo_url
                    ? `<img class="shop-item-gift__img" src="${item.photo_url}">`
                    : `<div class="shop-item-gift__img-placeholder"><svg viewBox="0 0 24 24" fill="none"><path d="M20 12v9H4v-9M22 7H2v5h20V7z" stroke="currentColor" stroke-width="1.5"/></svg></div>`}
                <div class="shop-item-gift__body">
                    <p class="shop-item-gift__name">${item.name}</p>
                    <p class="shop-item-gift__type">Подарунок</p>
                </div>`;
        } else {
            el.className = "shop-item-prefix";
            el.innerHTML = `
                <span class="shop-item-prefix__tag" style="color:${item.prefix_color}">${item.prefix_text}</span>
                <span class="shop-item-prefix__body">
                    <span class="shop-item-prefix__name">${item.name}</span>
                </span>`;
        }
        container.appendChild(el);
    });
}

function initShop() {
    // Таби магазину
    const shopGrid = document.getElementById("shopGrid");
    const invContainer = document.createElement("div");
    invContainer.id = "invContainer";
    invContainer.className = "shop-grid inv-grid";
    invContainer.style.display = "none";
    shopGrid.parentNode.insertBefore(invContainer, shopGrid.nextSibling);

    document.querySelectorAll(".shop-tab").forEach((tab, i) => {
        tab.addEventListener("click", () => {
            document.querySelectorAll(".shop-tab").forEach(t => t.classList.remove("shop-tab--active"));
            tab.classList.add("shop-tab--active");
            if (i === 0) {
                shopGrid.style.display = "";
                invContainer.style.display = "none";
            } else if (i === 1) {
                shopGrid.style.display = "none";
                invContainer.style.display = "";
                loadInventory();
            } else {
                shopGrid.style.display = "none";
                invContainer.style.display = "none";
            }
        });
    });

    // Закрити деталь товару
    document.getElementById("itemDetailClose")?.addEventListener("click", () => {
        closeItemDetail();
        selectedItemId = null;
    });
    document.getElementById("itemDetailBackdrop")?.addEventListener("click", () => {
        closeItemDetail();
        selectedItemId = null;
    });
    document.getElementById("confirmBackdrop")?.addEventListener("click", closeConfirm);
    document.getElementById("confirmNo")?.addEventListener("click", closeConfirm);

    // Купівля — id фіксуємо в момент кліку, до закриття модалки
    async function doBuy(currency) {
        const itemId = selectedItemId;
        if (!itemId) { alert("Помилка: товар не обрано"); return; }
        try {
            const r = await API.buyItem(itemId, currency);
            closeItemDetail();
            selectedItemId = null;

            // Оновлюємо баланс скрізь
            document.getElementById("statCoins").textContent = r.balance.coins;
            document.getElementById("statDonate").textContent = r.balance.donate;
            document.getElementById("profileCoins").textContent = r.balance.coins;
            document.getElementById("profileDonate").textContent = r.balance.donate;
            syncShopBalances();

            // Оновлюємо товари в магазині
            await loadShopItems();

            // Оновлюємо інвентар (і в магазині, і у профілі)
            await loadInventory();
            await loadInventoryScreen();
        } catch (e) {
            const msg = e.message || "";
            if (msg.includes("400") || msg.includes("Недостатньо") || msg.includes("закінчився")) {
                alert("Недостатньо коштів або товар закінчився");
            } else {
                alert("Помилка покупки: " + msg);
            }
        }
    }

    document.getElementById("buyCoinsBtn")?.addEventListener("click", () => doBuy("coins"));
    document.getElementById("buyDonateBtn")?.addEventListener("click", () => doBuy("donate"));

    // Видалення — id фіксуємо ДО відкриття confirm
    document.getElementById("deleteItemBtn")?.addEventListener("click", () => {
        const itemId = selectedItemId;
        if (!itemId) return;
        openConfirm("Видалити цей предмет з магазину?\nКуплені екземпляри залишаться в інвентарях.", async () => {
            try {
                await API.deleteItem(itemId);
                closeItemDetail();
                selectedItemId = null;
                await loadShopItems();
            } catch (e) {
                alert("Помилка видалення: " + (e.message || "невідома"));
            }
        });
    });

    // Поповнення кількості — id фіксуємо ДО prompt і confirm
    document.getElementById("restockItemBtn")?.addEventListener("click", () => {
        const itemId = selectedItemId;
        if (!itemId) return;
        const raw = prompt("Скільки одиниць додати?");
        if (raw === null) return; // натиснули Скасувати
        const amount = parseInt(raw);
        if (!amount || amount <= 0) { alert("Вкажи число більше 0"); return; }
        openConfirm(`Додати ${amount} одиниць товару?`, async () => {
            try {
                await API.restockItem(itemId, amount);
                closeItemDetail();
                selectedItemId = null;
                await loadShopItems();
            } catch (e) {
                alert("Помилка поповнення: " + (e.message || "невідома"));
            }
        });
    });

    // Адмін: додати предмет
    document.getElementById("addItemBtn")?.addEventListener("click", () => openScreen("addItemTypeScreen"));
    document.getElementById("addItemTypeBack")?.addEventListener("click", () => closeScreen("addItemTypeScreen"));

    // Вибір типу
    document.getElementById("chooseGift")?.addEventListener("click", () => {
        closeScreen("addItemTypeScreen");
        openScreen("addGiftScreen");
    });
    document.getElementById("choosePrefix")?.addEventListener("click", () => {
        closeScreen("addItemTypeScreen");
        openScreen("addPrefixScreen");
    });

    // Форма подарунку — фото
    document.getElementById("giftPhotoUpload")?.addEventListener("click", () => {
        document.getElementById("giftPhotoFile").click();
    });
    document.getElementById("giftPhotoFile")?.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const url = ev.target.result;
            document.getElementById("giftPhotoPreview").src = url;
            document.getElementById("giftPhotoPreview").style.display = "block";
            document.getElementById("giftPhotoUpload").style.display = "none";
            document.getElementById("giftPhotoUrl").value = url;
        };
        reader.readAsDataURL(file);
    });

    document.getElementById("addGiftBack")?.addEventListener("click", () => {
        closeScreen("addGiftScreen");
        openScreen("addItemTypeScreen");
    });

    async function submitItemSafe(data, errorElId, screenId) {
        const err = await submitItem(data, screenId);
        if (err) {
            const msg = err.includes("409") || err.includes("вже існує")
                ? `Товар з такою назвою вже є в магазині`
                : err;
            document.getElementById(errorElId).textContent = msg;
        }
    }

    document.getElementById("giftSubmit")?.addEventListener("click", () => {
        const name = document.getElementById("giftName").value.trim();
        if (!name) { document.getElementById("giftError").textContent = "Вкажи назву"; return; }

        // Фото: або base64 з файлу, або url введений вручну
        const photoFromFile = document.getElementById("giftPhotoPreview").src;
        const photoFromUrl = document.getElementById("giftPhotoUrl").value.trim();
        const photo_url = (photoFromFile && photoFromFile !== window.location.href)
            ? photoFromFile
            : photoFromUrl;

        const data = {
            type: "gift",
            name,
            description: document.getElementById("giftDesc").value.trim(),
            photo_url,
            price_coins: parseInt(document.getElementById("giftPriceCoins").value) || 0,
            price_donate: parseInt(document.getElementById("giftPriceDonate").value) || 0,
            stock_total: parseInt(document.getElementById("giftStock").value) || 1,
        };
        pendingItemData = data;
        openConfirm(`Додати «${name}» до магазину?`, async () => {
            await submitItemSafe(pendingItemData, "giftError", "addGiftScreen");
        });
    });

    // Форма префіксу
    document.getElementById("addPrefixBack")?.addEventListener("click", () => {
        closeScreen("addPrefixScreen");
        openScreen("addItemTypeScreen");
    });

    document.getElementById("prefixText")?.addEventListener("input", (e) => {
        const t = e.target.value || "VIP";
        document.getElementById("prefixPreviewText").textContent = t;
    });

    document.getElementById("prefixColor")?.addEventListener("input", (e) => {
        const c = e.target.value;
        document.getElementById("prefixColorVal").textContent = c;
        document.getElementById("prefixPreviewText").style.color = c;
    });

    document.getElementById("prefixSubmit")?.addEventListener("click", () => {
        const name = document.getElementById("prefixName").value.trim();
        const text = document.getElementById("prefixText").value.trim();
        if (!name) { document.getElementById("prefixError").textContent = "Вкажи назву"; return; }
        if (!text) { document.getElementById("prefixError").textContent = "Вкажи текст префіксу"; return; }
        const data = {
            type: "prefix",
            name,
            description: document.getElementById("prefixDesc").value.trim(),
            photo_url: "",
            price_coins: parseInt(document.getElementById("prefixPriceCoins").value) || 0,
            price_donate: parseInt(document.getElementById("prefixPriceDonate").value) || 0,
            stock_total: parseInt(document.getElementById("prefixStock").value) || 1,
            prefix_text: text,
            prefix_color: document.getElementById("prefixColor").value,
        };
        pendingItemData = data;
        openConfirm(`Додати префікс «${text}» до магазину?`, async () => {
            await submitItemSafe(pendingItemData, "prefixError", "addPrefixScreen");
        });
    });

    loadShopItems();
}
