/**
 * shop.js — магазин, інвентар, вітрина, видимість у топах.
 * Рендер через DOM API (без innerHTML із даними) — захист від XSS.
 */

let shopItems      = [];
let inventoryItems = [];
let selectedItem   = null;
let topVisSelected = "public";

const shopFilterState = { query: "", types: new Set() };
const invFilterState  = { query: "", types: new Set() };

/* ── Побудова картки (безпечно) ────────────────────────────── */

function buildGiftPlaceholder() {
    const ph = el("div", "shop-item-gift__img-placeholder");
    ph.innerHTML = '<svg viewBox="0 0 24 24" fill="none"><path d="M20 12v9H4v-9M22 7H2v5h20V7zM12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>';
    return ph;
}

function buildItemCard(item, opts) {
    opts = opts || {};
    const isOut = (item.stock_left != null ? item.stock_left : 1) <= 0;

    if (item.type === "gift") {
        const card = el("div", "shop-item-gift" + (isOut ? " shop-item-gift--out" : ""));

        const media = el("div", "shop-item-gift__media");
        const src = safeImageUrl(item.photo_url);
        if (src) {
            const img = el("img", "shop-item-gift__img");
            img.src = src;
            img.alt = item.name || "";
            img.loading = "lazy";
            img.addEventListener("error", function () {
                img.remove();
                media.prepend(buildGiftPlaceholder());
            });
            media.appendChild(img);
        } else {
            media.appendChild(buildGiftPlaceholder());
        }
        if (isOut) media.appendChild(el("span", "item-out-badge", t("outOfStock")));
        card.appendChild(media);

        const body = el("div", "shop-item-gift__body");
        if (!opts.hideStock) {
            body.appendChild(el("span", "shop-item-gift__stock",
                item.stock_left + "/" + item.stock_total));
        }
        body.appendChild(el("p", "shop-item-gift__name", item.name));
        body.appendChild(el("p", "shop-item-gift__type", t("typeGift")));
        if (!opts.hidePrice) {
            body.appendChild(el("p", "shop-item-gift__price",
                item.price_coins + " " + t("coinsShort")));
        }
        card.appendChild(body);
        return card;
    }

    const card = el("div", "shop-item-prefix" + (isOut ? " shop-item-prefix--out" : ""));
    const tag  = el("span", "shop-item-prefix__tag", item.prefix_text);
    const color = safeColor(item.prefix_color);
    if (color) tag.style.color = color;
    card.appendChild(tag);

    const body = el("span", "shop-item-prefix__body");
    body.appendChild(el("span", "shop-item-prefix__name", item.name));
    if (!opts.hidePrice) {
        body.appendChild(el("span", "shop-item-prefix__price",
            item.price_coins + " " + t("coinsShort")));
    }
    card.appendChild(body);
    if (isOut) card.appendChild(el("span", "item-out-badge item-out-badge--inline", t("outOfStock")));
    return card;
}


/** Заповнює hero-блок предмета: фото, плейсхолдер або великий префікс. */
function fillItemHero(heroEl, item) {
    heroEl.innerHTML = "";
    heroEl.classList.toggle("item-hero--prefix", item.type === "prefix");

    if (item.type === "prefix") {
        const tag = el("div", "item-hero__prefix", item.prefix_text);
        const color = safeColor(item.prefix_color);
        if (color) tag.style.color = color;
        heroEl.appendChild(tag);
        return;
    }

    const src = safeImageUrl(item.photo_url);
    if (src) {
        const img = el("img", "item-hero__img");
        img.src = src;
        img.alt = item.name || "";
        img.addEventListener("error", function () {
            img.remove();
            heroEl.appendChild(buildHeroPlaceholder());
        });
        heroEl.appendChild(img);
    } else {
        heroEl.appendChild(buildHeroPlaceholder());
    }
}

function buildHeroPlaceholder() {
    const ph = el("div", "item-hero__placeholder");
    ph.innerHTML = '<svg viewBox="0 0 24 24" fill="none"><path d="M20 12v9H4v-9M22 7H2v5h20V7zM12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>';
    return ph;
}

