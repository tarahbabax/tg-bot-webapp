/**
 * durak.js — карткова гра «Дурак» на кількох гравців.
 * Стан живе на сервері; клієнт опитує його раз на 1.5с
 * і перемальовує лише коли щось змінилося.
 */

const SUIT_SYMBOL = { S: "♠", H: "♥", D: "♦", C: "♣" };
const RANK_LABEL  = { T: "10" };

let durakState   = null;
let durakTimer   = null;
let durakBusy    = false;
let durakLastHash = "";

// Налаштування створення кімнати
let dkDeck = 36, dkPlayers = 2, dkCurrency = "coins";

/* ── Звуки ────────────────────────────────────────────────── */

const DSOUND = {
    play:   function () { beep(500, 0.07, "triangle", 0.045); },
    beat:   function () { beep(660, 0.09, "sine", 0.05); },
    take:   function () { beep(240, 0.18, "sawtooth", 0.04); },
    pass:   function () { beep(780, 0.12, "sine", 0.05); },
    win:    function () {
        [523, 659, 784, 1047].forEach(function (f, i) {
            setTimeout(function () { beep(f, 0.14, "sine", 0.06); }, i * 90);
        });
    },
    lose:   function () { beep(200, 0.3, "sine", 0.035); },
    joined: function () { beep(620, 0.1, "sine", 0.045); },
};

/* ── Карта ────────────────────────────────────────────────── */

function cardEl(code, extraClass) {
    const rank = code[0], suit = code[1];
    const card = el("div", "card" + (extraClass ? " " + extraClass : ""));
    if (suit === "H" || suit === "D") card.classList.add("card--red");

    card.appendChild(el("span", "card__rank", RANK_LABEL[rank] || rank));
    card.appendChild(el("span", "card__suit", SUIT_SYMBOL[suit] || suit));
    card.dataset.card = code;
    return card;
}

/* ── Рендер лобі ──────────────────────────────────────────── */

function renderRooms(rooms) {
    const box = document.getElementById("durakRooms");
    if (!box) return;
    box.innerHTML = "";

    if (!rooms.length) {
        renderEmpty(box, "durakNoRooms", "durakNoRoomsDesc");
        return;
    }

    const frag = document.createDocumentFragment();
    rooms.forEach(function (r) {
        const row = el("div", "durak-room");
        row.appendChild(el("div", "durak-room__deck", String(r.deck_size)));

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

        row.addEventListener("click", function () { joinRoom(r.room_id); });
        frag.appendChild(row);
    });
    box.appendChild(frag);
}

/* ── Рендер очікування ────────────────────────────────────── */

function renderWait(s) {
    document.getElementById("durakWaitDeck").textContent = s.deck_size;
    document.getElementById("durakWaitBet").textContent = s.bet
        ? s.bet.toLocaleString("uk") + " " + (s.currency === "donate" ? t("donateShort") : t("coinsShort"))
        : t("durakFree");
    document.getElementById("durakWaitPot").textContent = s.bet
        ? (s.bet * s.seats.length).toLocaleString("uk")
        : "—";

    const box = document.getElementById("durakSeats");
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

    const startBtn = document.getElementById("durakStartBtn");
    startBtn.style.display = s.is_host ? "flex" : "none";
    startBtn.disabled = s.seats.length < 2;
}

/* ── Рендер столу ─────────────────────────────────────────── */

