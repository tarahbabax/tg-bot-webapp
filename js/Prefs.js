/**
 * prefs.js — збереження та відновлення налаштувань користувача
 * (тема, анімації, свічення, видимість у топах)
 */

const PREFS_KEY = "app_prefs";

function loadPrefs() {
    try { return JSON.parse(localStorage.getItem(PREFS_KEY) || "{}"); }
    catch { return {}; }
}

function savePrefs(obj) {
    const current = loadPrefs();
    localStorage.setItem(PREFS_KEY, JSON.stringify({ ...current, ...obj }));
}

function setTheme(theme) {
    document.body.dataset.theme = theme;
    savePrefs({ theme });
    const sw = document.getElementById("themeSwitch");
    if (sw) {
        sw.classList.toggle("switch--on", theme === "dark");
        sw.setAttribute("aria-checked", String(theme === "dark"));
    }
}

function applyPrefsOnLoad() {
    const p = loadPrefs();
    if (p.theme === "light") setTheme("light");
    if (p.noAnim)  document.body.classList.add("no-anim");
    if (p.noOrbs)  document.body.classList.add("orbs-off");
    if (p.topVisibility) {
        const pub  = document.getElementById("visPublic");
        const anon = document.getElementById("visAnon");
        if (pub && anon) {
            pub.classList.toggle("visibility-opt--active",  p.topVisibility === "public");
            anon.classList.toggle("visibility-opt--active", p.topVisibility === "anon");
        }
    }
}

function initTheme() {
    document.getElementById("themeToggle")?.addEventListener("click", () => {
        setTheme(document.body.dataset.theme === "dark" ? "light" : "dark");
    });
}

function initSwitchesAndToggles() {
    document.querySelectorAll(".switch").forEach((sw) => {
        sw.addEventListener("click", () => {
            const isOn = sw.classList.toggle("switch--on");
            sw.setAttribute("aria-checked", String(isOn));
            if (sw.id === "themeSwitch") setTheme(isOn ? "dark" : "light");
            if (sw.id === "orbsSwitch")  { document.body.classList.toggle("orbs-off", !isOn); savePrefs({ noOrbs: !isOn }); }
            if (sw.id === "animSwitch")  { document.body.classList.toggle("no-anim",  !isOn); savePrefs({ noAnim:  !isOn }); }
        });
    });
}
