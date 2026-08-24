/**
 * shop.js — магазин, інвентар, вітрина, видимість у топах
 */

let shopItems    = [];
let selectedItem = null; // весь об'єкт товару, а не тільки id

// ─── Допоміжні функції ─────────────────────────────────────────────────────

function buildItemCard(item) {
    const el = document.createElement("div");
    if (item.type === "gift") {
        el.className = "shop-item-gift";
        el.innerHTML = `
            <div style="position:relative;overflow:hidden;">
                ${item.photo_url
                    ? `<img class="shop-item-gift__img" src="${item.photo_url}" alt="${item.name}" loading="lazy">`
                    : `<div class="shop-item-gift__img-placeholder">
                            <svg viewBox="0 0 24 24" fill="none">
                                <path d="M20 12v9H4v-9M22 7H2v5h20V7zM12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z"
                                    stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
                            </svg>
                       </div>`}
                ${item.stock_left <= 0 ? `<span class="item-out-badge">Закінчився</span>` : ""}
            </div>
            <div class="shop-item-gift__body">
                <span class="shop-item-gift__stock">${item.stock_left}/${item.stock_total}</span>
                <p class="shop-item-gift__name">${item.name}</p>
                <p class="shop-item-gift__type">Подарунок</p>
                <p class="shop-item-gift__price">${item.price_coins} коінів</p>
            </div>`;
    } else {
        el.className = "shop-item-prefix";
        el.innerHTML = `
            <span class="shop-item-prefix__tag" style="color:${item.prefix_color || "#fff"}">${item.prefix_text}</span>
            <span class="shop-item-prefix__body">
                <span class="shop-item-prefix__name">${item.name}</span>
                <span class="shop-item-prefix__price">${item.price_coins} коінів</span>
            </span>
            ${item.stock_left <= 0 ? `<span class="item-out-badge" style="position:static;border-radius:8px;">Закінчився</span>` : ""}`;
    }
    if (item.stock_left <= 0) el.classList.add(item.type === "gift" ? "shop-item-gift--out" : "shop-item-prefix--out");
    return el;
}

// ─── Рендер магазину ────────────────────────────────────────────────────────

function renderShopItems(items) {
    const grid  = document.getElementById("shopGrid");
    const empty = document.getElementById("shopEmptyState");
    if (!grid) return;

    // Видаляємо всі картки, але лишаємо #shopEmptyState
    Array.from(grid.children).forEach((c) => { if (c.id !== "shopEmptyState") c.remove(); });

    if (!items.length) {
        if (empty) empty.style.display = "";
        return;
    }
    if (empty) empty.style.display = "none";

    items.forEach((item) => {
        const card = buildItemCard(item);
        card.addEventListener("click", () => openItemDetail(item));
        grid.appendChild(card);
    });
}

async function loadShopItems() {
    try {
        const data = await API.getShopItems();
        shopItems = data.items || [];
        if (data.is_admin) currentAdminLevel = 5;
        renderShopItems(shopItems);
    } catch (e) {
        console.warn("loadShopItems:", e.message);
    }
}

// ─── Деталі товару (нижня шторка) ──────────────────────────────────────────

