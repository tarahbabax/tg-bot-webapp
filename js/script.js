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

    if (user.is_premium) {
        starEl.style.display = "inline";
    }
}

function initTabs() {
    const screens = document.getElementById("screens");
    const items = Array.from(document.querySelectorAll(".tabbar__item"));
    const total = items.length;

    items.forEach((item) => {
        item.addEventListener("click", () => {
            const index = Number(item.dataset.index);

            items.forEach((i) => i.classList.remove("tabbar__item--active"));
            item.classList.add("tabbar__item--active");

            screens.style.transform = `translateX(-${index * (100 / total)}%)`;
        });
    });
}

function initTheme() {
    const toggleBtn = document.getElementById("themeToggle");
    const themeSwitch = document.getElementById("themeSwitch");

    function setTheme(theme) {
        document.body.dataset.theme = theme;

        const isDark = theme === "dark";
        themeSwitch.classList.toggle("switch--on", isDark);
        themeSwitch.setAttribute("aria-checked", String(isDark));
    }

    function toggleTheme() {
        setTheme(document.body.dataset.theme === "dark" ? "light" : "dark");
    }

    toggleBtn.addEventListener("click", toggleTheme);
    themeSwitch.addEventListener("click", toggleTheme);
}

function initSettings() {
    const openBtn = document.getElementById("settingsBtn");
    const backBtn = document.getElementById("settingsBack");
    const screen = document.getElementById("settingsScreen");

    openBtn.addEventListener("click", () => screen.classList.add("settings--open"));
    backBtn.addEventListener("click", () => screen.classList.remove("settings--open"));
}

function initOrbsSwitch() {
    const orbsSwitch = document.getElementById("orbsSwitch");

    orbsSwitch.addEventListener("click", () => {
        document.body.classList.toggle("orbs-off", !orbsSwitch.classList.contains("switch--on"));
    });
}

function initAnimSwitch() {
    const animSwitch = document.getElementById("animSwitch");

    animSwitch.addEventListener("click", () => {
        document.body.classList.toggle("no-anim", !animSwitch.classList.contains("switch--on"));
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

initUserData();
initTabs();
initTheme();
initSettings();
initOrbsSwitch();
initAnimSwitch();
initLanguage();
initSwitches();
