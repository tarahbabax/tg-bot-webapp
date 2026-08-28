/**
 * social.js — друзі та сповіщення.
 * Індикатор оновлюється частим легким запитом (лише одне число),
 * а повний список тягнеться тільки коли екран відкритий.
 */

let notifUnread   = 0;
let notifTimer    = null;
let socialRev     = null;
let friendBusy    = false;
let openedUser    = null;   // чий профіль зараз відкритий

/* ── Індикатор на дзвіночку ───────────────────────────────── */

function setNotifDot(count) {
    notifUnread = count || 0;
    const dot = document.getElementById("notifDot");
    if (dot) dot.classList.toggle("notif-dot--on", notifUnread > 0);
}

async function pollNotifications() {
    if (document.hidden) return;
    try {
        const r = await API.socialUnread();
        setNotifDot(r.unread);

        // Щось змінилось — оновлюємо відкриті екрани
        if (socialRev !== null && r.rev !== socialRev) {
            const screen = document.getElementById("notifScreen");
            if (screen && screen.classList.contains("fullscreen--open")) {
                loadNotifications();
            }
            const users = document.getElementById("usersScreen");
            if (users && users.classList.contains("fullscreen--open")) {
                loadUsers();
            }
        }
        socialRev = r.rev;
    } catch (e) { /* тихо */ }
}

function startNotifPolling() {
    if (notifTimer) clearInterval(notifTimer);
    // 4 секунди: запит віддає лише два числа, навантаження мінімальне
    notifTimer = setInterval(pollNotifications, 4000);
    pollNotifications();

    document.addEventListener("visibilitychange", function () {
        if (!document.hidden) pollNotifications();
    });
}

/* ── Список сповіщень ─────────────────────────────────────── */

function timeAgo(ts) {
    const diff = Math.floor(Date.now() / 1000) - (ts || 0);
    if (diff < 60)    return t("justNow");
    if (diff < 3600)  return Math.floor(diff / 60) + t("minShort");
    if (diff < 86400) return Math.floor(diff / 3600) + t("hourShort");
    return Math.floor(diff / 86400) + t("dayShort");
}

function buildNotifCard(n) {
    const p = n.payload || {};
    const sender = n.sender;
    const card = el("div", "notif-card" + (n.is_read ? "" : " notif-card--unread"));

    const head = el("div", "notif-card__head");

    // Аватар відправника; якщо його немає — іконка типу події
    const avatarWrap = el("div", "notif-card__avatar");
    const src = sender ? safeImageUrl(sender.photo_url) : "";

    if (src) {
        avatarWrap.style.backgroundImage = 'url("' + src + '")';
    } else {
        avatarWrap.classList.add("notif-card__avatar--icon");
        avatarWrap.innerHTML = n.kind === "friend_accepted"
            ? '<svg viewBox="0 0 24 24" fill="none"><path d="M4.5 12.5l5 5 10-11" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
            : '<svg viewBox="0 0 24 24" fill="none"><circle cx="9.5" cy="8" r="3.6" stroke="currentColor" stroke-width="1.8"/><path d="M3 19.4c1.2-3 3.5-4.6 6.5-4.6 1 0 2 .2 2.8.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M17.5 13.5v6M14.5 16.5h6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
    }

    // Маленька позначка типу події поверх аватара
    const kindDot = el("span", "notif-card__kind");
    if (n.kind === "friend_request") {
        kindDot.classList.add("notif-card__kind--request");
        kindDot.innerHTML = '<svg viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>';
        avatarWrap.appendChild(kindDot);
    } else if (n.kind === "friend_accepted") {
        kindDot.classList.add("notif-card__kind--accept");
        kindDot.innerHTML = '<svg viewBox="0 0 24 24" fill="none"><path d="M4.5 12.5l5 5 10-11" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
        avatarWrap.appendChild(kindDot);
    }

    head.appendChild(avatarWrap);

    let title = "", text = "";
    if (n.kind === "friend_request") {
        title = p.from_name || (sender ? senderName(sender) : t("someone"));
        text  = t("wantsToBeFriend");
    } else if (n.kind === "friend_accepted") {
        title = p.from_name || (sender ? senderName(sender) : t("someone"));
        text  = t("nowFriends");
    } else {
        title = t("notification");
    }

    const body = el("div", "notif-card__body");
    body.appendChild(el("p", "notif-card__title", title));
    body.appendChild(el("p", "notif-card__text", text));
    head.appendChild(body);

    head.appendChild(el("span", "notif-card__time", timeAgo(n.created_at)));
    card.appendChild(head);

    // Тап по картці відкриває профіль відправника
    if (sender) {
        head.classList.add("notif-card__head--clickable");
        head.addEventListener("click", function () {
            openUserCard({
                user_id:    sender.user_id,
                first_name: sender.first_name,
                last_name:  sender.last_name,
                username:   sender.username,
                photo_url:  sender.photo_url,
                level:      sender.level,
                bio:        sender.bio,
                friend_status: n.kind === "friend_request" ? "pending_in"
                             : n.kind === "friend_accepted" ? "friends" : "none",
            });
        });
    }

    // Заявка — кнопки одразу під нею
    if (n.kind === "friend_request" && p.from_id) {
        const actions = el("div", "notif-card__actions");

        const accept = el("button", "notif-btn notif-btn--accept", t("accept"));
        accept.type = "button";
        accept.addEventListener("click", async function (e) {
            e.stopPropagation();
            await respondFriend(p.from_id, "accept", n.notif_id);
        });

        const decline = el("button", "notif-btn notif-btn--decline", t("decline"));
        decline.type = "button";
        decline.addEventListener("click", async function (e) {
            e.stopPropagation();
            await respondFriend(p.from_id, "decline", n.notif_id);
        });

        actions.append(accept, decline);
        card.appendChild(actions);
    }

    return card;
}

