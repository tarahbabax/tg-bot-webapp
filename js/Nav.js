/**
 * nav.js — навігація між вкладками + fullscreen-екрани
 */

let activeTabIndex = 0;

/** Примусово повертає стрічку на активну вкладку (фікс десктопного глюка). */
function snapScreensToActiveTab() {
    const screens = document.getElementById("screens");
    const total   = document.querySelectorAll(".tabbar__item").length;
    screens.style.transition = "none";
    void screens.offsetHeight;
    screens.style.transform = `translateX(-${activeTabIndex * (100 / total)}%)`;
    void screens.offsetHeight;
    screens.style.transition = "";
}

function initTabs() {
    const screens = document.getElementById("screens");
    const items   = Array.from(document.querySelectorAll(".tabbar__item"));
    const total   = items.length;

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

/** Відкрити повноекранний екран. */
function openScreen(id) {
    document.getElementById(id)?.classList.add("fullscreen--open");
}

/** Закрити повноекранний екран. */
function closeScreen(id) {
    document.getElementById(id)?.classList.remove("fullscreen--open");
    snapScreensToActiveTab();
}

function initSettings() {
    const openBtn  = document.getElementById("settingsBtn");
    const backBtn  = document.getElementById("settingsBack");
    const screen   = document.getElementById("settingsScreen");
    if (!openBtn) return;

    openBtn.addEventListener("click", () => screen.classList.add("fullscreen--open"));
    backBtn.addEventListener("click", () => {
        screen.classList.remove("fullscreen--open");
        // закриваємо всі expander-и
        document.querySelectorAll(".panel-drop").forEach((p) => p.classList.remove("panel-drop--open"));
        document.querySelectorAll(".expander").forEach((b) => b.classList.remove("setting-link--open"));
        document.getElementById("langOptions")?.classList.remove("lang-options--open");
        document.getElementById("langToggle")?.classList.remove("setting-link--open");
        snapScreensToActiveTab();
    });
}

function initExpanders() {
    document.querySelectorAll(".expander").forEach((btn) => {
        btn.addEventListener("click", () => {
            const panel   = document.getElementById(btn.dataset.expands);
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

/** Розкривний фільтр (тип предмета в магазині / інвентарі). */
function makeFilter(btnId, dropId) {
    const btn  = document.getElementById(btnId);
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