function renderGame(s) {
    const g = s.game;
    if (!g) return;

    // Суперники
    const opps = document.getElementById("durakOpponents");
    opps.innerHTML = "";
    g.players.forEach(function (p) {
        if (p.is_me) return;
        const box = el("div", "durak-opp"
            + (p.seat === g.attacker ? " durak-opp--attacker" : "")
            + (p.seat === g.defender ? " durak-opp--defender" : "")
            + (p.out ? " durak-opp--out" : ""));

        const av = el("div", "durak-opp__avatar");
        const src = safeImageUrl(p.photo);
        if (src) av.style.backgroundImage = 'url("' + src + '")';
        box.appendChild(av);

        box.appendChild(el("span", "durak-opp__name", p.name));

        const cards = el("span", "durak-opp__cards");
        // Стопка карт — дві зміщені рамки, читається краще за одну
        cards.innerHTML =
            '<svg viewBox="0 0 24 24" fill="none">' +
            '<rect x="7" y="4" width="11" height="15" rx="1.8" stroke="currentColor" stroke-width="1.8"/>' +
            '<path d="M14.5 4V3.2A1.2 1.2 0 0013.3 2H6.2A1.2 1.2 0 005 3.2v11.6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>' +
            '</svg>';
        cards.appendChild(el("span", null, String(p.cards)));
        box.appendChild(cards);

        if (p.seat === g.attacker) box.appendChild(el("span", "durak-opp__role", t("durakAtt")));
        else if (p.seat === g.defender) box.appendChild(el("span", "durak-opp__role", t("durakDef")));

        // Хто вже сказав «бито», а хто ще думає — видно всім
        const passed  = (g.passed || []).indexOf(p.seat) !== -1;
        const waiting = (g.waiting || []).indexOf(p.seat) !== -1;

        if (g.table.length && p.seat !== g.defender) {
            if (passed) {
                const mark = el("span", "durak-opp__pass durak-opp__pass--done");
                mark.innerHTML = '<svg viewBox="0 0 24 24" fill="none"><path d="M4.5 12.5l5 5 10-11" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
                mark.appendChild(el("span", null, t("durakPassed")));
                box.appendChild(mark);
                box.classList.add("durak-opp--passed");
            } else if (waiting) {
                const mark = el("span", "durak-opp__pass durak-opp__pass--wait");
                mark.innerHTML = '<span class="durak-think"><i></i><i></i><i></i></span>';
                mark.appendChild(el("span", null, t("durakThinking")));
                box.appendChild(mark);
                box.classList.add("durak-opp--waiting");
            }
        }

        opps.appendChild(box);
    });

    // Колода і козир
    const pile = document.getElementById("durakDeckPile");
    pile.style.display = g.deck_left ? "block" : "none";
    document.getElementById("durakDeckCount").textContent = g.deck_left;

    // Козирна карта — показуємо повністю (номінал + масть),
    // а не саму лише масть: гравцю важливо бачити, яка карта лежить.
    const deckBox = document.getElementById("durakDeck");
    let trumpEl = deckBox.querySelector(".durak-deck__trump");

    if (g.trump_card) {
        if (!trumpEl) {
            trumpEl = el("div", "durak-deck__trump");
            // Вставляємо ПЕРЕД стопкою, щоб порядок у DOM збігався з шарами
            deckBox.insertBefore(trumpEl, deckBox.firstChild);
        }

        const rank = g.trump_card[0];
        const suit = g.trump_card[1];

        trumpEl.innerHTML = "";
        trumpEl.appendChild(el("span", "durak-deck__trump-rank", RANK_LABEL[rank] || rank));
        trumpEl.appendChild(el("span", "durak-deck__trump-suit", SUIT_SYMBOL[suit] || suit));
        trumpEl.style.color = (suit === "H" || suit === "D") ? "#D62828" : "#1A1A22";
        trumpEl.style.display = "flex";
    } else if (trumpEl) {
        trumpEl.style.display = "none";
    }

    deckBox.classList.toggle("durak-deck--empty", !g.deck_left);

    // Смуга козиря — масть видно завжди, навіть коли колода порожня
    const tb = document.getElementById("durakTrumpSuit");
    if (tb) {
        tb.textContent = SUIT_SYMBOL[g.trump] || g.trump;
        const red = g.trump === "H" || g.trump === "D";
        tb.className = "durak-trumpbar__suit "
            + (red ? "durak-trumpbar__suit--red" : "durak-trumpbar__suit--black");
    }

    // Стіл
    const table = document.getElementById("durakTable");
    table.innerHTML = "";
    g.table.forEach(function (pair) {
        const wrap = el("div", "durak-pair");
        wrap.appendChild(cardEl(pair.a, "card--new"));
        if (pair.d) wrap.appendChild(cardEl(pair.d, "card--defend card--new"));
        table.appendChild(wrap);
    });

    // Моя роль
    const isAttacker = g.my_seat === g.attacker;
    const isDefender = g.my_seat === g.defender;
    const undefended = g.table.filter(function (p) { return !p.d; });

    // Рука
    const hand = document.getElementById("durakHand");
    hand.innerHTML = "";
    g.my_hand.forEach(function (code) {
        let playable = false;
        if (isDefender && undefended.length) {
            playable = canBeat(undefended[0].a, code, g.trump, g.deck_size);
        } else if (!isDefender) {
            playable = g.table.length === 0
                ? isAttacker
                : rankOnTable(g.table, code);
        }

        const c = cardEl(code, playable ? "card--playable" : "card--dim");
        if (playable) {
            c.addEventListener("click", function () {
                playCard(code, isDefender ? "defend" : "attack");
            });
        }
        hand.appendChild(c);
    });

    // Статус
    const status = document.getElementById("durakStatus");
    const iPassed = (g.passed || []).indexOf(g.my_seat) !== -1;
    const waitingCount = (g.waiting || []).length;

    let text = "";
    if (isDefender) {
        text = undefended.length
            ? t("durakYouDefend")
            : (waitingCount
                ? t("durakWaitingFor").replace("{n}", waitingCount)
                : t("durakWaitAttack"));
    } else if (iPassed) {
        // Ти вже сказав «бито» — чекаємо на решту
        text = waitingCount
            ? t("durakWaitingFor").replace("{n}", waitingCount)
            : t("durakPassedWait");
    } else if (isAttacker) {
        text = g.table.length ? t("durakYouAttackMore") : t("durakYouAttack");
    } else {
        text = g.table.length ? t("durakCanAdd") : t("durakWaitAttack");
    }

    status.textContent = text;
    status.classList.toggle("durak-status--my-turn",
        (isDefender && undefended.length) || (isAttacker && !iPassed));

    // Кнопки
    document.getElementById("durakTakeBtn").disabled = !(isDefender && g.table.length);
    const passBtn = document.getElementById("durakPassBtn");
    passBtn.disabled =
        !(!isDefender && g.table.length && undefended.length === 0) || iPassed;
    passBtn.classList.toggle("durak-act--done", iPassed);
    passBtn.textContent = iPassed ? t("durakPassed") : t("durakPass");
}