/* ── Фільтрація ────────────────────────────────────────────── */

function applyFilters(items, state) {
    const q = state.query.trim().toLowerCase();
    return items.filter(function (item) {
        if (state.types.size && !state.types.has(item.type)) return false;
        if (!q) return true;
        const hay = [item.name, item.description, item.prefix_text]
            .filter(Boolean).join(" ").toLowerCase();
        return hay.indexOf(q) !== -1;
    });
}

/* ── Магазин ───────────────────────────────────────────────── */

function renderShopItems() {
    const grid = document.getElementById("shopGrid");
    if (!grid) return;
    grid.innerHTML = "";

    const visible = applyFilters(shopItems, shopFilterState);
    if (!visible.length) {
        const hasItems = shopItems.length > 0;
        renderEmpty(grid,
            hasItems ? "noMatch"     : "shopEmpty",
            hasItems ? "noMatchDesc" : "shopEmptyDesc");
        return;
    }
    // Збираємо у фрагмент — браузер робить один перерахунок макета,
    // а не по одному на кожну картку.
    const frag = document.createDocumentFragment();
    visible.forEach(function (item) {
        const card = buildItemCard(item);
        card.addEventListener("click", function () { openItemDetail(item); });
        frag.appendChild(card);
    });
    grid.appendChild(frag);
}

let lastShopHash = "";

async function loadShopItems() {
    const grid = document.getElementById("shopGrid");
    try {
        const data = await API.getShopItems();
        const items = data.items || [];

        // Пропускаємо перемальовку якщо каталог не змінився
        const hash = items.map(function (i) {
            return i.item_id + ":" + i.stock_left;
        }).join(",");
        const changed = hash !== lastShopHash;
        lastShopHash = hash;

        shopItems = items;
        if (data.is_admin) currentAdminLevel = 5;
        if (changed || !grid.children.length) renderShopItems();
    } catch (e) {
        if (grid) renderError(grid, loadShopItems);
    }
}

/* ── Деталі товару ─────────────────────────────────────────── */

function openItemDetail(item) {
    selectedItem = item;

    const hero = document.getElementById("itemDetailHero");
    if (hero) fillItemHero(hero, item);

    document.getElementById("itemDetailName").textContent = item.name;
    document.getElementById("itemDetailType").textContent =
        item.type === "prefix" ? t("typePrefix") : t("typeGift");
    document.getElementById("itemDetailDesc").textContent   = item.description || "";
    document.getElementById("itemDetailCoins").textContent  = item.price_coins;
    document.getElementById("itemDetailDonate").textContent = item.price_donate;

    const isOut   = item.stock_left <= 0;
    const isAdmin = currentAdminLevel >= 5;

    // Залишок як бейдж біля назви
    const stockEl = document.getElementById("itemDetailStock");
    stockEl.textContent = isOut
        ? t("outOfStock")
        : t("stockLeft") + ": " + item.stock_left + "/" + item.stock_total;
    stockEl.className = "inv-sheet__badge" + (isOut ? " inv-sheet__badge--locked" : " inv-sheet__badge--stock");

    document.getElementById("buyCoinsBtn").style.display    = isOut ? "none" : "flex";
    document.getElementById("buyDonateBtn").style.display   = isOut ? "none" : "flex";
    document.getElementById("restockItemBtn").style.display = isAdmin ? "flex" : "none";
    document.getElementById("deleteItemBtn").style.display  = isAdmin ? "flex" : "none";

    document.getElementById("itemDetailModal").classList.add("item-detail-modal--open");
    document.getElementById("itemDetailBackdrop").classList.add("modal-backdrop--open");
}

function closeItemDetail() {
    const m = document.getElementById("itemDetailModal");
    const b = document.getElementById("itemDetailBackdrop");
    if (m) m.classList.remove("item-detail-modal--open");
    if (b) b.classList.remove("modal-backdrop--open");
}

/* ── Інвентар ──────────────────────────────────────────────── */

