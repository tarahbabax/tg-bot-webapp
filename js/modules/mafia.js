/**
 * mafia.js — гра «Мафія».
 * Стан живе на сервері; ролі інших гравців маскуються там же,
 * тому підглянути їх через мережу неможливо.
 */

const ROLE_EMOJI = {
    mafia: "🔫", sheriff: "🎖️", doctor: "💊", civilian: "👤",
};

const PHASE_EMOJI = { night: "🌙", day: "☀️", vote: "⚖️" };

let mafiaState    = null;
let mafiaTimer    = null;
let mafiaTick     = null;
let mafiaBusy     = false;
let mafiaLastHash = "";
let mafiaRoleShown = false;

let mfPlayers = 4, mfCurrency = "coins";

/* ── Звуки ────────────────────────────────────────────────── */

const MFSOUND = {
    night: function () { beep(180, 0.35, "sine", 0.05); },
    day:   function () {
        [523, 659, 784].forEach(function (f, i) {
            setTimeout(function () { beep(f, 0.14, "sine", 0.05); }, i * 90);
        });
    },
    vote:  function () { beep(420, 0.16, "triangle", 0.05); },
    pick:  function () { beep(560, 0.07, "triangle", 0.04); },
    kill:  function () { beep(120, 0.32, "sawtooth", 0.06); },
    win:   function () {
        [523, 659, 784, 1047].forEach(function (f, i) {
            setTimeout(function () { beep(f, 0.15, "sine", 0.06); }, i * 95);
        });
    },
    lose:  function () { beep(200, 0.4, "sine", 0.04); },
};

/* ── Лобі ─────────────────────────────────────────────────── */

function renderMafiaRooms(rooms) {
    const box = document.getElementById("mafiaRooms");
    if (!box) return;
    box.innerHTML = "";

    if (!rooms.length) {
        renderEmpty(box, "durakNoRooms", "durakNoRoomsDesc");
        return;
    }

    const frag = document.createDocumentFragment();
    rooms.forEach(function (r) {
        const row = el("div", "mafia-room");

        const badge = el("div", "mafia-room__badge");
        badge.innerHTML = '<svg viewBox="0 0 24 24" fill="none"><path d="M3.5 9.5h17M5 9.5l1.6-3.2A2.4 2.4 0 018.8 5h6.4a2.4 2.4 0 012.2 1.3L19 9.5" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M4 9.5h16v1.2a2 2 0 01-2 2H6a2 2 0 01-2-2V9.5z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>';
        row.appendChild(badge);

        const body = el("div", "durak-room__body");
        body.appendChild(el("p", "durak-room__host", "#" + r.room_id));
        body.appendChild(el("p", "durak-room__meta",
            r.players + "/" + r.max_players + " " + t("durakPlayersShort")));
        row.appendChild(body);

        const bet = el("div", "durak-room__bet");
        bet.appendChild(el("span", "durak-room__bet-val",
            r.bet ? r.bet.toLocaleString("uk") : t("durakFree")));
        bet.appendChild(el("span", "durak-room__slots",
            r.currency === "donate" ? t("donateShort") : t("coinsShort")));
        row.appendChild(bet);

        row.addEventListener("click", function () { joinMafia(r.room_id); });
        frag.appendChild(row);
    });
    box.appendChild(frag);
}

/* ── Очікування ───────────────────────────────────────────── */

