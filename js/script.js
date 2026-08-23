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

function setTheme(theme) {
    document.body.dataset.theme = theme;

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
            }
            if (sw.id === "animSwitch") {
                document.body.classList.toggle("no-anim", !isOn);
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
        betNumber: "Число", betAmount: "Ставка", red: "Червоне", black: "Чорне",
        placeBet: "Зробити ставку", ok: "Добре!",
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
        betNumber: "Number", betAmount: "Bet", red: "Red", black: "Black",
        placeBet: "Place bet", ok: "Nice!",
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

initUserData();
initProfileEditors();
initTabs();
initTheme();
initSettings();
initUsersScreen();
initExpanders();
initLanguage();
initSwitchesAndToggles();

loadFromServer();

/* ---------- Roulette ---------- */

const WHEEL_ORDER = [0,32,15,19,4,21,2,25,17,34,6,27,13,36,11,30,8,23,10,5,24,16,33,1,20,14,31,9,22,18,29,7,28,12,35,3,26];
const RED_NUMBERS = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);

function numberColor(n) {
    if (n === 0) return "green";
    return RED_NUMBERS.has(n) ? "red" : "black";
}

function buildWheelGradient() {
    const segment = 360 / WHEEL_ORDER.length;
    const colours = { red: "#D6281A", black: "#17171B", green: "#1E8F52" };

    const stops = WHEEL_ORDER.map((num, i) => {
        const from = (i * segment).toFixed(3);
        const to = ((i + 1) * segment).toFixed(3);
        return `${colours[numberColor(num)]} ${from}deg ${to}deg`;
    });

    return `conic-gradient(${stops.join(", ")})`;
}

function angleForNumber(n) {
    const segment = 360 / WHEEL_ORDER.length;
    const index = WHEEL_ORDER.indexOf(n);
    return index * segment + segment / 2;
}

function initRoulette() {
    const openBtn = document.getElementById("openRoulette");
    const backBtn = document.getElementById("rouletteBack");
    const screen = document.getElementById("rouletteScreen");
    const wheel = document.getElementById("wheel");
    const ballPivot = document.getElementById("ballPivot");

    const coinsEl = document.getElementById("rouletteCoins");
    const donateEl = document.getElementById("rouletteDonate");

    const curCoinsBtn = document.getElementById("curCoins");
    const curDonateBtn = document.getElementById("curDonate");

    const numberInput = document.getElementById("betNumber");
    const amountInput = document.getElementById("betAmount");

    const colorRedBtn = document.getElementById("colorRed");
    const colorBlackBtn = document.getElementById("colorBlack");

    const spinBtn = document.getElementById("spinBtn");
    const errorEl = document.getElementById("rouletteError");

    const winBackdrop = document.getElementById("winBackdrop");
    const winModal = document.getElementById("winModal");
    const winAmount = document.getElementById("winAmount");
    const winBetInfo = document.getElementById("winBetInfo");
    const winOk = document.getElementById("winOk");

    if (!openBtn || !wheel) return;

    wheel.style.background = buildWheelGradient();

    let selectedCurrency = "coins";
    let selectedColor = null;
    let currentBallAngle = 0;
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
        screen.classList.remove("fullscreen--open");
    });

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

    function selectColor(color, btn) {
        selectedColor = selectedColor === color ? null : color;
        colorRedBtn.classList.toggle("color-btn--selected", selectedColor === "red");
        colorBlackBtn.classList.toggle("color-btn--selected", selectedColor === "black");
        if (selectedColor) numberInput.value = "";
    }

    colorRedBtn.addEventListener("click", () => selectColor("red", colorRedBtn));
    colorBlackBtn.addEventListener("click", () => selectColor("black", colorBlackBtn));

    numberInput.addEventListener("input", () => {
        if (numberInput.value !== "") {
            selectedColor = null;
            colorRedBtn.classList.remove("color-btn--selected");
            colorBlackBtn.classList.remove("color-btn--selected");
        }
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

    function spinBallTo(resultNumber) {
        return new Promise((resolve) => {
            const target = angleForNumber(resultNumber);
            const extraSpins = 5 + Math.floor(Math.random() * 3);
            const finalAngle = currentBallAngle + extraSpins * 360 + ((target - (currentBallAngle % 360) + 360) % 360);

            ballPivot.style.transition = "transform 4.2s cubic-bezier(0.11,0.71,0.16,1)";
            ballPivot.style.transform = `rotate(${finalAngle}deg)`;

            currentBallAngle = finalAngle;

            setTimeout(resolve, 4300);
        });
    }

    spinBtn.addEventListener("click", async () => {
        if (spinning) return;
        showError("");

        const amount = parseInt(amountInput.value, 10);
        const number = numberInput.value === "" ? null : parseInt(numberInput.value, 10);

        if (!amount || amount <= 0) {
            showError("Вкажи суму ставки");
            return;
        }
        if (number === null && !selectedColor) {
            showError("Обери число або колір");
            return;
        }

        const payload = {
            currency: selectedCurrency,
            bet_type: number !== null ? "number" : "color",
            amount,
        };
        if (number !== null) payload.number = number;
        if (selectedColor) payload.color = selectedColor;

        spinning = true;
        spinBtn.disabled = true;

        try {
            const data = await API.spinRoulette(payload);

            await spinBallTo(data.result_number);

            coinsEl.textContent = data.balance.coins;
            donateEl.textContent = data.balance.donate;

            // синхронізуємо і головний екран/профіль
            document.getElementById("statCoins").textContent = data.balance.coins;
            document.getElementById("statDonate").textContent = data.balance.donate;
            document.getElementById("profileCoins").textContent = data.balance.coins;
            document.getElementById("profileDonate").textContent = data.balance.donate;

            const betLabel = number !== null
                ? `Ставка: ${amount} на число ${number}`
                : `Ставка: ${amount} на ${selectedColor === "red" ? "червоне" : "чорне"}`;

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