function renderInventoryInto(container) {
    if (!container) return;
    container.innerHTML = "";

    const state   = container.id === "invContainer" ? shopFilterState : invFilterState;
    const visible = applyFilters(inventoryItems, state);

    if (!visible.length) {
        const hasItems = inventoryItems.length > 0;
        renderEmpty(container,
            hasItems ? "noMatch"     : "invEmpty",
            hasItems ? "noMatchDesc" : "invEmptyDesc");
        return;
    }
    const frag = document.createDocumentFragment();
    visible.forEach(function (item) {
        const card = buildItemCard(item, { hideStock: true, hidePrice: true });
        card.addEventListener("click", function () { openInvItem(item); });
        frag.appendChild(card);
    });
    container.appendChild(frag);
}

async function loadInventory() {
    const targets = [
        document.getElementById("invContainer"),
        document.querySelector("#inventoryScreen .inv-screen-grid")
    ].filter(Boolean);

    try {
        const data = await API.getInventory();
        inventoryItems = data.items || [];
        targets.forEach(renderInventoryInto);
    } catch (e) {
        targets.forEach(function (c) { renderError(c, loadInventory); });
    }
}

/* ── Ініціалізація магазину ────────────────────────────────── */

/**
 * Кнопка «Додати предмет» видима лише коли:
 *  — активна головна вкладка «Магазин» (індекс 3 у нижній навігації)
 *  — і всередині магазину обрана під-вкладка «Магазин» (індекс 0)
 */
function updateAdminBar(shopTabIndex) {
    const bar = document.getElementById("shopAdminBar");
    if (!bar) return;

    if (typeof shopTabIndex === "number") bar.dataset.subtab = shopTabIndex;

    const sub      = parseInt(bar.dataset.subtab || "0", 10);
    const mainTab  = document.querySelector(".tabbar__item--active");
    const isShop   = mainTab && mainTab.dataset.index === "3";

    const visible = currentAdminLevel >= 5 && isShop && sub === 0;
    bar.classList.toggle("shop-admin-bar--visible", visible);
    bar.style.display = "";  // керуємо класом, не інлайном
}

