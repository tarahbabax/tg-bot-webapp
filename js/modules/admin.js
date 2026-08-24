/**
 * admin.js — призначення адміністраторів, тир-лист, картка адміна.
 * Права: рівень 5 — керує; рівень 4 — лише перегляд списку.
 */

let assignUsers   = [];
let assignPicked  = null;   // обраний користувач
let assignLevel   = null;   // обраний рівень
let adminsCache   = [];
let adminsCanManage = false;
let openedAdmin   = null;

/* ── Екран призначення (макет 4) ──────────────────────────── */

function renderAssignList() {
    const box = document.getElementById("assignList");
    if (!box) return;
    box.innerHTML = "";

    if (!assignUsers.length) {
        renderEmpty(box, "noMatch", "noMatchDesc");
        return;
    }

    assignUsers.forEach(function (u) {
        const row = el("div", "pick-item" + (assignPicked && assignPicked.user_id === u.user_id ? " pick-item--active" : ""));

        const av = el("div", "pick-item__avatar");
        const src = safeImageUrl(u.photo_url);
        if (src) av.style.backgroundImage = 'url("' + src + '")';
        row.appendChild(av);

        const body = el("div", "pick-item__body");
        const name = [u.first_name, u.last_name].filter(Boolean).join(" ");
        body.appendChild(el("p", "pick-item__name", name || "—"));
        body.appendChild(el("p", "pick-item__tag", u.username ? "@" + u.username : ""));
        row.appendChild(body);

        const lvl = u.admin_level || 0;
        row.appendChild(el("span",
            "pick-item__lvl " + (lvl ? "pick-item__lvl--admin" : "pick-item__lvl--none"),
            lvl ? "Lv " + lvl : t("noAdmin")));

        row.addEventListener("click", function () {
            assignPicked = u;
            renderAssignList();
        });
        box.appendChild(row);
    });
}

async function loadAssignUsers(query) {
    const box = document.getElementById("assignList");
    if (!box) return;
    box.innerHTML = "";
    box.appendChild(el("p", "users-loading", t("usersLoading")));
    try {
        const data = await API.getAdminUsers(query || "");
        assignUsers = data.users || [];
        renderAssignList();
    } catch (e) {
        renderError(box, function () { loadAssignUsers(query); });
    }
}

function initAssignScreen() {
    const openBtn = document.getElementById("admAssign");
    if (!openBtn) return;

    openBtn.addEventListener("click", function () {
        assignPicked = null;
        assignLevel  = null;
        document.querySelectorAll(".level-btn").forEach(function (b) {
            b.classList.remove("level-btn--active");
        });
        const s = document.getElementById("assignSearch");
        if (s) s.value = "";
        openScreen("assignAdminScreen");
        loadAssignUsers("");
    });

    const back = document.getElementById("assignBack");
    if (back) back.addEventListener("click", function () { closeScreen("assignAdminScreen"); });

    // Пошук — з невеликою затримкою, щоб не смикати сервер на кожну літеру
    let searchTimer = null;
    const search = document.getElementById("assignSearch");
    if (search) search.addEventListener("input", function (e) {
        clearTimeout(searchTimer);
        const q = e.target.value;
        searchTimer = setTimeout(function () { loadAssignUsers(q); }, 300);
    });

    // Вибір рівня
    document.querySelectorAll(".level-btn").forEach(function (btn) {
        btn.addEventListener("click", function () {
            assignLevel = parseInt(btn.dataset.level, 10);
            document.querySelectorAll(".level-btn").forEach(function (b) {
                b.classList.toggle("level-btn--active", b === btn);
            });
        });
    });

    const submit = document.getElementById("assignSubmit");
    if (submit) submit.addEventListener("click", async function () {
        if (!assignPicked) { toast(t("pickUser"), "error"); return; }
        if (!assignLevel)  { toast(t("pickLevel"), "error"); return; }

        const name = [assignPicked.first_name, assignPicked.last_name].filter(Boolean).join(" ");
        const ok = await dialog({
            title: t("assignAdmin"),
            text:  name + "\n" + t("willGetLevel") + " " + assignLevel
        });
        if (!ok) return;

        try {
            await API.setAdminLevel(assignPicked.user_id, assignLevel);
            toast(t("assigned"), "success");
            assignPicked = null;
            assignLevel  = null;
            document.querySelectorAll(".level-btn").forEach(function (b) {
                b.classList.remove("level-btn--active");
            });
            await loadAssignUsers(search ? search.value : "");
        } catch (e) {
            const msg = String(e.message || "");
            toast(msg.indexOf("400") !== -1 ? t("errSelfChange") : t("errGeneric"), "error");
        }
    });
}

/* ── Тир-лист адміністраторів (макет 5) ───────────────────── */