function openItemDetail(item) {
    selectedItem = item;
    const modal   = document.getElementById("itemDetailModal");
    const backdrop = document.getElementById("itemDetailBackdrop");

    // Фото або префікс
    const imgEl = document.getElementById("itemDetailImg");
    const preEl = document.getElementById("itemDetailPrefix");
    imgEl.style.display = "none";
    preEl.style.display = "none";

    if (item.type === "gift" && item.photo_url) {
        imgEl.src = item.photo_url;
        imgEl.style.display = "block";
    } else if (item.type === "prefix") {
        preEl.textContent   = item.prefix_text;
        preEl.style.color   = item.prefix_color || "#fff";
        preEl.style.display = "block";
    }

    document.getElementById("itemDetailName").textContent  = item.name;
    document.getElementById("itemDetailDesc").textContent  = item.description || "";
    document.getElementById("itemDetailCoins").textContent = `${item.price_coins} коінів`;
    document.getElementById("itemDetailDonate").textContent = `${item.price_donate} донат`;
    document.getElementById("itemDetailStock").textContent  = `Залишилось: ${item.stock_left} з ${item.stock_total}`;

    const isOut   = item.stock_left <= 0;
    const isAdmin = currentAdminLevel >= 5;

    const buyCoins   = document.getElementById("buyCoinsBtn");
    const buyDonate  = document.getElementById("buyDonateBtn");
    const deleteBtn  = document.getElementById("deleteItemBtn");
    const restockBtn = document.getElementById("restockItemBtn");

    if (isAdmin && isOut) {
        // Закінчився — адмін бачить тільки restock і delete
        buyCoins.style.display   = "none";
        buyDonate.style.display  = "none";
        restockBtn.style.display = "block";
        deleteBtn.style.display  = "block";
    } else if (isAdmin) {
        // Є в наявності — адмін може і купити, і керувати
        buyCoins.style.display   = "block";
        buyDonate.style.display  = "block";
        buyCoins.disabled        = false;
        buyDonate.disabled       = false;
        restockBtn.style.display = "block";
        deleteBtn.style.display  = "block";
    } else {
        // Звичайний юзер
        buyCoins.style.display   = "block";
        buyDonate.style.display  = "block";
        buyCoins.disabled        = isOut;
        buyDonate.disabled       = isOut;
        restockBtn.style.display = "none";
        deleteBtn.style.display  = "none";
    }

    modal.classList.add("item-detail-modal--open");
    backdrop.classList.add("modal-backdrop--open");
}

function closeItemDetail() {
    document.getElementById("itemDetailModal")?.classList.remove("item-detail-modal--open");
    document.getElementById("itemDetailBackdrop")?.classList.remove("modal-backdrop--open");
    // selectedItem скидаємо окремо — тільки після завершення дії
}

// ─── Підтвердження ─────────────────────────────────────────────────────────

let _confirmController = null;

function openConfirm(text, onYes) {
    document.getElementById("confirmText").textContent = text;
    document.getElementById("confirmBackdrop").classList.add("modal-backdrop--open");
    document.getElementById("confirmModal").classList.add("win-modal--open");

    if (_confirmController) _confirmController.abort();
    _confirmController = new AbortController();

    document.getElementById("confirmYes").addEventListener("click", () => {
        closeConfirm();
        onYes();
    }, { once: true, signal: _confirmController.signal });
}

function closeConfirm() {
    document.getElementById("confirmBackdrop").classList.remove("modal-backdrop--open");
    document.getElementById("confirmModal").classList.remove("win-modal--open");
}

// ─── Інвентар ──────────────────────────────────────────────────────────────

async function loadInventoryScreen() {
    const screen = document.getElementById("inventoryScreen");
    if (!screen) return;
    const body = screen.querySelector(".fullscreen__body");

    let grid = body.querySelector(".inv-screen-grid");
    if (!grid) {
        grid = document.createElement("div");
        grid.className = "inv-screen-grid shop-grid";
        body.appendChild(grid);
    }
    grid.innerHTML = `<p style="grid-column:1/-1;text-align:center;color:var(--muted);padding:20px">Завантаження...</p>`;

    try {
        const data = await API.getInventory();
        grid.innerHTML = "";
        if (!data.items?.length) {
            grid.innerHTML = `<div class="shop-empty">
                <p class="empty-state__title">Інвентар порожній</p>
                <p class="empty-state__text">Придбай предмети у магазині</p>
            </div>`;
            return;
        }
        data.items.forEach((item) => grid.appendChild(buildItemCard(item)));
    } catch (e) {
        grid.innerHTML = `<div class="shop-empty"><p class="empty-state__title">Помилка завантаження</p></div>`;
    }
}

// Версія для вкладки "Мої предмети" всередині магазину
function renderInventory(items) {
    const container = document.getElementById("invContainer");
    if (!container) return;
    container.innerHTML = "";
    if (!items?.length) {
        container.innerHTML = `<div class="shop-empty">
            <p class="empty-state__title">Інвентар порожній</p>
            <p class="empty-state__text">Придбай предмети у магазині</p>
        </div>`;
        return;
    }
    items.forEach((item) => container.appendChild(buildItemCard(item)));
}