/** Локальна перевірка — щоб підсвітити карти без запиту на сервер. */
function canBeat(attack, defend, trump, deckSize) {
    const ranks = deckSize === 52
        ? ["2","3","4","5","6","7","8","9","T","J","Q","K","A"]
        : ["6","7","8","9","T","J","Q","K","A"];
    const aS = attack[1], dS = defend[1];
    if (aS === dS) return ranks.indexOf(defend[0]) > ranks.indexOf(attack[0]);
    return dS === trump && aS !== trump;
}

function rankOnTable(table, card) {
    for (let i = 0; i < table.length; i++) {
        if (table[i].a[0] === card[0]) return true;
        if (table[i].d && table[i].d[0] === card[0]) return true;
    }
    return false;
}

/* ── Дії ──────────────────────────────────────────────────── */

async function playCard(code, action) {
    if (durakBusy) return;
    durakBusy = true;
    try {
        await API.durakMove(action, code);
        action === "defend" ? DSOUND.beat() : DSOUND.play();
        await refreshNow();
    } catch (e) {
        toast(String(e.message || "").indexOf("400") !== -1
            ? t("durakBadMove") : t("errGeneric"), "error");
    } finally {
        durakBusy = false;
    }
}

async function durakAction(action) {
    if (durakBusy) return;
    durakBusy = true;
    try {
        await API.durakMove(action, null);
        action === "take" ? DSOUND.take() : DSOUND.pass();
        await refreshNow();
    } catch (e) {
        toast(t("durakBadMove"), "error");
    } finally {
        durakBusy = false;
    }
}

async function joinRoom(roomId) {
    try {
        await API.durakJoin(roomId);
        DSOUND.joined();
        await refreshNow();
    } catch (e) {
        const msg = String(e.message || "");
        toast(msg.indexOf("400") !== -1 ? t("durakJoinFail") : t("errGeneric"), "error");
    }
}

/* ── Оновлення стану ──────────────────────────────────────── */

function showDurakView(view) {
    document.getElementById("durakLobby").style.display = view === "lobby" ? "" : "none";
    document.getElementById("durakWait").style.display  = view === "wait"  ? "" : "none";
    document.getElementById("durakGame").style.display  = view === "game"  ? "" : "none";
}

async function refreshDurak(force) {
    try {
        const s = await API.durakState();

        if (!s.in_room) {
            // У лобі стан завжди однаковий ({in_room:false}), тому
            // хешувати треба СПИСОК КІМНАТ — інакше нові кімнати
            // інших гравців ніколи не з'являлись би на екрані.
            showDurakView("lobby");
            const r = await API.durakRooms();
            const rooms = r.rooms || [];
            const hash = "lobby:" + JSON.stringify(rooms);
            if (force || hash !== durakLastHash) {
                durakLastHash = hash;
                renderRooms(rooms);
            }
            durakState = s;
            return;
        }

        // У кімнаті хешуємо сам стан — щоб карти не смикались
        const hash = "room:" + JSON.stringify(s);
        if (!force && hash === durakLastHash) return;
        durakLastHash = hash;

        const prev = durakState;
        durakState = s;

        if (s.status === "waiting") {
            showDurakView("wait");
            renderWait(s);
            return;
        }

        showDurakView("game");
        renderGame(s);

        if (s.game && s.game.finished && (!prev || !prev.game || !prev.game.finished)) {
            showDurakResult(s);
        }
    } catch (e) {
        console.warn("durak:", e.message);
    }
}