function initShop() {
    const shopGrid = document.getElementById("shopGrid");
    if (!shopGrid) return;

    const invContainer = el("div", "shop-grid");
    invContainer.id = "invContainer";
    invContainer.style.display = "none";

    const tradeContainer = el("div", "shop-grid");
    tradeContainer.id = "tradeContainer";
    tradeContainer.style.display = "none";
    renderEmpty(tradeContainer, "tradeSoon", "tradeSoonDesc");

    shopGrid.parentNode.insertBefore(invContainer, shopGrid.nextSibling);
    shopGrid.parentNode.insertBefore(tradeContainer, invContainer.nextSibling);

    document.querySelectorAll(".shop-tab").forEach(function (tab, i) {
        tab.addEventListener("click", function () {
            document.querySelectorAll(".shop-tab").forEach(function (x) {
                x.classList.remove("shop-tab--active");
            });
            tab.classList.add("shop-tab--active");
            shopGrid.style.display       = i === 0 ? "" : "none";
            invContainer.style.display   = i === 1 ? "" : "none";
            tradeContainer.style.display = i === 2 ? "" : "none";

            updateAdminBar(i);

            if (i === 1) loadInventory();
        });
    });

    const shopSearch = document.getElementById("shopSearchInput");
    if (shopSearch) {
        shopSearch.addEventListener("input", function (e) {
            shopFilterState.query = e.target.value;
            renderShopItems();
            renderInventoryInto(invContainer);
        });
    }

    makeFilter("shopFilterBtn", "shopFilterDrop");
    document.querySelectorAll("#shopFilterDrop input[type=checkbox]").forEach(function (cb) {
        cb.addEventListener("change", function () {
            if (cb.checked) shopFilterState.types.add(cb.dataset.type);
            else shopFilterState.types.delete(cb.dataset.type);
            renderShopItems();
            renderInventoryInto(invContainer);
        });
    });

    const closeDetail = function () { closeItemDetail(); selectedItem = null; };
    const dc = document.getElementById("itemDetailClose");
    const db = document.getElementById("itemDetailBackdrop");
    if (dc) dc.addEventListener("click", closeDetail);
    if (db) db.addEventListener("click", closeDetail);

    async function doBuy(currency) {
        const item = selectedItem;
        if (!item) return;
        try {
            const r = await API.buyItem(item.item_id, currency);
            closeItemDetail();
            selectedItem = null;
            syncBalance(r.balance);
            toast(t("bought"), "success");
            await Promise.all([loadShopItems(), loadInventory(), syncRevisions()]);
        } catch (e) {
            const msg = String(e.message || "");
            toast(msg.indexOf("400") !== -1 ? t("errFunds") : t("errBuy"), "error");
        }
    }
    const bc = document.getElementById("buyCoinsBtn");
    const bd = document.getElementById("buyDonateBtn");
    if (bc) bc.addEventListener("click", function () { doBuy("coins"); });
    if (bd) bd.addEventListener("click", function () { doBuy("donate"); });

    const delBtn = document.getElementById("deleteItemBtn");
    if (delBtn) delBtn.addEventListener("click", async function () {
        const item = selectedItem;
        if (!item) return;
        const ok = await dialog({
            title: t("deleteItem"),
            text: t("deleteItemText"),
            confirmLabel: t("deleteConfirm")
        });
        if (!ok) return;
        try {
            await API.deleteItem(item.item_id);
            closeItemDetail();
            selectedItem = null;
            toast(t("deleted"), "success");
            await Promise.all([loadShopItems(), syncRevisions()]);
        } catch (e) {
            toast(t("errDelete"), "error");
        }
    });

    const reBtn = document.getElementById("restockItemBtn");
    if (reBtn) reBtn.addEventListener("click", async function () {
        const item = selectedItem;
        if (!item) return;
        const raw = await dialog({
            title: t("restockItem"),
            text: item.name + "\n" + t("stockLeft") + ": " + item.stock_left + " / " + item.stock_total,
            input: true,
            confirmLabel: t("addBtn")
        });
        if (raw === null) return;
        const amount = parseInt(raw, 10);
        if (!amount || amount <= 0) { toast(t("errAmount"), "error"); return; }
        try {
            await API.restockItem(item.item_id, amount);
            closeItemDetail();
            selectedItem = null;
            toast(t("restocked"), "success");
            await Promise.all([loadShopItems(), syncRevisions()]);
        } catch (e) {
            toast(t("errRestock"), "error");
        }
    });

    initAddItemForms();
    initInvItemModal();
    initInventoryScreen();
    initShowcase();
    initTopVisibility();
    // Ховаємо/показуємо кнопку при перемиканні головних вкладок
    document.querySelectorAll(".tabbar__item").forEach(function (tab) {
        tab.addEventListener("click", function () { setTimeout(updateAdminBar, 0); });
    });

    loadShopItems();
    startShopPolling();
}

/* ── Форми додавання (адмін) ──────────────────────────────── */

function resetForm(ids) {
    ids.forEach(function (id) {
        const node = document.getElementById(id);
        if (node) node.value = "";
    });
}


/**
 * Скидає тумблер у стан "увімкнено".
 * Форма додавання одноразова — якщо не скидати, наступного разу
 * вона відкриється з попереднім вибором, і адмін створить товар
 * із налаштуванням, якого не очікував.
 */
function resetSwitch(id, on) {
    const sw = document.getElementById(id);
    if (!sw) return;
    sw.classList.toggle("switch--on", on !== false);
    sw.setAttribute("aria-checked", String(on !== false));
}

/** Повне скидання форми подарунка. */
function resetGiftForm() {
    resetForm(["giftName","giftDesc","giftPriceCoins","giftPriceDonate","giftStock","giftPhotoUrl"]);
    resetSwitch("giftSellable", true);
    const preview = document.getElementById("giftPhotoPreview");
    const upload  = document.getElementById("giftPhotoUpload");
    const file    = document.getElementById("giftPhotoFile");
    if (preview) { preview.style.display = "none"; preview.src = ""; }
    if (upload)  upload.style.display = "";
    if (file)    file.value = "";
    const err = document.getElementById("giftError");
    if (err) err.textContent = "";
}