function senderName(s) {
    return [s.first_name, s.last_name].filter(Boolean).join(" ") || t("someone");
}

async function loadNotifications() {
    const box = document.getElementById("notifList");
    if (!box) return;

    try {
        const r = await API.socialNotifications();
        const items = r.items || [];
        box.innerHTML = "";

        if (!items.length) {
            renderEmpty(box, "notifEmpty", "notifEmptyDesc");
            return;
        }

        const frag = document.createDocumentFragment();
        items.forEach(function (n) { frag.appendChild(buildNotifCard(n)); });
        box.appendChild(frag);
    } catch (e) {
        renderError(box, loadNotifications);
    }
}

async function respondFriend(userId, action, notifId) {
    if (friendBusy) return;
    friendBusy = true;
    try {
        if (action === "accept") {
            await API.friendAccept(userId);
            toast(t("friendAdded"), "success");
        } else {
            await API.friendDecline(userId);
            toast(t("friendDeclined"), "info");
        }
        // Заявку опрацьовано — прибираємо сповіщення
        if (notifId) await API.notifDelete(notifId);
        await loadNotifications();
        await pollNotifications();
    } catch (e) {
        toast(t("errGeneric"), "error");
    } finally {
        friendBusy = false;
    }
}

/* ── Кнопка дружби в картці ───────────────────────────────── */

const FRIEND_UI = {
    none:        { key: "addFriend",     cls: "" },
    pending_out: { key: "friendPending", cls: "user-card__friend--pending" },
    pending_in:  { key: "friendAccept",  cls: "user-card__friend--accept" },
    friends:     { key: "friendRemove",  cls: "user-card__friend--friends" },
};

function setFriendButton(status) {
    const btn = document.getElementById("userCardFriend");
    if (!btn) return;

    const ui = FRIEND_UI[status] || FRIEND_UI.none;
    btn.className = "user-card__friend " + ui.cls;
    btn.dataset.status = status;

    const label = btn.querySelector("span");
    if (label) label.textContent = t(ui.key);

    // Очікування — кнопка неактивна
    btn.disabled = status === "pending_out";
}

async function onFriendClick() {
    const btn = document.getElementById("userCardFriend");
    if (!btn || !openedUser || friendBusy) return;

    const status = btn.dataset.status || "none";
    friendBusy = true;
    btn.disabled = true;

    try {
        if (status === "none") {
            const r = await API.friendRequest(openedUser.user_id);
            setFriendButton(r.status);
            toast(r.status === "friends" ? t("friendAdded") : t("requestSent"), "success");
        } else if (status === "pending_in") {
            await API.friendAccept(openedUser.user_id);
            setFriendButton("friends");
            toast(t("friendAdded"), "success");
        } else if (status === "friends") {
            const ok = await dialog({
                title: t("friendRemove"),
                text: (openedUser.name || "") + "\\n" + t("friendRemoveText"),
            });
            if (!ok) { friendBusy = false; btn.disabled = false; return; }
            await API.friendRemove(openedUser.user_id);
            setFriendButton("none");
            toast(t("friendRemoved"), "info");
        }

        // Список користувачів має одразу показати новий статус
        const users = document.getElementById("usersScreen");
        if (users && users.classList.contains("fullscreen--open")) loadUsers();
        await pollNotifications();
    } catch (e) {
        const msg = String(e.message || "");
        toast(msg.indexOf("400") !== -1 ? t("friendFail") : t("errGeneric"), "error");
        setFriendButton(status);
    } finally {
        friendBusy = false;
        const b = document.getElementById("userCardFriend");
        if (b) b.disabled = b.dataset.status === "pending_out";
    }
}

/* ── Бейдж статусу у списку ───────────────────────────────── */

function friendBadge(status) {
    if (!status || status === "none") return null;
    const map = {
        friends:     { key: "badgeFriend",  cls: "friend-badge--friends" },
        pending_out: { key: "badgePending", cls: "friend-badge--pending" },
        pending_in:  { key: "badgeIncoming", cls: "friend-badge--incoming" },
    };
    const ui = map[status];
    if (!ui) return null;
    return el("span", "friend-badge " + ui.cls, t(ui.key));
}

/* ── Ініціалізація ────────────────────────────────────────── */

function initSocial() {
    const openBtn = document.getElementById("notifOpen");
    const screen  = document.getElementById("notifScreen");

    if (openBtn && screen) {
        openBtn.addEventListener("click", async function () {
            screen.classList.add("fullscreen--open");
            await loadNotifications();
            // Позначаємо прочитаними — індикатор гасне
            try {
                await API.socialRead();
                setNotifDot(0);
            } catch (e) { /* не критично */ }
        });

        const back = document.getElementById("notifBack");
        if (back) back.addEventListener("click", function () {
            screen.classList.remove("fullscreen--open");
            snapScreensToActiveTab();
        });

        const clear = document.getElementById("notifClear");
        if (clear) clear.addEventListener("click", async function () {
            try {
                await API.socialRead();
                setNotifDot(0);
                await loadNotifications();
            } catch (e) { /* тихо */ }
        });
    }

    const friendBtn = document.getElementById("userCardFriend");
    if (friendBtn) friendBtn.addEventListener("click", onFriendClick);

    startNotifPolling();
}