function showDurakResult(s) {
    const g = s.game;
    const me = g.players.find(function (p) { return p.is_me; });
    const iLost = me && g.loser === me.id;

    const icon = document.getElementById("durakResIcon");
    icon.className = "durak-res__icon " + (iLost ? "durak-res__icon--lose" : "durak-res__icon--win");
    icon.textContent = iLost ? "🃏" : "🏆";

    document.getElementById("durakResTitle").textContent =
        iLost ? t("durakYouLost") : t("durakYouWon");

    // Банк ділиться між усіма, крім дурня
    const winners = g.players.length - 1;
    const share = (s.bet && winners) ? Math.floor(s.bet * g.players.length / winners) : 0;

    const amt = document.getElementById("durakResAmount");
    amt.className = "durak-res__amount " + (iLost ? "durak-res__amount--lose" : "durak-res__amount--win");
    amt.textContent = s.bet
        ? (iLost ? "−" + s.bet.toLocaleString("uk") : "+" + share.toLocaleString("uk"))
          + " " + (s.currency === "donate" ? t("donateShort") : t("coinsShort"))
        : "";

    document.getElementById("durakResText").textContent =
        iLost ? t("durakLostText") : t("durakWonText");

    iLost ? DSOUND.lose() : DSOUND.win();

    document.getElementById("durakResBackdrop").classList.add("modal-backdrop--open");
    document.getElementById("durakResModal").classList.add("center-modal--open");
}

function startDurakPolling() {
    if (durakTimer) clearInterval(durakTimer);

    // 1 секунда: у грі на кількох людей затримка помітна одразу,
    // а запит легкий — сервер віддає лише свій стан.
    durakTimer = setInterval(function () {
        if (document.hidden) return;
        const screen = document.getElementById("durakScreen");
        if (!screen || !screen.classList.contains("fullscreen--open")) return;
        refreshDurak(false);
    }, 1000);
}

/**
 * Після власної дії оновлюємо одразу, не чекаючи наступного тику,
 * і ще раз за пів секунди — щоб підхопити реакцію суперника.
 */
async function refreshNow() {
    await refreshDurak(true);
    setTimeout(function () { refreshDurak(false); }, 500);
}

function stopDurakPolling() {
    if (durakTimer) { clearInterval(durakTimer); durakTimer = null; }
}

/* ── Ініціалізація ────────────────────────────────────────── */

