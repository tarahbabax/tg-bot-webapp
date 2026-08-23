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
    const tabbar = document.getElementById("tabbar");
    const items = Array.from(tabbar.querySelectorAll(".tabbar__item"));
    const totalScreens = items.length;

    items.forEach((item) => {
        item.addEventListener("click", () => {
            const index = Number(item.dataset.index);

            items.forEach((i) => i.classList.remove("tabbar__item--active"));
            item.classList.add("tabbar__item--active");

            screens.style.transform = `translateX(-${index * (100 / totalScreens)}%)`;
        });
    });
}

initUserData();
initTabs();
