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
initSwitches();