function renderMafiaWait(s) {
    document.getElementById("mafiaWaitBet").textContent = s.bet
        ? s.bet.toLocaleString("uk") + " " +
          (s.currency === "donate" ? t("donateShort") : t("coinsShort"))
        : t("durakFree");
    document.getElementById("mafiaWaitPot").textContent = s.bet
        ? (s.bet * s.seats.length).toLocaleString("uk") : "—";
    document.getElementById("mafiaWaitNeed").textContent =
        s.seats.length + " / " + (s.min_players || 4);

    const box = document.getElementById("mafiaSeats");
    box.innerHTML = "";
    s.seats.forEach(function (p) {
        const row = el("div", "durak-seat");
        const av = el("div", "durak-seat__avatar");
        const src = safeImageUrl(p.photo);
        if (src) av.style.backgroundImage = 'url("' + src + '")';
        row.appendChild(av);
        row.appendChild(el("span", "durak-seat__name", p.name));
        if (p.user_id === s.host_id) {
            row.appendChild(el("span", "durak-seat__host", t("durakHost")));
        }
        box.appendChild(row);
    });
    for (let i = s.seats.length; i < s.max_players; i++) {
        box.appendChild(el("div", "durak-seat durak-seat--empty", t("durakEmptySeat")));
    }

    const startBtn = document.getElementById("mafiaStartBtn");
    startBtn.style.display = s.is_host ? "flex" : "none";
    startBtn.disabled = s.seats.length < (s.min_players || 4);
}

/* ── Гра ──────────────────────────────────────────────────── */

function fmtTime(sec) {
    const s = Math.max(0, Math.floor(sec));
    return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
}

function renderMafiaGame(s) {
    const g = s.game;
    if (!g) return;

    // Фаза
    const phaseBox = document.getElementById("mafiaPhase");
    phaseBox.className = "mafia-phase mafia-phase--" + g.phase;
    document.getElementById("mafiaPhaseIcon").textContent = PHASE_EMOJI[g.phase] || "";
    document.getElementById("mafiaPhaseName").textContent =
        t("mafiaPhase_" + g.phase) + " · " + t("mafiaDay") + " " + g.day;

    let hint = "";
    if (!g.my_alive) {
        hint = t("mafiaYouDead");
    } else if (g.phase === "night") {
        hint = g.my_role === "mafia"    ? t("mafiaHintKill")
             : g.my_role === "doctor"   ? t("mafiaHintHeal")
             : g.my_role === "sheriff"  ? t("mafiaHintCheck")
             : t("mafiaHintSleep");
    } else if (g.phase === "day") {
        hint = t("mafiaHintDiscuss");
    } else if (g.phase === "vote") {
        hint = t("mafiaHintVote") + " (" + (g.voted_count || 0) + "/" + g.alive_count + ")";
    }
    document.getElementById("mafiaPhaseHint").textContent = hint;

    // Своя роль
    const roleCard = document.getElementById("mafiaRoleCard");
    roleCard.className = "mafia-role mafia-role--" + (g.my_role || "civilian")
        + (g.my_alive ? "" : " mafia-role--dead");
    document.getElementById("mafiaRoleIcon").textContent = ROLE_EMOJI[g.my_role] || "👤";
    document.getElementById("mafiaRoleName").textContent =
        t("mafiaRole_" + (g.my_role || "civilian"));

    renderMafiaPlayers(g);
    renderMafiaFeed(g);
}

