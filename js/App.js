/**
 * app.js — точка входу: запускає всі модулі в правильному порядку
 */

document.addEventListener("DOMContentLoaded", () => {
    // 1. Збережені налаштування (тема, анімації) — перше, щоб уникнути блимання
    applyPrefsOnLoad();

    // 2. Дані Telegram-юзера (локально, без сервера)
    initUserData();

    // 3. Переклади
    applyTranslations();

    // 4. Навігація
    initTabs();
    initSettings();
    initExpanders();
    initSwitchesAndToggles();
    initTheme();
    initLanguage();

    // 5. Профіль і адмін
    initProfileEditors();
    initAdminPanel();
    initUsersScreen();

    // 6. Магазин і всі fullscreen
    initShop();
    initDocsScreen();

    // 7. Рулетка
    initRoulette();

    // 8. Дані з сервера (баланс, рівень, admin_level)
    loadFromServer();
});
