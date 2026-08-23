const FALLBACK_EMOJI = "🙂";

function initProfileScreen() {
    const tg = window.Telegram.WebApp;
    tg.ready();
    tg.expand();

    const user = tg.initDataUnsafe?.user;

    const tagEl = document.getElementById("userTag");
    const nameEl = document.getElementById("userName");
    const avatarEl = document.getElementById("avatar");
    const starEl = document.getElementById("premiumStar");

    if (!user) {
        return;
    }

    tagEl.textContent = user.username ? "@" + user.username : "без юзертегу";
    nameEl.textContent = [user.first_name, user.last_name].filter(Boolean).join(" ");

    if (user.photo_url) {
        avatarEl.style.backgroundImage = `url(${user.photo_url})`;
    } else {
        const fallback = document.createElement("div");
        fallback.className = "avatar__fallback";
        fallback.innerHTML = `<span>${FALLBACK_EMOJI}</span>`;
        avatarEl.appendChild(fallback);
    }

    if (user.is_premium) {
        starEl.style.display = "block";
        avatarEl.classList.add("avatar--premium");
    }
}

initProfileScreen();
