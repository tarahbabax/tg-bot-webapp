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

    if (user.photo_url) {
        avatarEl.style.backgroundImage = `url(${user.photo_url})`;
        miniAvatarEl.style.backgroundImage = `url(${user.photo_url})`;
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

function initSettingsSheet() {
    const openBtn = document.getElementById("settingsBtn");
    const sheet = document.getElementById("settingsSheet");
    const backdrop = document.getElementById("settingsBackdrop");

    function open() {
        sheet.classList.add("sheet--open");
        backdrop.classList.add("sheet-backdrop--open");
    }

    function close() {
        sheet.classList.remove("sheet--open");
        backdrop.classList.remove("sheet-backdrop--open");
    }

    openBtn.addEventListener("click", open);
    backdrop.addEventListener("click", close);
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
initSettingsSheet();
initSwitches();
