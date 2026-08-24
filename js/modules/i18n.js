/**
 * i18n.js — переклади (uk / en)
 */

const TRANSLATIONS = {
    uk: {
        hello: "Привіт,", level: "Рівень", coins: "Коіни", donate: "Донат-коіни",
        allQuests: "Усі квести", info: "Інформація",
        docs: "Документація", docsDesc: "Гайди, команди та інструкції",
        tops: "Топи", topsDesc: "Рейтинги гравців",
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
        // Ігри
        wheelTitle: "Колесо фортуни", wheelDesc: "Крути колесо і вигравай коіни",
        soon: "Незабаром",
        betAmount: "Ставка", red: "Червоне", black: "Чорне",
        payoutsTitle: "Виплати", colorGreen: "Зелене", colorWhite: "Біле",
        placeBet: "Зробити ставку", ok: "Добре!",
        // Профіль
        aboutMe: "Про мене", editBio: "Редагувати", bioEmpty: "Опис поки порожній",
        save: "Зберегти", cancel: "Скасувати",
        functions: "Функції", inventory: "Інвентар", commands: "Команди",
        showcase: "Вітрина", topVisibility: "Видимість у топах",
        // Магазин
        tabShopStore: "Магазин", tabShopItems: "Мої предмети", tabShopTrade: "Обміни",
        shopSearch: "Пошук за назвою", shopFilter: "Тип предмета",
        shopEmpty: "Товарів поки немає", shopEmptyDesc: "Скоро тут з'являться цікаві речі",
        filterCase: "Кейс", filterGift: "Подарунок", filterPrefix: "Префікс", allTypes: "Всі типи",
        invEmpty: "Інвентар порожній", invEmptyDesc: "Придбай предмети у магазині",
        showcaseDesc: "Вітрина видна у твоєму публічному профілі.",
        showcaseEmpty: "Вітрина порожня", showcaseEmptyDesc: "Додай предмети з інвентарю",
        addItem: "Додати скін", addItem2: "Додати предмет",
        addItemTitle: "Додавання предмету", addItemTypeDesc: "Оберіть тип предмету.",
        typeGift: "Подарунок", typeGiftDesc: "Предмет з фото та кількістю",
        typePrefix: "Префікс", typePrefixDesc: "Текстовий привілей з кольором",
        itemName: "Назва", itemDesc: "Опис",
        priceCoins: "Ціна (коіни)", priceDonate: "Ціна (донат)",
        stockTotal: "Кількість", uploadPhoto: "Завантажити фото",
        photoUrl: "або посилання на фото",
        prefixText: "Текст", prefixColor: "Колір",
        addItemBtn: "Додати предмет",
        confirmTitle: "Підтвердити?", confirm: "Так, додати",
        buyCoins: "Купити за коіни", buyDonate: "Купити за донат",
        deleteItem: "Видалити з магазину", restockItem: "Додати кількість",
        // Видимість
        visibilityDesc: "Обери, як тебе бачитимуть інші у рейтингах.",
        visPublicTitle: "Показувати в топах", visPublicDesc: "Твій нік, рівень і монети видно всім учасникам",
        visAnonTitle: "Анонімний режим", visAnonDesc: "Ти не з'являєшся в рейтингах і топах",
        // Документація
        docsIntro: "Вітаємо у VLKManageBot — менеджері спільноти з квестами, іграми та магазином.",
        docsNavTitle: "Навігація", docsNavText: "Внизу чотири вкладки: Головна, Ігри, Профіль, Магазин.",
        docsCoinsTitle: "Коіни", docsCoinsText: "Основна валюта каналу.",
        docsDonateTitle: "Донат-коіни", docsDonateText: "Преміум-валюта для ексклюзивних товарів.",
        docsQuestsTitle: "Квести", docsQuestsText: "Щоденні завдання для заробітку коінів.",
        docsGamesTitle: "Ігри", docsGamesText: "Колесо фортуни — ставиш на колір і виграєш.",
        docsFooter: "Залишились питання? Зв'яжись з @vlod12k.",
        // Адмін
        admin: "Адміністрування", adminPanel: "Адмін панель",
        adminLevel: "Рівень адміністратора",
        adminSoon: "Функціонал у розробці", adminSoonDesc: "Тут з'являться інструменти керування",
        // Користувачі
        otherUsers: "Інші користувачі", usersTitle: "Користувачі", usersLoading: "Завантаження…",
        // Налаштування
        docsLead: "Основне, що варто знати про застосунок.",
        docsStart: "Відкриває головне меню бота",
        docsQuestsKey: "Квести", docsQuests: "Виконуй завдання і отримуй коіни за кожне",
        docsLevelKey: "Рівень", docsLevel: "Росте з накопиченими коінами",
        docsCoinsKey: "Донат-коіни", docsCoins: "Окрема валюта для магазину",
        supportLead: "Щось не працює або є ідея? Напиши — розберемось.",
        supportNote: "Відповідь зазвичай протягом доби.",
        aboutLead: "VLKManageBot — менеджер Telegram-каналу.",
        aboutAuthorKey: "Автор", aboutAuthor: "Владислав (@vlod12k) — ідея, дизайн і розробка",
        aboutVersionKey: "Версія", aboutStackKey: "Технології",
        // Квести
        q1t: "Щоденний вхід",    q1d: "Заходь щодня в застосунок",
        q2t: "Напиши в чат",     q2d: "Залиш повідомлення в чаті",
        q3t: "Заверши профіль",  q3d: "Заповни дані профілю",
        q4t: "Запроси друга",    q4d: "Поклич друга в канал",
        q5t: "Онови статус",     q5d: "Онови інформацію про себе",
        q6t: "Переглянь документацію", q6d: "Ознайомся з правилами",
        q7t: "Взаємодій з ботом", q7d: "Натисни будь-яку кнопку",
        q8t: "Постав реакцію",   q8d: "Постав реакцію на пост",
        q9t: "Поділись каналом", q9d: "Розкажи про канал другу"
    },
    en: {
        hello: "Hi,", level: "Level", coins: "Coins", donate: "Premium coins",
        allQuests: "All quests", info: "Information",
        docs: "Documentation", docsDesc: "Guides, commands and instructions",
        tops: "Tops", topsDesc: "Player rankings",
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
        leaderboard: "Leaderboard", leaderboardDesc: "Participate in the leaderboard",
        lang: "Language", langTitle: "App language",
        other: "Other", support: "Support", supportDesc: "Contact administration",
        about: "About", version: "Version 1.0.0",
        wheelTitle: "Wheel of Fortune", wheelDesc: "Spin the wheel and win coins",
        soon: "Coming soon",
        betAmount: "Bet", red: "Red", black: "Black",
        payoutsTitle: "Payouts", colorGreen: "Green", colorWhite: "White",
        placeBet: "Place bet", ok: "Nice!",
        aboutMe: "About me", editBio: "Edit", bioEmpty: "No description yet",
        save: "Save", cancel: "Cancel",
        functions: "Functions", inventory: "Inventory", commands: "Commands",
        showcase: "Showcase", topVisibility: "Top visibility",
        tabShopStore: "Shop", tabShopItems: "My items", tabShopTrade: "Trades",
        shopSearch: "Search by name", shopFilter: "Item type",
        shopEmpty: "No items yet", shopEmptyDesc: "Exciting things coming soon",
        filterCase: "Case", filterGift: "Gift", filterPrefix: "Prefix", allTypes: "All types",
        invEmpty: "Inventory is empty", invEmptyDesc: "Buy items in the shop",
        showcaseDesc: "Showcase is visible on your public profile.",
        showcaseEmpty: "Showcase is empty", showcaseEmptyDesc: "Add items from your inventory",
        addItem: "Add skin", addItem2: "Add item",
        addItemTitle: "Add item", addItemTypeDesc: "Choose item type.",
        typeGift: "Gift", typeGiftDesc: "Item with photo and quantity",
        typePrefix: "Prefix", typePrefixDesc: "Text privilege with color",
        itemName: "Name", itemDesc: "Description",
        priceCoins: "Price (coins)", priceDonate: "Price (donate)",
        stockTotal: "Quantity", uploadPhoto: "Upload photo",
        photoUrl: "or link to photo",
        prefixText: "Text", prefixColor: "Color",
        addItemBtn: "Add item",
        confirmTitle: "Confirm?", confirm: "Yes, add",
        buyCoins: "Buy with coins", buyDonate: "Buy with donate",
        deleteItem: "Remove from shop", restockItem: "Add stock",
        visibilityDesc: "Choose how others see you in rankings.",
        visPublicTitle: "Show in rankings", visPublicDesc: "Your name, level and coins are visible to all",
        visAnonTitle: "Anonymous mode", visAnonDesc: "You don't appear in rankings or leaderboards",
        docsIntro: "Welcome to VLKManageBot.",
        docsNavTitle: "Navigation", docsNavText: "Four tabs at the bottom.",
        docsCoinsTitle: "Coins", docsCoinsText: "The main channel currency.",
        docsDonateTitle: "Premium coins", docsDonateText: "Premium currency.",
        docsQuestsTitle: "Quests", docsQuestsText: "Daily tasks for coins.",
        docsGamesTitle: "Games", docsGamesText: "Wheel of Fortune is available.",
        docsFooter: "Questions? Contact @vlod12k.",
        admin: "Administration", adminPanel: "Admin panel",
        adminLevel: "Admin level",
        adminSoon: "Coming soon", adminSoonDesc: "Management tools will appear here",
        otherUsers: "Other users", usersTitle: "Users", usersLoading: "Loading…",
        docsLead: "The essentials you should know.",
        docsStart: "Opens the main bot menu",
        docsQuestsKey: "Quests", docsQuests: "Complete tasks and earn coins",
        docsLevelKey: "Level", docsLevel: "Grows with accumulated coins",
        docsCoinsKey: "Premium coins", docsCoins: "Separate shop currency",
        supportLead: "Something broken or have an idea? Write — we'll figure it out.",
        supportNote: "Response usually within a day.",
        aboutLead: "VLKManageBot — Telegram channel manager.",
        aboutAuthorKey: "Author", aboutAuthor: "Vladyslav (@vlod12k) — idea, design and development",
        aboutVersionKey: "Version", aboutStackKey: "Stack",
        q1t: "Daily login",      q1d: "Open the app every day",
        q2t: "Write in chat",    q2d: "Leave a message in chat",
        q3t: "Complete profile", q3d: "Fill in your profile data",
        q4t: "Invite a friend",  q4d: "Bring a friend to the channel",
        q5t: "Update status",    q5d: "Update your info",
        q6t: "Read the docs",    q6d: "Check out the rules",
        q7t: "Interact with bot", q7d: "Press any button",
        q8t: "React to a post",  q8d: "React to a channel post",
        q9t: "Share the channel", q9d: "Tell a friend about the channel"
    }
};

let currentLang = "uk";

function t(key) {
    return (TRANSLATIONS[currentLang] || TRANSLATIONS.uk)[key] || key;
}

function applyTranslations() {
    document.querySelectorAll("[data-i18n]").forEach((el) => {
        const key = el.dataset.i18n;
        const text = t(key);
        if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
            el.placeholder = text;
        } else {
            el.textContent = text;
        }
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
        el.placeholder = t(el.dataset.i18nPlaceholder);
    });
}

function initLanguage() {
    document.querySelectorAll(".lang-option").forEach((btn) => {
        btn.addEventListener("click", () => {
            currentLang = btn.dataset.lang || "uk";
            document.querySelectorAll(".lang-option").forEach((b) =>
                b.classList.toggle("lang-option--active", b === btn)
            );
            document.getElementById("langToggle")?.classList.remove("setting-link--open");
            document.getElementById("langOptions")?.classList.remove("lang-options--open");
            applyTranslations();
        });
    });

    document.getElementById("langToggle")?.addEventListener("click", () => {
        document.getElementById("langOptions")?.classList.toggle("lang-options--open");
        document.getElementById("langToggle")?.classList.toggle("setting-link--open");
    });
}