function renderMafiaPlayers(g) {
    const box = document.getElementById("mafiaPlayers");
    if (!box) return;
    box.innerHTML = "";

    // Скільки голосів проти кожного — рахуємо лише під час голосування
    const canAct = g.my_alive && (
        (g.phase === "night" && ["mafia","doctor","sheriff"].indexOf(g.my_role) !== -1) ||
        g.phase === "vote"
    );

    const frag = document.createDocumentFragment();
    g.players.forEach(function (p) {
        const cell = el("div", "mafia-player"
            + (p.alive ? "" : " mafia-player--dead")
            + (p.is_me ? " mafia-player--me" : ""));

        // Підсвітка вибору
        if (g.phase === "night" && g.my_action === p.seat) {
            cell.classList.add(g.my_role === "doctor"
                ? "mafia-player--healed" : "mafia-player--target");
        }
        if (g.phase === "vote" && g.my_vote === p.seat) {
            cell.classList.add("mafia-player--voted");
        }

        const av = el("div", "mafia-player__avatar");
        const src = safeImageUrl(p.photo);
        if (src) av.style.backgroundImage = 'url("' + src + '")';
        cell.appendChild(av);

        cell.appendChild(el("span", "mafia-player__name", p.name));

        if (!p.alive) {
            cell.appendChild(el("span", "mafia-player__cross", "✕"));
        }

        // Роль видно: свою, спільників (мафія), і всім після кінця
        if (p.role) {
            cell.appendChild(el("span",
                "mafia-player__tag mafia-player__tag--" + p.role,
                t("mafiaShort_" + p.role)));
        }

        // Результати перевірок шерифа
        if (g.my_role === "sheriff" && g.sheriff_results) {
            const res = g.sheriff_results[String(p.seat)];
            if (res && !p.role) {
                cell.appendChild(el("span",
                    "mafia-player__tag mafia-player__tag--" +
                    (res === "mafia" ? "suspect" : "clean"),
                    t(res === "mafia" ? "mafiaSuspect" : "mafiaClean")));
            }
        }

        // Клік — дія за роллю
        const targetable = canAct && p.alive
            && !(g.phase === "vote" && p.is_me)
            && !(g.phase === "night" && g.my_role === "mafia" && p.role === "mafia");

        if (targetable) {
            cell.classList.add("mafia-player--clickable");
            cell.addEventListener("click", function () { mafiaTarget(g, p.seat); });
        }

        frag.appendChild(cell);
    });
    box.appendChild(frag);
}

function renderMafiaFeed(g) {
    const box = document.getElementById("mafiaFeed");
    if (!box) return;
    box.innerHTML = "";

    const nameOf = function (seat) {
        const p = g.players[seat];
        return p ? p.name : "—";
    };

    (g.log || []).slice().reverse().forEach(function (ev) {
        const row = el("div", "mafia-event");

        if (ev.type === "night") {
            if (ev.killed !== null && ev.killed !== undefined) {
                row.classList.add("mafia-event--kill");
                row.appendChild(el("span", "mafia-event__icon", "🔫"));
                const txt = el("span", null, null);
                txt.innerHTML = t("mafiaNightKilled").replace("{n}",
                    "<b>" + nameOf(ev.killed) + "</b>");
                row.appendChild(txt);
            } else {
                row.classList.add("mafia-event--save");
                row.appendChild(el("span", "mafia-event__icon", "💊"));
                row.appendChild(el("span", null, t("mafiaNightSaved")));
            }
        } else if (ev.type === "vote") {
            row.classList.add("mafia-event--vote");
            row.appendChild(el("span", "mafia-event__icon", "⚖️"));
            if (ev.executed !== null && ev.executed !== undefined) {
                const txt = el("span", null, null);
                txt.innerHTML = t("mafiaVoteExecuted")
                    .replace("{n}", "<b>" + nameOf(ev.executed) + "</b>")
                    .replace("{r}", t("mafiaRole_" + ev.role));
                row.appendChild(txt);
            } else {
                row.appendChild(el("span", null, t("mafiaVoteNobody")));
            }
        }
        box.appendChild(row);
    });
}

/* ── Дії ──────────────────────────────────────────────────── */

async function mafiaTarget(g, seat) {
    if (mafiaBusy) return;

    let action = null;
    if (g.phase === "vote")            action = "vote";
    else if (g.my_role === "mafia")    action = "kill";
    else if (g.my_role === "doctor")   action = "heal";
    else if (g.my_role === "sheriff")  action = "check";
    if (!action) return;

    mafiaBusy = true;
    try {
        await API.mafiaAction(action, seat);
        MFSOUND.pick();
        await refreshMafia(true);
    } catch (e) {
        toast(t("mafiaBadAction"), "error");
    } finally {
        mafiaBusy = false;
    }
}

async function joinMafia(roomId) {
    try {
        await API.mafiaJoin(roomId);
        await refreshMafia(true);
    } catch (e) {
        const msg = String(e.message || "");
        toast(msg.indexOf("400") !== -1 ? t("durakJoinFail") : t("errGeneric"), "error");
    }
}