function initDurak() {
    const openBtn = document.getElementById("openDurak");
    const screen  = document.getElementById("durakScreen");
    if (!openBtn || !screen) return;

    openBtn.addEventListener("click", function () {
        screen.classList.add("fullscreen--open");
        durakLastHash = "";
        refreshDurak(true);
        startDurakPolling();
    });

    const back = document.getElementById("durakBack");
    if (back) back.addEventListener("click", function () {
        screen.classList.remove("fullscreen--open");
        stopDurakPolling();
        snapScreensToActiveTab();
    });

    // Створення кімнати
    const openCreate = document.getElementById("durakCreateOpen");
    if (openCreate) openCreate.addEventListener("click", function () {
        document.getElementById("durakCreateError").textContent = "";
        document.getElementById("durakCreateBackdrop").classList.add("modal-backdrop--open");
        document.getElementById("durakCreateModal").classList.add("center-modal--open");
    });

    const closeCreate = function () {
        document.getElementById("durakCreateBackdrop").classList.remove("modal-backdrop--open");
        document.getElementById("durakCreateModal").classList.remove("center-modal--open");
    };
    ["durakCreateClose", "durakCreateBackdrop"].forEach(function (id) {
        const n = document.getElementById(id);
        if (n) n.addEventListener("click", closeCreate);
    });

    /**
     * Скільки гравців вміщує колода: кожному по 6 карт,
     * і хоча б одна має лишитись під козир.
     */
    function maxPlayersFor(deckSize) {
        return Math.max(2, Math.floor((deckSize - 1) / 6));
    }

    function refreshPlayerOptions() {
        const limit = Math.min(6, maxPlayersFor(dkDeck));
        document.querySelectorAll("#durakPlayerOpts .durak-opt").forEach(function (b) {
            const n = parseInt(b.dataset.players, 10);
            const locked = n > limit;
            b.disabled = locked;
            b.classList.toggle("durak-opt--locked", locked);
            // Якщо обране число стало недоступним — відкочуємо на межу
            if (locked && dkPlayers === n) {
                dkPlayers = limit;
            }
        });
        document.querySelectorAll("#durakPlayerOpts .durak-opt").forEach(function (b) {
            b.classList.toggle("durak-opt--active",
                parseInt(b.dataset.players, 10) === dkPlayers);
        });
    }

    document.querySelectorAll("#durakDeckOpts .durak-opt").forEach(function (b) {
        b.addEventListener("click", function () {
            dkDeck = parseInt(b.dataset.deck, 10);
            document.querySelectorAll("#durakDeckOpts .durak-opt").forEach(function (x) {
                x.classList.toggle("durak-opt--active", x === b);
            });
            refreshPlayerOptions();
        });
    });

    document.querySelectorAll("#durakPlayerOpts .durak-opt").forEach(function (b) {
        b.addEventListener("click", function () {
            if (b.disabled) return;
            dkPlayers = parseInt(b.dataset.players, 10);
            document.querySelectorAll("#durakPlayerOpts .durak-opt").forEach(function (x) {
                x.classList.toggle("durak-opt--active", x === b);
            });
        });
    });

    refreshPlayerOptions();

    const cc = document.getElementById("durakCurCoins");
    const cd = document.getElementById("durakCurDonate");
    if (cc) cc.addEventListener("click", function () {
        dkCurrency = "coins";
        cc.classList.add("currency-pill--active");
        cd.classList.remove("currency-pill--active");
    });
    if (cd) cd.addEventListener("click", function () {
        dkCurrency = "donate";
        cd.classList.add("currency-pill--active");
        cc.classList.remove("currency-pill--active");
    });

    const submit = document.getElementById("durakCreateSubmit");
    if (submit) submit.addEventListener("click", async function () {
        const errEl = document.getElementById("durakCreateError");
        errEl.textContent = "";
        const bet = parseInt(document.getElementById("durakBetInput").value, 10) || 0;

        try {
            await API.durakCreate(dkDeck, bet, dkCurrency, dkPlayers);
            closeCreate();
            await refreshNow();
        } catch (e) {
            const msg = String(e.message || "");
            errEl.textContent = msg.indexOf("400") !== -1 ? t("errFunds") : t("errGeneric");
        }
    });

    // Дії в кімнаті
    const leave = document.getElementById("durakLeaveBtn");
    if (leave) leave.addEventListener("click", async function () {
        const ok = await dialog({ title: t("durakLeave"), text: t("durakLeaveText") });
        if (!ok) return;
        await API.durakLeave();
        await refreshNow();
    });

    const start = document.getElementById("durakStartBtn");
    if (start) start.addEventListener("click", async function () {
        try {
            await API.durakStart();
            await refreshNow();
        } catch (e) {
            toast(t("durakNeedPlayers"), "error");
        }
    });

    // Дії на столі
    const take = document.getElementById("durakTakeBtn");
    if (take) take.addEventListener("click", function () { durakAction("take"); });
    const pass = document.getElementById("durakPassBtn");
    if (pass) pass.addEventListener("click", function () { durakAction("pass"); });

    // Результат
    const resOk = document.getElementById("durakResOk");
    if (resOk) resOk.addEventListener("click", async function () {
        document.getElementById("durakResBackdrop").classList.remove("modal-backdrop--open");
        document.getElementById("durakResModal").classList.remove("center-modal--open");
        durakLastHash = "";
        await refreshDurak(true);
        loadFromServer();
    });

    // Довідка
    const help = document.getElementById("durakHelp");
    if (help) help.addEventListener("click", function () {
        const body = document.getElementById("durakHelpBody");
        body.innerHTML = "";
        [t("durakRule1"), t("durakRule2"), t("durakRule3"), t("durakRule4"), t("durakRule5")]
            .forEach(function (text, i) {
                const row = el("div", "mines-help__row");
                row.appendChild(el("span", "mines-help__num", String(i + 1)));
                row.appendChild(el("p", "mines-help__text", text));
                body.appendChild(row);
            });
        document.getElementById("durakHelpBackdrop").classList.add("modal-backdrop--open");
        document.getElementById("durakHelpModal").classList.add("center-modal--open");
    });

    const closeHelp = function () {
        document.getElementById("durakHelpBackdrop").classList.remove("modal-backdrop--open");
        document.getElementById("durakHelpModal").classList.remove("center-modal--open");
    };
    ["durakHelpClose", "durakHelpOk", "durakHelpBackdrop"].forEach(function (id) {
        const n = document.getElementById(id);
        if (n) n.addEventListener("click", closeHelp);
    });
}