/** Повне скидання форми префікса. */
function resetPrefixForm() {
    resetForm(["prefixName","prefixDesc","prefixText","prefixPriceCoins","prefixPriceDonate","prefixStock"]);
    resetSwitch("prefixSellable", true);
    const color = document.getElementById("prefixColor");
    if (color) color.value = "#6E8BFF";
    const val = document.getElementById("prefixColorVal");
    if (val) val.textContent = "#6E8BFF";
    const prev = document.getElementById("prefixPreviewText");
    if (prev) { prev.textContent = "VIP"; prev.style.color = "#6E8BFF"; }
    const err = document.getElementById("prefixError");
    if (err) err.textContent = "";
}

function initAddItemForms() {
    const on = function (id, ev, fn) {
        const n = document.getElementById(id);
        if (n) n.addEventListener(ev, fn);
    };

    on("addItemBtn",      "click", function () { openScreen("addItemTypeScreen"); });
    on("addItemTypeBack", "click", function () { closeScreen("addItemTypeScreen"); });
    on("chooseGift",      "click", function () { resetGiftForm();   closeScreen("addItemTypeScreen"); openScreen("addGiftScreen"); });
    on("choosePrefix",    "click", function () { resetPrefixForm(); closeScreen("addItemTypeScreen"); openScreen("addPrefixScreen"); });
    on("addGiftBack",     "click", function () { closeScreen("addGiftScreen");   openScreen("addItemTypeScreen"); });
    on("addPrefixBack",   "click", function () { closeScreen("addPrefixScreen"); openScreen("addItemTypeScreen"); });

    on("giftPhotoUpload", "click", function () {
        const f = document.getElementById("giftPhotoFile");
        if (f) f.click();
    });

    on("giftPhotoFile", "change", function (e) {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function (ev) {
            const preview = document.getElementById("giftPhotoPreview");
            preview.src = ev.target.result;
            preview.style.display = "block";
            document.getElementById("giftPhotoUpload").style.display = "none";
        };
        reader.readAsDataURL(file);
    });

    on("prefixText", "input", function (e) {
        document.getElementById("prefixPreviewText").textContent = e.target.value || "VIP";
    });
    on("prefixColor", "input", function (e) {
        document.getElementById("prefixColorVal").textContent    = e.target.value;
        document.getElementById("prefixPreviewText").style.color = e.target.value;
    });

    on("giftSubmit", "click", async function () {
        const errEl = document.getElementById("giftError");
        const name  = document.getElementById("giftName").value.trim();
        errEl.textContent = "";
        if (!name) { errEl.textContent = t("errName"); return; }

        const preview  = document.getElementById("giftPhotoPreview");
        const urlField = document.getElementById("giftPhotoUrl");
        const photo_url = (preview.style.display !== "none" && preview.src.indexOf("data:") === 0)
            ? preview.src
            : (urlField ? urlField.value.trim() : "");

        const ok = await dialog({ title: t("addItemBtn"), text: name, confirmLabel: t("confirm") });
        if (!ok) return;

        try {
            await API.createItem({
                type: "gift", name: name,
                description:  document.getElementById("giftDesc").value.trim(),
                photo_url:    photo_url,
                price_coins:  parseInt(document.getElementById("giftPriceCoins").value)  || 0,
                price_donate: parseInt(document.getElementById("giftPriceDonate").value) || 0,
                stock_total:  parseInt(document.getElementById("giftStock").value)       || 1,
                sellable:     document.getElementById("giftSellable").classList.contains("switch--on")
            });
            closeScreen("addGiftScreen");
            resetGiftForm();
            toast(t("itemAdded"), "success");
            await Promise.all([loadShopItems(), syncRevisions()]);
        } catch (e) {
            const msg = String(e.message || "");
            errEl.textContent = msg.indexOf("409") !== -1 ? t("errDuplicate") : t("errGeneric");
        }
    });

    on("prefixSubmit", "click", async function () {
        const errEl = document.getElementById("prefixError");
        const name  = document.getElementById("prefixName").value.trim();
        const text  = document.getElementById("prefixText").value.trim();
        errEl.textContent = "";
        if (!name) { errEl.textContent = t("errName");   return; }
        if (!text) { errEl.textContent = t("errPrefix"); return; }

        const ok = await dialog({ title: t("addItemBtn"), text: name, confirmLabel: t("confirm") });
        if (!ok) return;

        try {
            await API.createItem({
                type: "prefix", name: name,
                description:  document.getElementById("prefixDesc").value.trim(),
                photo_url: "",
                price_coins:  parseInt(document.getElementById("prefixPriceCoins").value)  || 0,
                price_donate: parseInt(document.getElementById("prefixPriceDonate").value) || 0,
                stock_total:  parseInt(document.getElementById("prefixStock").value)       || 1,
                prefix_text:  text,
                prefix_color: document.getElementById("prefixColor").value,
                sellable:     document.getElementById("prefixSellable").classList.contains("switch--on")
            });
            closeScreen("addPrefixScreen");
            resetPrefixForm();
            toast(t("itemAdded"), "success");
            await loadShopItems();
        } catch (e) {
            const msg = String(e.message || "");
            errEl.textContent = msg.indexOf("409") !== -1 ? t("errDuplicate") : t("errGeneric");
        }
    });
}

