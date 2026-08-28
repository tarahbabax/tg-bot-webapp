/**
 * tops.js — рейтинги гравців за рівнем, коінами і донатом.
 * Анонімність застосовується на сервері: сюди приходить
 * уже знеособлений запис, підмінити нічого не можна.
 */

let topsKind = "level";
let topsBusy = false;

const ANON_SVG = '<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8.5" r="3.8" stroke="currentColor" stroke-width="1.7"/><path d="M4.5 20.2c1.3-3.5 4-5.4 7.5-5.4s6.2 1.9 7.5 5.4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>';

const VALUE_ICON = {
    level:  '<svg viewBox="0 0 24 24" fill="none"><path d="M4 20.5h16M12 16.5V7M12 7L8 11M12 7l4 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    coins:  '<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="7.6" stroke="currentColor" stroke-width="2"/><path d="M12 8.2v7.6M9.8 10.2h3.4a1.7 1.7 0 010 3.4H9.8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    donate: '<svg viewBox="0 0 24 24" fill="none"><path d="M12 3.6l2.5 5.3 5.6.8-4 4 .9 5.7-5-2.7-5 2.7.9-5.7-4-4 5.6-.8L12 3.6z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
};

function topValue(entry, kind) {
    if (kind === "coins")  return entry.coins  || 0;
    if (kind === "donate") return entry.donate || 0;
    return entry.level || 1;
}

function buildTopRow(entry, kind) {
    const isMe = entry.user_id === currentUserId;
    const row = el("div", "top-row"
        + (entry.anon ? " top-row--anon" : "")
        + (isMe ? " top-row--me" : ""));

    // Місце: перші три — медалі
    if (entry.rank <= 3) {
        row.appendChild(el("span",
            "top-row__medal top-row__medal--" + entry.rank,
            String(entry.rank)));
    } else {
        row.appendChild(el("span", "top-row__rank", String(entry.rank)));
    }

    // Аватар
    const av = el("div", "top-row__avatar");
    const src = entry.anon ? "" : safeImageUrl(entry.photo_url);
    if (src) {
        av.style.backgroundImage = 'url("' + src + '")';
    } else {
        av.innerHTML = ANON_SVG;
    }
    row.appendChild(av);

    // Ім'я
    const body = el("div", "top-row__body");
    if (entry.anon) {
        body.appendChild(el("p", "top-row__name", t("anonymous")));
        body.appendChild(el("p", "top-row__tag", t("anonymousHint")));
    } else {
        const name = [entry.first_name, entry.last_name].filter(Boolean).join(" ");
        body.appendChild(el("p", "top-row__name", name || "—"));
        body.appendChild(el("p", "top-row__tag",
            entry.username ? "@" + entry.username : ""));
    }
    row.appendChild(body);

    // Значення
    const val = el("span", "top-row__value top-row__value--" + kind);
    const icon = el("span", null, null);
    icon.innerHTML = VALUE_ICON[kind] || "";
    val.appendChild(icon);
    val.appendChild(el("span", null, topValue(entry, kind).toLocaleString("uk")));
    row.appendChild(val);

    // Анонімів не відкриваємо — їхній профіль прихований навмисно
    if (!entry.anon && !isMe) {
        row.style.cursor = "pointer";
        row.addEventListener("click", function () {
            openUserCard({
                user_id:    entry.user_id,
                first_name: entry.first_name,
                last_name:  entry.last_name,
                username:   entry.username,
                photo_url:  entry.photo_url,
                level:      entry.level,
            });
        });
    }

    return row;
}

async function loadTops() {
    if (topsBusy) return;
    topsBusy = true;

    const list = document.getElementById("topsList");
    const meBox = document.getElementById("topsMe");
    if (!list) { topsBusy = false; return; }

    list.innerHTML = "";
    list.appendChild(el("p", "users-loading", t("usersLoading")));

    try {
        const data = await API.getTops(topsKind);
        const entries = data.entries || [];

        // Своє місце окремим блоком зверху
        if (meBox && data.me && data.me.rank) {
            meBox.innerHTML = "";
            meBox.appendChild(el("span", "tops-me__rank", "#" + data.me.rank));
            meBox.appendChild(el("span", "tops-me__label", t("yourPlace")));
            meBox.appendChild(el("span", "tops-me__value",
                (data.me.value || 0).toLocaleString("uk")));
        } else if (meBox) {
            meBox.innerHTML = "";
        }

        list.innerHTML = "";
        if (!entries.length) {
            renderEmpty(list, "topsEmpty", "topsEmptyDesc");
            return;
        }

        const frag = document.createDocumentFragment();
        entries.forEach(function (e) { frag.appendChild(buildTopRow(e, topsKind)); });
        list.appendChild(frag);
    } catch (e) {
        renderError(list, loadTops);
    } finally {
        topsBusy = false;
    }
}

function initTops() {
    const openBtn = document.getElementById("topsOpen");
    const screen  = document.getElementById("topsScreen");
    if (!openBtn || !screen) return;

    openBtn.addEventListener("click", function () {
        screen.classList.add("fullscreen--open");
        loadTops();
    });

    const back = document.getElementById("topsBack");
    if (back) back.addEventListener("click", function () {
        screen.classList.remove("fullscreen--open");
        snapScreensToActiveTab();
    });

    document.querySelectorAll(".tops-tab").forEach(function (tab) {
        tab.addEventListener("click", function () {
            if (topsBusy) return;
            topsKind = tab.dataset.kind || "level";
            document.querySelectorAll(".tops-tab").forEach(function (x) {
                x.classList.toggle("tops-tab--active", x === tab);
            });
            loadTops();
        });
    });
}