/* ── Оновлення ────────────────────────────────────────────── */

function showMafiaView(view) {
    document.getElementById("mafiaLobby").style.display = view === "lobby" ? "" : "none";
    document.getElementById("mafiaWait").style.display  = view === "wait"  ? "" : "none";
    document.getElementById("mafiaGame").style.display  = view === "game"  ? "" : "none";
}

async function refreshMafia(force) {
    try {
        const s = await API.mafiaState();

        if (!s.in_room) {
            showMafiaView("lobby");
            const r = await API.mafiaRooms();
            const rooms = r.rooms || [];
            const hash = "lobby:" + JSON.stringify(rooms);
            if (force || hash !== mafiaLastHash) {
                mafiaLastHash = hash;
                renderMafiaRooms(rooms);
            }
            mafiaState = s;
            mafiaRoleShown = false;
            return;
        }

        const hash = "room:" + JSON.stringify(s);
        if (!force && hash === mafiaLastHash) return;
        mafiaLastHash = hash;

        const prev = mafiaState;
        mafiaState = s;

        if (s.status === "waiting") {
            showMafiaView("wait");
            renderMafiaWait(s);
            mafiaRoleShown = false;
            return;
        }

        showMafiaView("game");
        renderMafiaGame(s);

        // Гра щойно почалась — показуємо роль
        if (s.game && !mafiaRoleShown) {
            mafiaRoleShown = true;
            showRoleModal(s.game.my_role);
        }

        // Зміна фази — звук
        if (prev && prev.game && s.game && prev.game.phase !== s.game.phase) {
            if (s.game.phase === "night") MFSOUND.night();
            else if (s.game.phase === "day") MFSOUND.day();
            else if (s.game.phase === "vote") MFSOUND.vote();
        }

        if (s.game && s.game.finished && (!prev || !prev.game || !prev.game.finished)) {
            showMafiaResult(s);
        }
    } catch (e) {
        console.warn("mafia:", e.message);
    }
}

/** Локальний відлік — щоб таймер не чекав наступного запиту. */
function startMafiaTick() {
    if (mafiaTick) clearInterval(mafiaTick);
    mafiaTick = setInterval(function () {
        if (!mafiaState || !mafiaState.game) return;
        const g = mafiaState.game;
        if (g.finished) return;

        g.seconds_left = Math.max(0, g.seconds_left - 1);
        const el2 = document.getElementById("mafiaTimer");
        if (el2) {
            el2.textContent = fmtTime(g.seconds_left);
            el2.classList.toggle("mafia-phase__timer--urgent", g.seconds_left <= 10);
        }
        // Час вийшов — просимо сервер перевести фазу
        if (g.seconds_left === 0) refreshMafia(true);
    }, 1000);
}

function startMafiaPolling() {
    if (mafiaTimer) clearInterval(mafiaTimer);
    mafiaTimer = setInterval(function () {
        if (document.hidden) return;
        const screen = document.getElementById("mafiaScreen");
        if (!screen || !screen.classList.contains("fullscreen--open")) return;
        refreshMafia(false);
    }, 2000);
    startMafiaTick();
}

function stopMafiaPolling() {
    if (mafiaTimer) { clearInterval(mafiaTimer); mafiaTimer = null; }
    if (mafiaTick)  { clearInterval(mafiaTick);  mafiaTick = null; }
}

/* ── Модалки ──────────────────────────────────────────────── */

function showRoleModal(role) {
    document.getElementById("mafiaRevealIcon").textContent = ROLE_EMOJI[role] || "👤";
    const nameEl = document.getElementById("mafiaRevealName");
    nameEl.textContent = t("mafiaRole_" + role);
    nameEl.className = "mafia-reveal__name mafia-reveal__name--" + role;
    document.getElementById("mafiaRevealDesc").textContent = t("mafiaDesc_" + role);

    document.getElementById("mafiaRoleBackdrop").classList.add("modal-backdrop--open");
    document.getElementById("mafiaRoleModal").classList.add("center-modal--open");
}