/* ── Екран інвентарю ──────────────────────────────────────── */

function initInventoryScreen() {
    const openBtn = document.getElementById("inventoryOpen");
    const screen  = document.getElementById("inventoryScreen");
    if (!openBtn || !screen) return;

    const body = screen.querySelector(".fullscreen__body");
    let grid = body.querySelector(".inv-screen-grid");
    if (!grid) {
        grid = el("div", "inv-screen-grid shop-grid");
        body.appendChild(grid);
    }

    const search = document.getElementById("invSearchInput");
    if (search) search.addEventListener("input", function (e) {
        invFilterState.query = e.target.value;
        renderInventoryInto(grid);
    });

    makeFilter("invFilterBtn", "invFilterDrop");
    document.querySelectorAll("#invFilterDrop input[type=checkbox]").forEach(function (cb) {
        cb.addEventListener("change", function () {
            if (cb.checked) invFilterState.types.add(cb.dataset.type);
            else invFilterState.types.delete(cb.dataset.type);
            renderInventoryInto(grid);
        });
    });

    openBtn.addEventListener("click", function () {
        screen.classList.add("fullscreen--open");
        loadInventory();
    });
    const back = document.getElementById("inventoryBack");
    if (back) back.addEventListener("click", function () { closeScreen("inventoryScreen"); });
}

/* ── Вітрина ──────────────────────────────────────────────── */

function initShowcase() {
    const openBtn = document.getElementById("showcaseOpen");
    const screen  = document.getElementById("showcaseScreen");
    if (!openBtn || !screen) return;

    openBtn.addEventListener("click", function () { screen.classList.add("fullscreen--open"); });
    const back = document.getElementById("showcaseBack");
    if (back) back.addEventListener("click", function () { closeScreen("showcaseScreen"); });

    const add = document.getElementById("showcaseAdd");
    if (add) add.addEventListener("click", function () {
        toast(inventoryItems.length ? t("soonFeature") : t("showcaseNoItems"), "info");
    });

    const save = document.getElementById("showcaseSave");
    if (save) save.addEventListener("click", function () { toast(t("soonFeature"), "info"); });
}

/* ── Видимість у топах ────────────────────────────────────── */

function initTopVisibility() {
    const openBtn = document.getElementById("topVisibilityOpen");
    const screen  = document.getElementById("topVisibilityScreen");
    if (!openBtn || !screen) return;

    openBtn.addEventListener("click", function () { screen.classList.add("fullscreen--open"); });
    const back = document.getElementById("topVisibilityBack");
    if (back) back.addEventListener("click", function () { closeScreen("topVisibilityScreen"); });

    const pick = function (val) {
        topVisSelected = val;
        const p = document.getElementById("visPublic");
        const a = document.getElementById("visAnon");
        if (p) p.classList.toggle("visibility-opt--active", val === "public");
        if (a) a.classList.toggle("visibility-opt--active", val === "anon");
    };
    const p = document.getElementById("visPublic");
    const a = document.getElementById("visAnon");
    if (p) p.addEventListener("click", function () { pick("public"); });
    if (a) a.addEventListener("click", function () { pick("anon"); });

    const save = document.getElementById("visSave");
    if (save) save.addEventListener("click", async function () {
        savePrefs({ topVisibility: topVisSelected });
        try {
            await API.saveSettings({ top_visibility: topVisSelected });
            toast(t("saved"), "success");
        } catch (e) {
            toast(t("savedLocal"), "info");
        }
    });
}