function renderAdminsList() {
    const box = document.getElementById("adminsList");
    if (!box) return;
    box.innerHTML = "";

    if (!adminsCache.length) {
        renderEmpty(box, "noAdmins", "noAdminsDesc");
        return;
    }

    adminsCache.forEach(function (a) {
        const row = el("div", "pick-item");

        const av = el("div", "pick-item__avatar");
        const src = safeImageUrl(a.photo_url);
        if (src) av.style.backgroundImage = 'url("' + src + '")';
        row.appendChild(av);

        const body = el("div", "pick-item__body");
        const name = [a.first_name, a.last_name].filter(Boolean).join(" ");
        body.appendChild(el("p", "pick-item__name", name || "—"));
        body.appendChild(el("p", "pick-item__tag",
            a.admin_by_name ? t("assignedBy") + ": " + a.admin_by_name : "—"));
        row.appendChild(body);

        // Кружок рівня — що вищий рівень, то більший
        row.appendChild(el("span",
            "admin-row__lvl admin-row__lvl--" + (a.admin_level || 1),
            String(a.admin_level || 0)));

        // Картку відкриває лише рівень 5
        if (adminsCanManage) {
            row.style.cursor = "pointer";
            row.addEventListener("click", function () { openAdminCard(a); });
        }
        box.appendChild(row);
    });
}

async function loadAdmins() {
    const box = document.getElementById("adminsList");
    if (!box) return;
    box.innerHTML = "";
    box.appendChild(el("p", "users-loading", t("usersLoading")));
    try {
        const data = await API.getAdminList();
        adminsCache     = data.admins || [];
        adminsCanManage = !!data.can_manage;
        renderAdminsList();
    } catch (e) {
        renderError(box, loadAdmins);
    }
}

function initAdminListScreen() {
    const openBtn = document.getElementById("admListOpen");
    if (!openBtn) return;

    openBtn.addEventListener("click", function () {
        openScreen("adminListScreen");
        loadAdmins();
    });

    ["adminListBack", "adminListClose"].forEach(function (id) {
        const b = document.getElementById(id);
        if (b) b.addEventListener("click", function () { closeScreen("adminListScreen"); });
    });
}

/* ── Картка адміна (макет 6) ──────────────────────────────── */

function openAdminCard(admin) {
    openedAdmin = admin;

    const av = document.getElementById("adminCardAvatar");
    const src = safeImageUrl(admin.photo_url);
    av.style.backgroundImage = src ? 'url("' + src + '")' : "";

    const name = [admin.first_name, admin.last_name].filter(Boolean).join(" ");
    document.getElementById("adminCardName").textContent = name || "—";
    document.getElementById("adminCardTag").textContent  = admin.username ? "@" + admin.username : "";
    document.getElementById("adminCardLvl").textContent  = t("levelShort") + " " + (admin.admin_level || 0);
    document.getElementById("adminCardBy").textContent   = admin.admin_by_name || "—";

    // Межі рівня: 1 — нижче нікуди, 5 — вище нікуди
    const lvl = admin.admin_level || 0;
    const demote  = document.getElementById("adminDemote");
    const promote = document.getElementById("adminPromote");
    if (demote)  demote.disabled  = lvl <= 1;
    if (promote) promote.disabled = lvl >= 5;

    document.getElementById("adminCardModal").classList.add("item-detail-modal--open");
    document.getElementById("adminCardBackdrop").classList.add("modal-backdrop--open");
}

function closeAdminCard() {
    const m = document.getElementById("adminCardModal");
    const b = document.getElementById("adminCardBackdrop");
    if (m) m.classList.remove("item-detail-modal--open");
    if (b) b.classList.remove("modal-backdrop--open");
}

async function changeAdminLevel(newLevel, titleKey, textKey) {
    const admin = openedAdmin;
    if (!admin) return;

    const name = [admin.first_name, admin.last_name].filter(Boolean).join(" ");
    const ok = await dialog({ title: t(titleKey), text: name + "\n" + t(textKey) });
    if (!ok) return;

    try {
        await API.setAdminLevel(admin.user_id, newLevel);
        closeAdminCard();
        openedAdmin = null;
        toast(t("adminUpdated"), "success");
        await loadAdmins();
    } catch (e) {
        const msg = String(e.message || "");
        toast(msg.indexOf("400") !== -1 ? t("errSelfChange") : t("errGeneric"), "error");
    }
}

function initAdminCard() {
    const close = function () { closeAdminCard(); openedAdmin = null; };
    ["adminCardClose", "adminCardBackdrop"].forEach(function (id) {
        const n = document.getElementById(id);
        if (n) n.addEventListener("click", close);
    });

    const demote = document.getElementById("adminDemote");
    if (demote) demote.addEventListener("click", function () {
        if (!openedAdmin) return;
        changeAdminLevel((openedAdmin.admin_level || 1) - 1, "demote", "demoteText");
    });

    const promote = document.getElementById("adminPromote");
    if (promote) promote.addEventListener("click", function () {
        if (!openedAdmin) return;
        changeAdminLevel((openedAdmin.admin_level || 0) + 1, "promote", "promoteText");
    });

    const fire = document.getElementById("adminFire");
    if (fire) fire.addEventListener("click", function () {
        changeAdminLevel(0, "fireAdmin", "fireText");
    });
}

function initAdminTools() {
    initAssignScreen();
    initAdminListScreen();
    initAdminCard();
}