function showMafiaResult(s) {
    const g = s.game;
    const iAmMafia = g.my_role === "mafia";
    const iWon = (g.winner === "mafia") === iAmMafia;

    const icon = document.getElementById("mafiaResIcon");
    icon.className = "mafia-res__icon " + (iWon ? "mafia-res__icon--win" : "mafia-res__icon--lose");
    icon.textContent = g.winner === "mafia" ? "🔫" : "🏆";

    document.getElementById("mafiaResTitle").textContent =
        t(g.winner === "mafia" ? "mafiaWinMafia" : "mafiaWinCivilians");

    // Банк ділиться між командою переможців
    const total = g.players.length;
    const winners = g.players.filter(function (p) {
        return (p.role === "mafia") === (g.winner === "mafia");
    }).length;
    const share = (s.bet && winners) ? Math.floor(s.bet * total / winners) : 0;

    const amt = document.getElementById("mafiaResAmount");
    amt.className = "durak-res__amount " + (iWon ? "durak-res__amount--win" : "durak-res__amount--lose");
    amt.textContent = s.bet
        ? (iWon ? "+" + share.toLocaleString("uk") : "−" + s.bet.toLocaleString("uk"))
          + " " + (s.currency === "donate" ? t("donateShort") : t("coinsShort"))
        : "";

    // Розкриваємо всі ролі
    const list = document.getElementById("mafiaResRoles");
    list.innerHTML = "";
    g.players.forEach(function (p) {
        const row = el("div", "mafia-reveal-row");
        row.appendChild(el("span", "mafia-reveal-row__emoji", ROLE_EMOJI[p.role] || "👤"));
        row.appendChild(el("span", "mafia-reveal-row__name", p.name));
        const r = el("span", "mafia-reveal-row__role", t("mafiaRole_" + p.role));
        r.style.color = p.role === "mafia" ? "var(--red)"
            : p.role === "sheriff" ? "var(--accent)"
            : p.role === "doctor" ? "var(--teal)" : "var(--muted)";
        row.appendChild(r);
        list.appendChild(row);
    });

    iWon ? MFSOUND.win() : MFSOUND.lose();

    document.getElementById("mafiaResBackdrop").classList.add("modal-backdrop--open");
    document.getElementById("mafiaResModal").classList.add("center-modal--open");
}

/* ── Ініціалізація ────────────────────────────────────────── */