/* ── Документація ─────────────────────────────────────────── */

function initDocsScreen() {
    const o = document.getElementById("docsOpen");
    const b = document.getElementById("docsBack");
    if (o) o.addEventListener("click", function () { openScreen("docsScreen"); });
    if (b) b.addEventListener("click", function () { closeScreen("docsScreen"); });
}

/** Застосовує стан видимості з сервера (щоб UI не розходився з БД). */
function applyServerVisibility(value) {
    if (value !== "public" && value !== "anon") return;
    topVisSelected = value;
    const p = document.getElementById("visPublic");
    const a = document.getElementById("visAnon");
    if (p) p.classList.toggle("visibility-opt--active", value === "public");
    if (a) a.classList.toggle("visibility-opt--active", value === "anon");
}

/* ══════════════════════════════════════════════════════════════
   Взаємодія з предметами в інвентарі
   ══════════════════════════════════════════════════════════════ */

let selectedInvItem = null;

function openInvItem(item) {
    selectedInvItem = item;

    // Медіа: фото, плейсхолдер або префікс — одна логіка для обох типів
    const media = document.getElementById("invItemHero");
    if (media) fillItemHero(media, item);

    document.getElementById("invItemName").textContent = item.name;
    document.getElementById("invItemType").textContent =
        item.type === "prefix" ? t("typePrefix") : t("typeGift");
    document.getElementById("invItemDesc").textContent = item.description || "";

    // Заборона діє ТІЛЬКИ коли сервер явно сказав 0.
    // Якщо поля немає взагалі (старіший бекенд ще не оновлено) —
    // вважаємо предмет продаваним, інакше кнопка зникала б у всіх.
    const sellableFlag = !(item.sellable === 0 || item.sellable === "0" || item.sellable === false);

    const backCoins  = Math.floor((item.price_coins  || 0) / 2);
    const backDonate = Math.floor((item.price_donate || 0) / 2);
    const parts = [];
    if (backCoins)  parts.push(backCoins  + " " + t("coinsShort"));
    if (backDonate) parts.push(backDonate + " " + t("donateShort"));

    // Навіть якщо повернення 0 (дешевий предмет) — продати можна,
    // просто без нотатки про суму.
    const canSell = sellableFlag;

    const note  = document.getElementById("invItemSellNote");
    const badge = document.getElementById("invItemBadge");
    const sellBtn = document.getElementById("invSellBtn");

    if (canSell) {
        note.textContent  = parts.length ? t("sellNote") + ": " + parts.join(" + ") : "";
        badge.textContent = "";
        badge.className   = "inv-sheet__badge";
        sellBtn.style.display = "flex";
    } else {
        note.textContent  = "";
        badge.textContent = t("notSellable");
        badge.className   = "inv-sheet__badge inv-sheet__badge--locked";
        sellBtn.style.display = "none";
    }

    document.getElementById("invItemModal").classList.add("item-detail-modal--open");
    document.getElementById("invItemBackdrop").classList.add("modal-backdrop--open");
}

function closeInvItem() {
    const m = document.getElementById("invItemModal");
    const b = document.getElementById("invItemBackdrop");
    if (m) m.classList.remove("item-detail-modal--open");
    if (b) b.classList.remove("modal-backdrop--open");
}

