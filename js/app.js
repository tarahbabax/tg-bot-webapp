/**
 * app.js — точка входу: запускає модулі в правильному порядку.
 */

document.addEventListener("DOMContentLoaded", () => {
    // 1. Налаштування (тема/анімації) — до рендеру, щоб не блимало
    applyPrefsOnLoad();

    // 2. Telegram-дані (або dev-банер, якщо SDK недоступний)
    initUserData();

    // 3. Переклади — після того як DOM готовий
    applyTranslations();

    // 4. Навігація та налаштування
    initTabs();
    initSettings();
    initExpanders();
    initSwitchesAndToggles();
    initTheme();
    initLanguage();

    // 5. Профіль / адмін / користувачі
    initProfileEditors();
    initAdminPanel();
    initUsersScreen();
    initUserCard();

    // 6. Магазин (всередині: інвентар, вітрина, топи, форми)
    initShop();
    initAdminTools();
    initDocsScreen();

    // 7. Рулетка
    initRoulette();
    initFarm();
    initMines();
    initSlots();
    initDurak();
    initSocial();

    // 8. Дані з сервера — останнім, вже на готовий UI
    loadFromServer();
});