function initMafia() {
    const openBtn = document.getElementById("openMafia");
    const screen  = document.getElementById("mafiaScreen");
    if (!openBtn || !screen) return;

    openBtn.addEventListener("click", function () {
        screen.classList.add("fullscreen--open");
        mafiaLastHash = "";
        refreshMafia(true);
        startMafiaPolling();
    });

    const back = document.getElementById("mafiaBack");
    if (back) back.addEventListener("click", function () {
        screen.classList.remove("fullscreen--open");
        stopMafiaPolling();
        snapScreensToActiveTab();
    });

    // Створення
    const openCreate = document.getElementById("mafiaCreateOpen");
    if (openCreate) openCreate.addEventListener("click", function () {
        document.getElementById("mafiaCreateError").textContent = "";
        document.getElementById("mafiaCreateBackdrop").classList.add("modal-backdrop--open");
        document.getElementById("mafiaCreateModal").classList.add("center-modal--open");
    });

    const closeCreate = function () {
        document.getElementById("mafiaCreateBackdrop").classList.remove("modal-backdrop--open");
        document.getElementById("mafiaCreateModal").classList.remove("center-modal--open");
    };
    ["mafiaCreateClose", "mafiaCreateBackdrop"].forEach(function (id) {
        const n = document.getElementById(id);
        if (n) n.addEventListener("click", closeCreate);
    });

    document.querySelectorAll("#mafiaPlayerOpts .durak-opt").forEach(function (b) {
        b.addEventListener("click", function () {
            mfPlayers = parseInt(b.dataset.players, 10);
            document.querySelectorAll("#mafiaPlayerOpts .durak-opt").forEach(function (x) {
                x.classList.toggle("durak-opt--active", x === b);
            });
        });
    });

    const cc = document.getElementById("mafiaCurCoins");
    const cd = document.getElementById("mafiaCurDonate");
    if (cc) cc.addEventListener("click", function () {
        mfCurrency = "coins";
        cc.classList.add("currency-pill--active");
        cd.classList.remove("currency-pill--active");
    });
    if (cd) cd.addEventListener("click", function () {
        mfCurrency = "donate";
        cd.classList.add("currency-pill--active");
        cc.classList.remove("currency-pill--active");
    });

    const submit = document.getElementById("mafiaCreateSubmit");
    if (submit) submit.addEventListener("click", async function () {
        const errEl = document.getElementById("mafiaCreateError");
        errEl.textContent = "";
        const bet = parseInt(document.getElementById("mafiaBetInput").value, 10) || 0;
        try {
            await API.mafiaCreate(bet, mfCurrency, mfPlayers);
            closeCreate();
            await refreshMafia(true);
        } catch (e) {
            const msg = String(e.message || "");
            errEl.textContent = msg.indexOf("400") !== -1 ? t("errFunds") : t("errGeneric");
        }
    });

    // Кімната
    const leave = document.getElementById("mafiaLeaveBtn");
    if (leave) leave.addEventListener("click", async function () {
        const ok = await dialog({ title: t("durakLeave"), text: t("durakLeaveText") });
        if (!ok) return;
        await API.mafiaLeave();
        await refreshMafia(true);
    });

    const start = document.getElementById("mafiaStartBtn");
    if (start) start.addEventListener("click", async function () {
        try {
            await API.mafiaStart();
            await refreshMafia(true);
        } catch (e) {
            toast(t("mafiaNeedPlayers"), "error");
        }
    });

    // Модалка ролі
    const roleOk = document.getElementById("mafiaRoleOk");
    if (roleOk) roleOk.addEventListener("click", function () {
        document.getElementById("mafiaRoleBackdrop").classList.remove("modal-backdrop--open");
        document.getElementById("mafiaRoleModal").classList.remove("center-modal--open");
    });

    // Результат
    const resOk = document.getElementById("mafiaResOk");
    if (resOk) resOk.addEventListener("click", async function () {
        document.getElementById("mafiaResBackdrop").classList.remove("modal-backdrop--open");
        document.getElementById("mafiaResModal").classList.remove("center-modal--open");
        mafiaLastHash = "";
        mafiaRoleShown = false;
        await refreshMafia(true);
        loadFromServer();
    });

    // Правила
    const help = document.getElementById("mafiaHelp");
    if (help) help.addEventListener("click", function () {
        const body = document.getElementById("mafiaHelpBody");
        body.innerHTML = "";
        [t("mafiaRule1"), t("mafiaRule2"), t("mafiaRule3"), t("mafiaRule4"), t("mafiaRule5")]
            .forEach(function (text, i) {
                const row = el("div", "mines-help__row");
                row.appendChild(el("span", "mines-help__num", String(i + 1)));
                row.appendChild(el("p", "mines-help__text", text));
                body.appendChild(row);
            });
        document.getElementById("mafiaHelpBackdrop").classList.add("modal-backdrop--open");
        document.getElementById("mafiaHelpModal").classList.add("center-modal--open");
    });

    const closeHelp = function () {
        document.getElementById("mafiaHelpBackdrop").classList.remove("modal-backdrop--open");
        document.getElementById("mafiaHelpModal").classList.remove("center-modal--open");
    };
    ["mafiaHelpClose", "mafiaHelpOk", "mafiaHelpBackdrop"].forEach(function (id) {
        const n = document.getElementById(id);
        if (n) n.addEventListener("click", closeHelp);
    });
}