function initInvItemModal() {
    const close = function () { closeInvItem(); selectedInvItem = null; };
    const c = document.getElementById("invItemClose");
    const b = document.getElementById("invItemBackdrop");
    if (c) c.addEventListener("click", close);
    if (b) b.addEventListener("click", close);

    const sell = document.getElementById("invSellBtn");
    if (sell) sell.addEventListener("click", async function () {
        const item = selectedInvItem;
        if (!item) return;

        const backCoins  = Math.floor((item.price_coins  || 0) / 2);
        const backDonate = Math.floor((item.price_donate || 0) / 2);
        const parts = [];
        if (backCoins)  parts.push(backCoins  + " " + t("coinsShort"));
        if (backDonate) parts.push(backDonate + " " + t("donateShort"));

        const ok = await dialog({
            title: t("sellItem"),
            text:  item.name + "\n" + t("sellNote") + ": " + parts.join(" + "),
            confirmLabel: t("sellConfirm")
        });
        if (!ok) return;

        try {
            const r = await API.sellInventoryItem(item.inv_id);
            closeInvItem();
            selectedInvItem = null;
            syncBalance(r.balance);
            toast(t("sold"), "success");
            await Promise.all([loadInventory(), loadShopItems(), syncRevisions()]);
        } catch (e) {
            toast(t("errSell"), "error");
        }
    });

    const drop = document.getElementById("invDropBtn");
    if (drop) drop.addEventListener("click", async function () {
        const item = selectedInvItem;
        if (!item) return;

        const ok = await dialog({
            title: t("dropItem"),
            text:  item.name + "\n" + t("dropWarn"),
            confirmLabel: t("dropConfirm")
        });
        if (!ok) return;

        try {
            await API.dropInventoryItem(item.inv_id);
            closeInvItem();
            selectedInvItem = null;
            toast(t("dropped"), "info");
            await Promise.all([loadInventory(), loadShopItems(), syncRevisions()]);
        } catch (e) {
            toast(t("errGeneric"), "error");
        }
    });
}

/* ══════════════════════════════════════════════════════════════
   Автооновлення магазину (легкий polling)
   ══════════════════════════════════════════════════════════════ */

let revShop  = null;
let revAdmin = null;
let pollTimer = null;

/**
 * Легкий polling: сервер повертає лише два лічильники.
 * Порівнюємо — якщо змінились, перезавантажуємо саме те, що змінилось.
 * Свої власні дії оновлюють екран одразу (не чекаючи наступного тику),
 * а лічильники синхронізуються, щоб не було подвійного перезавантаження.
 */
async function pollRevisions() {
    if (document.hidden) return;
    try {
        const d = await API.getShopVersion();

        if (revShop === null) { revShop = d.shop; revAdmin = d.admin; return; }

        if (d.shop !== revShop) {
            revShop = d.shop;
            await loadShopItems();
            // Інвентар оновлюємо лише якщо він зараз на екрані
            const invOpen = document.getElementById("invContainer");
            const invVisible = invOpen && invOpen.style.display !== "none";
            const screenOpen = document.getElementById("inventoryScreen");
            if (invVisible || (screenOpen && screenOpen.classList.contains("fullscreen--open"))) {
                await loadInventory();
            }
        }

        if (d.admin !== revAdmin) {
            revAdmin = d.admin;
            // Права могли змінитись — перечитуємо профіль,
            // щоб панель адміна з'явилась/зникла без перезаходу
            await loadFromServer();
            const listOpen = document.getElementById("adminListScreen");
            if (listOpen && listOpen.classList.contains("fullscreen--open")
                && typeof loadAdmins === "function") {
                await loadAdmins();
            }
        }
    } catch (e) { /* тихо — наступна спроба за 3с */ }
}

/** Після власної дії — синхронізуємо лічильники, щоб не тягнути дані двічі. */
async function syncRevisions() {
    try {
        const d = await API.getShopVersion();
        revShop = d.shop;
        revAdmin = d.admin;
    } catch (e) { /* ігноруємо */ }
}

function startShopPolling() {
    if (pollTimer) clearInterval(pollTimer);
    // 3 секунди — запит тепер майже безкоштовний (два числа з пам'яті)
    pollTimer = setInterval(pollRevisions, 3000);

    document.addEventListener("visibilitychange", function () {
        if (!document.hidden) pollRevisions();
    });
}