async function loadInventory() {
    try {
        const data = await API.getInventory();
        renderInventory(data.items || []);
    } catch (e) {
        console.warn("loadInventory:", e.message);
    }
}

// ─── Ініціалізація ─────────────────────────────────────────────────────────

function initShop() {
    // Вкладки магазину
    const shopGrid     = document.getElementById("shopGrid");
    const invContainer = document.createElement("div");
    invContainer.id        = "invContainer";
    invContainer.className = "shop-grid";
    invContainer.style.display = "none";
    shopGrid?.parentNode.insertBefore(invContainer, shopGrid.nextSibling);

    document.querySelectorAll(".shop-tab").forEach((tab, i) => {
        tab.addEventListener("click", () => {
            document.querySelectorAll(".shop-tab").forEach((t) => t.classList.remove("shop-tab--active"));
            tab.classList.add("shop-tab--active");
            if (i === 0) {
                shopGrid.style.display  = "";
                invContainer.style.display = "none";
            } else if (i === 1) {
                shopGrid.style.display  = "none";
                invContainer.style.display = "";
                loadInventory();
            } else {
                shopGrid.style.display  = "none";
                invContainer.style.display = "none";
            }
        });
    });

    // Фільтр магазину
    makeFilter("shopFilterBtn", "shopFilterDrop");

    // Закрити деталь
    document.getElementById("itemDetailClose")?.addEventListener("click",    () => { closeItemDetail(); selectedItem = null; });
    document.getElementById("itemDetailBackdrop")?.addEventListener("click", () => { closeItemDetail(); selectedItem = null; });
    document.getElementById("confirmBackdrop")?.addEventListener("click", closeConfirm);
    document.getElementById("confirmNo")?.addEventListener("click", closeConfirm);

    // Купівля
    async function doBuy(currency) {
        const item = selectedItem;
        if (!item) return;
        try {
            const r = await API.buyItem(item.item_id, currency);
            closeItemDetail();
            selectedItem = null;
            syncBalance(r.balance);
            await loadShopItems();
            await loadInventory();
            await loadInventoryScreen();
        } catch (e) {
            const msg = e.message || "";
            alert(msg.includes("Недостатньо") || msg.includes("400") || msg.includes("закінчився")
                ? "Недостатньо коштів або товар закінчився"
                : "Помилка покупки: " + msg);
        }
    }
    document.getElementById("buyCoinsBtn")?.addEventListener("click",  () => doBuy("coins"));
    document.getElementById("buyDonateBtn")?.addEventListener("click", () => doBuy("donate"));

    // Видалення
    document.getElementById("deleteItemBtn")?.addEventListener("click", () => {
        const item = selectedItem;
        if (!item) return;
        openConfirm("Видалити цей предмет?\nКуплені екземпляри залишаться в інвентарях.", async () => {
            try {
                await API.deleteItem(item.item_id);
                closeItemDetail();
                selectedItem = null;
                await loadShopItems();
            } catch (e) {
                alert("Помилка видалення: " + (e.message || ""));
            }
        });
    });

    // Поповнення
    document.getElementById("restockItemBtn")?.addEventListener("click", () => {
        const item = selectedItem;
        if (!item) return;
        const raw = prompt("Скільки одиниць додати?");
        if (raw === null) return;
        const amount = parseInt(raw);
        if (!amount || amount <= 0) { alert("Вкажи число більше 0"); return; }
        openConfirm(`Додати ${amount} одиниць до «${item.name}»?`, async () => {
            try {
                await API.restockItem(item.item_id, amount);
                closeItemDetail();
                selectedItem = null;
                await loadShopItems();
            } catch (e) {
                alert("Помилка поповнення: " + (e.message || ""));
            }
        });
    });

    // Адмін: вибір типу предмету
    document.getElementById("addItemBtn")?.addEventListener("click", ()  => openScreen("addItemTypeScreen"));
    document.getElementById("addItemTypeBack")?.addEventListener("click", () => closeScreen("addItemTypeScreen"));
    document.getElementById("chooseGift")?.addEventListener("click", () => {
        closeScreen("addItemTypeScreen");
        openScreen("addGiftScreen");
    });
    document.getElementById("choosePrefix")?.addEventListener("click", () => {
        closeScreen("addItemTypeScreen");
        openScreen("addPrefixScreen");
    });

    // Форма подарунку
    document.getElementById("giftPhotoUpload")?.addEventListener("click", () =>
        document.getElementById("giftPhotoFile")?.click()
    );
    document.getElementById("giftPhotoFile")?.addEventListener("change", (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const preview = document.getElementById("giftPhotoPreview");
            const upload  = document.getElementById("giftPhotoUpload");
            preview.src = ev.target.result;
            preview.style.display = "block";
            upload.style.display  = "none";
        };
        reader.readAsDataURL(file);
    });

    document.getElementById("addGiftBack")?.addEventListener("click", () => {
        closeScreen("addGiftScreen");
        openScreen("addItemTypeScreen");
    });

    document.getElementById("giftSubmit")?.addEventListener("click", () => {
        const name = document.getElementById("giftName").value.trim();
        if (!name) { document.getElementById("giftError").textContent = "Вкажи назву"; return; }

        const preview  = document.getElementById("giftPhotoPreview");
        const urlField = document.getElementById("giftPhotoUrl");
        const photo_url = (preview?.style.display !== "none" && preview?.src && !preview.src.endsWith(window.location.href))
            ? preview.src
            : (urlField?.value?.trim() || "");

        const data = {
            type: "gift",
            name,
            description: document.getElementById("giftDesc").value.trim(),
            photo_url,
            price_coins:  parseInt(document.getElementById("giftPriceCoins").value)  || 0,
            price_donate: parseInt(document.getElementById("giftPriceDonate").value) || 0,
            stock_total:  parseInt(document.getElementById("giftStock").value)        || 1,
        };

        openConfirm(`Додати «${name}» до магазину?`, async () => {
            try {
                await API.createItem(data);
                closeScreen("addGiftScreen");
                // Скидаємо форму
                ["giftName","giftDesc","giftPriceCoins","giftPriceDonate","giftStock"].forEach((id) => {
                    const el = document.getElementById(id);
                    if (el) el.value = "";
                });
                document.getElementById("giftPhotoPreview").style.display = "none";
                document.getElementById("giftPhotoUpload").style.display  = "";
                document.getElementById("giftError").textContent = "";
                await loadShopItems();
            } catch (e) {
                const msg = e.message || "";
                document.getElementById("giftError").textContent =
                    msg.includes("409") || msg.includes("вже існує")
                        ? "Товар з такою назвою вже є в магазині"
                        : "Помилка: " + msg;
            }
        });
    });

    // Форма префіксу
    document.getElementById("addPrefixBack")?.addEventListener("click", () => {
        closeScreen("addPrefixScreen");
        openScreen("addItemTypeScreen");
    });
    document.getElementById("prefixText")?.addEventListener("input", (e) => {
        document.getElementById("prefixPreviewText").textContent = e.target.value || "VIP";
    });
    document.getElementById("prefixColor")?.addEventListener("input", (e) => {
        const c = e.target.value;
        document.getElementById("prefixColorVal").textContent          = c;
        document.getElementById("prefixPreviewText").style.color       = c;
    });

    document.getElementById("prefixSubmit")?.addEventListener("click", () => {
        const name = document.getElementById("prefixName").value.trim();
        const text = document.getElementById("prefixText").value.trim();
        if (!name) { document.getElementById("prefixError").textContent = "Вкажи назву"; return; }
        if (!text) { document.getElementById("prefixError").textContent = "Вкажи текст префіксу"; return; }

        const data = {
            type: "prefix",
            name,
            description:  document.getElementById("prefixDesc").value.trim(),
            photo_url:    "",
            price_coins:  parseInt(document.getElementById("prefixPriceCoins").value)  || 0,
            price_donate: parseInt(document.getElementById("prefixPriceDonate").value) || 0,
            stock_total:  parseInt(document.getElementById("prefixStock").value)        || 1,
            prefix_text:  text,
            prefix_color: document.getElementById("prefixColor").value,
        };

        openConfirm(`Додати префікс «${text}» до магазину?`, async () => {
            try {
                await API.createItem(data);
                closeScreen("addPrefixScreen");
                ["prefixName","prefixDesc","prefixText","prefixPriceCoins","prefixPriceDonate","prefixStock"].forEach((id) => {
                    const el = document.getElementById(id);
                    if (el) el.value = "";
                });
                document.getElementById("prefixError").textContent = "";
                await loadShopItems();
            } catch (e) {
                const msg = e.message || "";
                document.getElementById("prefixError").textContent =
                    msg.includes("409") || msg.includes("вже існує")
                        ? "Товар з такою назвою вже є"
                        : "Помилка: " + msg;
            }
        });
    });

    // Інвентар (з профілю)
    const invOpenBtn = document.getElementById("inventoryOpen");
    const invBackBtn = document.getElementById("inventoryBack");
    const invScreen  = document.getElementById("inventoryScreen");
    if (invOpenBtn) {
        makeFilter("invFilterBtn", "invFilterDrop");
        invOpenBtn.addEventListener("click", () => {
            invScreen?.classList.add("fullscreen--open");
            loadInventoryScreen();
        });
        invBackBtn?.addEventListener("click", () => {
            invScreen?.classList.remove("fullscreen--open");
            snapScreensToActiveTab();
        });
    }

    // Вітрина
    const showcaseOpenBtn = document.getElementById("showcaseOpen");
    const showcaseBackBtn = document.getElementById("showcaseBack");
    const showcaseScreen  = document.getElementById("showcaseScreen");
    showcaseOpenBtn?.addEventListener("click", () => showcaseScreen?.classList.add("fullscreen--open"));
    showcaseBackBtn?.addEventListener("click", () => {
        showcaseScreen?.classList.remove("fullscreen--open");
        snapScreensToActiveTab();
    });

    // Топи
    const topVisOpenBtn = document.getElementById("topVisibilityOpen");
    const topVisBackBtn = document.getElementById("topVisibilityBack");
    const topVisScreen  = document.getElementById("topVisibilityScreen");
    let topVisSelected  = "public";

    topVisOpenBtn?.addEventListener("click", () => {
        document.getElementById("visResult").textContent = "";
        topVisScreen?.classList.add("fullscreen--open");
    });
    topVisBackBtn?.addEventListener("click", () => {
        topVisScreen?.classList.remove("fullscreen--open");
        snapScreensToActiveTab();
    });

    function pickTopVis(val) {
        topVisSelected = val;
        document.getElementById("visPublic")?.classList.toggle("visibility-opt--active", val === "public");
        document.getElementById("visAnon")?.classList.toggle("visibility-opt--active",   val === "anon");
    }
    document.getElementById("visPublic")?.addEventListener("click", () => pickTopVis("public"));
    document.getElementById("visAnon")?.addEventListener("click",   () => pickTopVis("anon"));
    document.getElementById("visSave")?.addEventListener("click", async () => {
        const resultEl = document.getElementById("visResult");
        savePrefs({ topVisibility: topVisSelected });
        try {
            await API.saveSettings({ top_visibility: topVisSelected });
            resultEl.textContent = "✓ Збережено";
            resultEl.style.color = "var(--teal)";
        } catch {
            resultEl.textContent = "✓ Збережено (локально)";
            resultEl.style.color = "var(--teal)";
        }
    });

    // Завантажуємо товари
    loadShopItems();
}

function initDocsScreen() {
    const openBtn = document.getElementById("docsOpen");
    const backBtn = document.getElementById("docsBack");
    const screen  = document.getElementById("docsScreen");
    if (!openBtn) return;
    openBtn.addEventListener("click", () => screen?.classList.add("fullscreen--open"));
    backBtn?.addEventListener("click", () => {
        screen?.classList.remove("fullscreen--open");
        snapScreensToActiveTab();
    });
}
