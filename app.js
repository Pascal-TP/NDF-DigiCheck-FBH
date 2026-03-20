let currentUser = null;
document.documentElement.classList.add("js");
function isLoggedIn() {
    return !!auth.currentUser;
}

function lockAppUI() {
    document.body.classList.add("app-locked");
}

function unlockAppUI() {
    document.body.classList.remove("app-locked");
}

let logoutTimer;
let remaining = 600;
//let fraesenHinweisGezeigt = false;
//let fraesenVerwendet = false;
//let page40Promise = null;


// -----------------------------
// Startbild wechselt nach 3 Sekunden
// -----------------------------

function startSplashScreen() {
    setTimeout(() => {
        showPage("page-login");
    }, 3000);
}

// -----------------------------
// Hinweistexte in eigenen Hinweisfenster
// -----------------------------

function showHinweis(text) {

    const modal = document.getElementById("hinweisModal");
    const textBox = document.getElementById("hinweisText");
    const okBtn = document.getElementById("hinweisOk");
    const cancelBtn = document.getElementById("hinweisCancel");

    textBox.innerText = text;

    cancelBtn.style.display = "none";   // Abbrechen ausblenden
    okBtn.onclick = closeHinweis;

    modal.style.display = "block";
}

function closeHinweis() {
    document.getElementById("hinweisModal").style.display = "none";
}

function showConfirm(text, onOk) {

    const modal = document.getElementById("hinweisModal");
    const textBox = document.getElementById("hinweisText");
    const okBtn = document.getElementById("hinweisOk");
    const cancelBtn = document.getElementById("hinweisCancel");

    textBox.innerText = text;

    cancelBtn.style.display = "inline-block"; // Abbrechen anzeigen

    okBtn.onclick = () => {
        modal.style.display = "none";
        if (typeof onOk === "function") onOk();
    };

    cancelBtn.onclick = () => {
        modal.style.display = "none";
    };

    modal.style.display = "block";
}

window.showHinweis = showHinweis;
window.closeHinweis = closeHinweis;
window.showConfirm = showConfirm;


// -----------------------------
// Bei Reload (F5) Eingabefelder auf 0 setzen
// -----------------------------

function resetStoredInputsOnReload() {
    // Reload erkennen (F5 / Browser-Reload)
    const nav = performance.getEntriesByType("navigation")[0];
    const isReload = nav && nav.type === "reload";

    if (!isReload) return;

    // fraesenVerwendet = false;
    // fraesenHinweisGezeigt = false;

    // Nur deine Eingabe-/Angebotsdaten löschen (Auth bleibt erhalten!)
    const keysToRemove = [
        "page5Data",
        "angebotTyp",
        //  "angebotSummen",
        //   "page14Data",
        //  "page142Data",
        //  "page8Data",
        //   "page18Data",
        //   "page20Data",
        //   "page21Data",
        //  "page22Data",
        //   "page9Data",
        //   "page10Data",
        //  "page23Data",
        //  "page24Data"
    ];

    keysToRemove.forEach(k => localStorage.removeItem(k));
}

// SOFORT ausführen (möglichst früh)
resetStoredInputsOnReload();

// -----------------------------
// Drop-down Menü
// -----------------------------

function handleUserAction(val) {
    if (!val) return;

    // ✅ Navigationseinträge
    if (val.startsWith("nav:")) {
        const pageId = val.replace("nav:", "");
        showPage(pageId);
        const sel = document.getElementById("user-action-select");
        if (sel) sel.value = "";
        return;
    }

    // bestehende Aktionen
    if (val === "changePw") goToChange();
    if (val === "clear") {
        showConfirm("Alle Eingaben wirklich löschen?", () => {
            clearInputs();
        });
    }
    if (val === "logout") logout();

    // zurücksetzen, damit man die gleiche Aktion nochmal wählen kann
    const sel = document.getElementById("user-action-select");
    if (sel) sel.value = "";
}
window.handleUserAction = handleUserAction;


// -----------------------------
// Firebase - E-Mail+Passwort
// -----------------------------

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
    getAuth,
    signInWithEmailAndPassword,
    sendPasswordResetEmail,
    updatePassword,
    signOut,
    onAuthStateChanged,
    setPersistence,
    browserSessionPersistence,
    createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

import {
    getFirestore,
    addDoc,
    collection,
    serverTimestamp,
    doc,
    setDoc,
    getDoc,
    updateDoc,
    query,
    where,
    getDocs
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDO8sb2v488jel3LuLCsE7-t40Rhf-aoT0",
    authDomain: "ndf-digicheck-fbh.firebaseapp.com",
    projectId: "ndf-digicheck-fbh",
    storageBucket: "ndf-digicheck-fbh.firebasestorage.app",
    messagingSenderId: "165203818651",
    appId: "1:165203818651:web:4a5b72bb52a4b283786e3e",
    measurementId: "G-6S2XTBJRYJ"
};

const fbApp = initializeApp(firebaseConfig);
const auth = getAuth(fbApp);
(async () => {
    // 1) Persistenz: nichts im Browser behalten
    await setPersistence(auth, browserSessionPersistence);

    // 2) EINMALIGER Cleanup: falls noch eine alte Session (local) rumliegt, abmelden
    // (nachdem du das einmal deployed hast, ist es danach dauerhaft sauber)
    // await signOut(auth);

    // 3) Listener erst DANACH
    const app = document.getElementById("app");
    onAuthStateChanged(auth, user => {
        currentUser = user || null;

        const actions = document.getElementById("user-actions");
        const info = document.getElementById("login-info");

        if (user) {
            // UI
            actions?.classList.remove("hidden");
            if (info) info.innerText = "Angemeldet als: " + user.email;
            updateAdminUI_();

            // direkt ins Tool (ohne Splash)
            const target = getInitialPage(); // oder dein lastPage-Mechanismus
            history.replaceState({ page: target }, "", "#" + target);
            showPage(target, true);

        } else {
            // UI
            actions?.classList.add("hidden");
            if (info) info.innerText = "";
            updateAdminUI_();

            // Splash zeigen und dann zum Login
            showPage("page-start", true);
            startSplashScreen();
        }

        // App sichtbar machen
        app?.classList.remove("hidden");
    });
})();

const db = getFirestore(fbApp);

// -----------------------------
// Admin-Liste
// -----------------------------
const ADMIN_EMAILS = [
    "pascal.gasch@tpholding.de",
    "marcel.zens@tpholding.de",
    "julian.kniep@tga-nord.de"
];

function isAdminUser() {
    const email = (auth.currentUser?.email || "").toLowerCase();
    return ADMIN_EMAILS.includes(email);
}

// -----------------------------
// allgemeine Hinweise-Checkbox Gate (Login + Registrierung)
// (ohne Persistenz: nach Reload wieder leer, Haken frei entfernbar)
// -----------------------------

function isPrivacyAccepted() {
    const cb1 = document.getElementById("chkPrivacyAck");
    const cb2 = document.getElementById("chkPrivacyAck2");
    return !!(cb1?.checked || cb2?.checked);
}

function updateAuthButtons() {
    const ok = isPrivacyAccepted();

    const btnLogin = document.getElementById("btnLogin");
    const btnRegisterSend = document.getElementById("btnRegisterSend");

    // NICHT disabled setzen -> sonst kein Klick -> keine Fehlermeldung
    btnLogin?.classList.toggle("btn-disabled", !ok);
    btnRegisterSend?.classList.toggle("btn-disabled", !ok);
}

document.addEventListener("DOMContentLoaded", () => {
    const cb1 = document.getElementById("chkPrivacyAck");
    const cb2 = document.getElementById("chkPrivacyAck2");

    cb1?.addEventListener("change", updateAuthButtons);
    cb2?.addEventListener("change", updateAuthButtons);

    // Startzustand: ohne Haken
    if (cb1) cb1.checked = false;
    if (cb2) cb2.checked = false;

    updateAuthButtons();
});

// -----------------------------
// Registrierung anlegen (mit Zufallspasswort)
// -----------------------------

function makeTempPassword(len = 18) {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@$%*-_";
    let out = "";
    for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
    return out;
}

async function registerRequest() {
    const err = document.getElementById("reg-error");
    const info = document.getElementById("reg-info");
    if (err) err.innerText = "";
    if (info) info.innerText = "";

    const firma = (document.getElementById("reg-firma")?.value || "").trim();
    const name = (document.getElementById("reg-name")?.value || "").trim();
    const strasse = (document.getElementById("reg-strasse")?.value || "").trim();
    const hausnr = (document.getElementById("reg-hausnr")?.value || "").trim();
    const plz = (document.getElementById("reg-plz")?.value || "").trim();
    const ort = (document.getElementById("reg-ort")?.value || "").trim();
    const email = (document.getElementById("reg-email")?.value || "").trim().toLowerCase();
    const tel = (document.getElementById("reg-tel")?.value || "").trim();

    // 1) Erst Pflichtfelder prüfen
    const missing = [];
    if (!firma) missing.push("Firmenname");
    if (!name) missing.push("Name Ansprechpartner");
    if (!strasse) missing.push("Straße");
    if (!hausnr) missing.push("Hausnummer");
    if (!plz) missing.push("PLZ");
    if (!ort) missing.push("Ort");
    if (!email) missing.push("E-Mail-Adresse");
    if (!tel) missing.push("Telefonnummer");

    if (missing.length) {
        if (err) err.innerText = "Bitte ausfüllen: " + missing.join(", ");
        return;
    }

    // 2) Dann Checkbox prüfen
    if (!isPrivacyAccepted()) {
        if (err) err.innerText =
            "Bitte bestätigen Sie die Datenschutzerklärung (Haken setzen), um die Registrierung abzusenden.";
        return;
    }

    try {
        const cred = await createUserWithEmailAndPassword(auth, email, makeTempPassword());

        await setDoc(doc(db, "users", cred.user.uid), {
            firma, name, strasse, hausnr, plz, ort, email, tel,
            approved: false,
            createdAt: serverTimestamp()
        });

        await addDoc(collection(db, "registrationRequests"), {
            uid: cred.user.uid,
            email,
            firma,
            name,
            createdAt: serverTimestamp(),
            status: "pending"
        });

        await signOut(auth);

        if (info) info.innerText = "Registrierung eingegangen. Du erhältst Zugang nach Freigabe.";

        // zurück zum Login
        showPage("page-login");
        const loginError = document.getElementById("loginError");
        if (loginError) loginError.innerText = "Registrierung eingegangen. Bitte auf Freigabe warten.";

    } catch (e) {
        console.error(e);
        if (err) {
            if (String(e?.code || "").includes("auth/email-already-in-use")) {
                err.innerText = "Diese E-Mail ist bereits registriert. Nutze 'Passwort vergessen' oder kontaktiere den Admin.";
            } else {
                err.innerText = "Registrierung fehlgeschlagen. Bitte prüfen und erneut versuchen.";
            }
        }
    }
}

window.registerRequest = registerRequest;

// -----------------------------
// showPage
// -----------------------------

async function showPage(id, fromHistory = false) {

    // Ohne Login nur diese Seiten erlauben:
    const publicPages = new Set([
        "page-login",
        "page-start",
        "page-register",
        "page-privacy",
        "page-imprint",
        "page-hinweis"
    ]);

    if (!isLoggedIn() && !publicPages.has(id)) {
        console.warn("Blocked navigation (not logged in):", id);
        id = "page-login";
    }

    // letzte Seite merken (nur wenn eingeloggt und nicht login/start)
    if (isLoggedIn()) {
        sessionStorage.setItem("lastPage", id);
    }

    // Browser-History nur setzen, wenn NICHT durch Zurück/Vor ausgelöst
    if (!fromHistory) {
        history.pushState({ page: id }, "", "#" + id);
    }

    document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
    const el = document.getElementById(id);
    if (!el) return;           // Sicherheitsnetz

    document.getElementById(id).classList.add("active");

    // if (id === "page-14") loadPage14();
    // if (id === "page-14-3") loadPage143();
    // if (id === "page-14-2") loadPage142();
    // if (id === "page-8") loadPage8();
    // if (id === "page-18") loadPage18();
    // if (id === "page-20") loadPage20();
    // if (id === "page-21") loadPage21();
    // if (id === "page-22") loadPage22();
    // if (id === "page-9") loadPage9();
    // if (id === "page-10") loadPage10();
    // if (id === "page-23") loadPage23();
    // if (id === "page-24") loadPage24();
    // if (id === "page-25") loadPage25();
    // if (id === "page-27") loadPage27();
    // if (id === "page-28") loadPage28();
    // if (id === "page-30") loadPage30();
    // if (id === "page-31") loadPage31();
    //  if (id === "page-32") loadPage32();
    //  if (id === "page-33") loadPage33();
    //  if (id === "page-13") loadPage13();

    if (id === "page-40") {
        showLoader40(true);
        try {
            page40Promise = loadPage40();
            await page40Promise;
        } finally {
            showLoader40(false);
        }
    }

    // Checkboxen beim Seitenwechsel zurücksetzen
    const cb1 = document.getElementById("chkPrivacyAck");
    const cb2 = document.getElementById("chkPrivacyAck2");

    if (cb1) cb1.checked = false;
    if (cb2) cb2.checked = false;

    updateAuthButtons();
}

// -----------------------------
// LOGIN - LOGOUT - PASSWORD
// -----------------------------

async function login() {
    const loginError = document.getElementById("loginError");

    const email = (document.getElementById("loginUser")?.value || "").trim();
    const pw = (document.getElementById("loginPass")?.value || "");

    // 1) Erst Eingaben prüfen
    if (!email || !pw) {
        loginError.innerText = "Bitte E-Mail und Passwort eingeben.";
        return;
    }

    // 2) Dann Datenschutz-Haken prüfen
    if (!isPrivacyAccepted()) {
        if (loginError) loginError.innerText =
            "Bitte bestätigen Sie die Datenschutzerklärung und die allgemeinen Hinweise (Haken setzen), um sich anzumelden.";
        return;
    }

    try {
        const cred = await signInWithEmailAndPassword(auth, email, pw);
        currentUser = cred.user;

        // zentral loggen
        await addDoc(collection(db, "loginLogs"), {
            uid: currentUser.uid,
            email: currentUser.email,
            event: "LOGIN_SUCCESS",
            time: serverTimestamp()
        });

        const udoc = await getDoc(doc(db, "users", currentUser.uid));
        const approved = udoc.exists() && udoc.data().approved === true;

        if (!approved) {
            await signOut(auth);
            currentUser = null;
            showPage("page-login");
            loginError.innerText = "Account ist noch nicht freigeschaltet. Bitte auf Freigabe warten.";
            return;
        }

        updateAdminUI_();
        startTimer();
        showPage("page-3");
    } catch (e) {
        console.error("LOGIN ERROR:", e?.code, e?.message, e);
        loginError.innerText = `Login fehlgeschlagen: ${e?.code || "unknown"}\n${e?.message || ""}`;
    }
}

function toggleUserMenu() {
    const actions = document.getElementById("user-actions");
    if (!actions) return;
    actions.classList.toggle("hidden");
}
window.toggleUserMenu = toggleUserMenu;


async function logout() {
    try {
        await signOut(auth);

        currentUser = null;

        // Timer stoppen + Anzeige zurücksetzen
        clearInterval(logoutTimer);
        remaining = 600;
        const t = document.getElementById("timer");
        if (t) t.innerText = "Logout in: 10:00";

        // Admin-Button ausblenden
        updateAdminUI_();

        // optional: Login-Felder leeren
        loginPass.value = "";
        // loginUser.value = ""; // nur wenn du auch die Mail leeren willst

        const info = document.getElementById("login-info");
        if (info) info.innerText = "";

        showPage("page-login");
        loginError.innerText = "Erfolgreich abgemeldet.";
    } catch (e) {
        console.error(e);
        alert("Abmelden fehlgeschlagen");
    }
}

async function forgotPassword() {
    const email = loginUser.value.trim();
    if (!email) {
        loginError.innerText = "Bitte E-Mail eingeben.";
        return;
    }
    try {
        await sendPasswordResetEmail(auth, email);
        loginError.innerText = "Reset-Link wurde per E-Mail gesendet. Schauen Sie auch in Ihrem Spam-Ordner nach.";
    } catch (e) {
        loginError.innerText = "Reset-Mail konnte nicht gesendet werden.";
    }
}

function goToChange() {
    if (!auth.currentUser) {
        loginError.innerText = "Bitte erst anmelden.";
        return;
    }
    showPage("page-change");
}

async function savePassword() {
    const n1 = newPass1.value;
    const n2 = newPass2.value;

    if (!n1 || !n2) {
        changeError.innerText = "Bitte alle Felder ausfüllen.";
        return;
    }
    if (n1 !== n2) {
        changeError.innerText = "Neue Passwörter stimmen nicht überein.";
        return;
    }
    if (!auth.currentUser) {
        changeError.innerText = "Nicht eingeloggt.";
        return;
    }

    try {
        await updatePassword(auth.currentUser, n1);
        changeError.innerText = "";
        alert("Passwort geändert.");
        showPage("page-3");
    } catch (e) {
        changeError.innerText = "Passwort konnte nicht geändert werden (ggf. neu einloggen).";
    }
}

async function exportLoginLog() {
    const isAdmin = isAdminUser();

    if (!isAdmin) {
        alert("Keine Berechtigung.");
        return;
    }

    const { getDocs, query, orderBy } = await import(
        "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js"
    );

    const q = query(collection(db, "loginLogs"), orderBy("time", "desc"));
    const snap = await getDocs(q);

    // -----------------------------
    // LOGBUCH - NUR FÜR ADMIN
    // -----------------------------

    let csv = "time;email;event\n";
    snap.forEach(d => {
        const x = d.data();
        const time = x.time?.toDate ? x.time.toDate().toISOString() : "";
        csv += `${time};${x.email || ""};${x.event || ""}\n`;
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "login-log.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}
window.exportLoginLog = exportLoginLog;

// -----------------------------
// Admin-Freigabe + Mail auslösen (ohne Backend)
// -----------------------------

async function loadPendingUsers() {
    const isAdmin = isAdminUser();

    if (!isAdmin) {
        alert("Keine Berechtigung.");
        return;
    }

    const q = query(collection(db, "users"), where("approved", "==", false));
    const snap = await getDocs(q);

    const list = [];
    snap.forEach(d => list.push({ uid: d.id, ...d.data() }));
    return list;
}

async function approveUser(uid, email) {
    const isAdmin = isAdminUser();

    if (!isAdmin) {
        alert("Keine Berechtigung.");
        return;
    }

    // ✅ udoc holen
    const uref = doc(db, "users", uid);
    const udoc = await getDoc(uref);

    // ✅ schon freigegeben?
    if (udoc.exists() && udoc.data().approved === true) {
        alert("User ist bereits freigegeben.");
        return;
    }

    await updateDoc(uref, {
        approved: true,
        approvedAt: serverTimestamp(),
        approvedBy: auth.currentUser.email
    });

    await sendPasswordResetEmail(auth, email);

    alert("Freigegeben. Passwort-Reset-Mail wurde gesendet.");
    if (typeof loadAdminPage === "function") loadAdminPage();
}

window.loadPendingUsers = loadPendingUsers;
window.approveUser = approveUser;


// -----------------------------
// LOGBUCH - NUR FÜR ADMIN
// -----------------------------



function updateAdminUI_() {
    const isAdmin = isAdminUser();

    const btn = document.getElementById("btnExportLog");
    if (btn) btn.classList.toggle("hidden", !isAdmin);

    const btnAdmin = document.getElementById("btnAdmin");
    if (btnAdmin) btnAdmin.classList.toggle("hidden", !isAdmin);
}

// -----------------------------
// ADMIN-SEITE: offene Registrierungen anzeigen
// -----------------------------

async function loadAdminPage() {
    const box = document.getElementById("admin-registrations");
    if (!box) return;

    const isAdmin = isAdminUser();

    if (!isAdmin) {
        alert("Keine Berechtigung.");
        return;
    }

    box.innerHTML = "<div>Lade…</div>";

    try {
        const q = query(collection(db, "users"), where("approved", "==", false));
        const snap = await getDocs(q);

        if (snap.empty) {
            box.innerHTML = "<div>Keine offenen Registrierungen 🎉</div>";
            return;
        }

        let html = "";
        snap.forEach(d => {
            const u = d.data();
            html += `
        <div style="border:1px solid #ddd; padding:10px; margin:10px 0; border-radius:8px;">
          <div><strong>Firma:</strong> ${u.firma || ""}</div>
          <div><strong>Ansprechpartner:</strong> ${u.name || u.ansprechpartner || ""}</div>
          <div><strong>Adresse:</strong> ${u.strasse || ""} ${u.hausnr || ""}, ${u.plz || ""} ${u.ort || ""}</div>
          <div><strong>E-Mail:</strong> ${u.email || ""}</div>
          <div><strong>Telefon:</strong> ${u.tel || ""}</div>

          <div style="margin-top:8px;">
            <button onclick="approveUser('${d.id}','${(u.email || "").replace(/'/g, "\\'")}')">
              Freigeben + Passwort-Link senden
            </button>
          </div>
        </div>
      `;
        });

        box.innerHTML = html;

    } catch (e) {
        console.error("loadAdminPage Fehler:", e);
        box.innerHTML = "<div>Fehler beim Laden der Registrierungen.</div>";
    }
}

window.loadAdminPage = loadAdminPage;

// -----------------------------
//  LOGOUT-TIMER
// -----------------------------

function startTimer() {
    remaining = 600;
    clearInterval(logoutTimer);
    logoutTimer = setInterval(() => {
        remaining--;
        let m = Math.floor(remaining / 60);
        let s = remaining % 60;
        timer.innerText = `Logout in: ${m}:${s.toString().padStart(2, "0")}`;
        if (remaining <= 0) {
            alert("Automatisch ausgeloggt.");
            location.reload();
        }
    }, 1000);
}

// -----------------------------
// Alle Zwischensummen aller Preis-Seiten speichern
// -----------------------------

// let angebotSummen = JSON.parse(localStorage.getItem("angebotSummen") || "{}");

// function saveSeitenSumme(seitenId, summe) {
//   angebotSummen[seitenId] = summe;
//   localStorage.setItem("angebotSummen", JSON.stringify(angebotSummen));

// NEU: Rabatt-Anzeigen automatisch nachziehen
//   refreshRabattDisplays();
// }

// function getGesamtAngebotssumme() {
//    let total = 0;
//    for (let key in angebotSummen) {
//         total += parseFloat(angebotSummen[key]) || 0;
//     }
//     return total;
// }

// -----------------------------
// SHK-Rabatt (15%)
// -----------------------------

// const SHK_RABATT = 0.15;

// function formatEuro(n) {
//   const x = Number(n) || 0;
//   return x.toLocaleString("de-DE", { minimumFractionDigits: 2 }) + " €";
// }

// function getRabattSumme(total) {
//   const t = Number(total) || 0;
//   return t * (1 - SHK_RABATT); // = 85%
// }

// Aktualisiert alle vorhandenen Rabatt-Zeilen (auf allen Seiten, die gerade gerendert sind)
// function refreshRabattDisplays() {
//   const total = getGesamtAngebotssumme();
//   const after = getRabattSumme(total);

// alle dynamischen Seiten (14, 8, 18, ...) -> wir hängen data-rabatt="angebot" dran
//   document.querySelectorAll('[data-rabatt="angebot"]').forEach(el => {
//     el.innerText = `Gesamtsumme abzgl. SHK-Rabatt (15%): ${formatEuro(after)}`;
//   });

// Seite 40 (statisch in HTML)
//   const p40 = document.getElementById("angebotspreisRabatt");
//   if (p40) p40.innerText = `Gesamtpreis abzgl. SHK-Rabatt (15%): ${formatEuro(after)}`;
// }

// -----------------------------
// Funktionen zur Seite 5
// -----------------------------

function getPage5BasicIds() {
    return [
        "pj-number",
        "shk-name",
        "shk-contact",
        "shk-email",
        "shk-phone",
        "site-address",
        "execution-date",
        "offer-date",
        "estrich",
        "bodenbelag",
        "systemmarke",
        "system",
        "rohrtyp1",
        "rohrtyp2",
        "dämmung",
        "wärmeleitgruppe1",
        "wärmeleitgruppe2",
        "aufbauhöhe",
        "unbeheizt",
        "unbeheizte_Fläche",
        "heizkreisverteiler",
        "besichtigung",
        "schnellauslegung",
        "berechnung",
        "heizlastberechnung",
        "relevante_Details"
    ];
}

//function clearPage5DetailFields() {
//    getPage5DetailIds().forEach(id => {
//        const el = document.getElementById(id);
//        if (!el) return;
//
//        if (el.tagName === "SELECT") {
//            el.selectedIndex = 0;
//        } else if (el.type === "checkbox") {
//            el.checked = false;
//        } else {
//            el.value = "";
//        }
//    });
//}

function updatePage5DetailUI() {
    const chk = document.getElementById("chkDetail");
    const box = document.getElementById("page5-detail-fields");
    const btn = document.getElementById("submitPage5Btn");

    const active = !!chk?.checked;

    if (box) box.classList.toggle("hidden", !active);

    if (btn) {
        btn.innerText = active
            ? "Eingabe und weiter zu den Dienstleistungen"
            : "Eingabe und weiter zum Hauptmenü";
    }

    //  if (!active) {
    //      clearPage5DetailFields();
    //      savePage5Data();
    //  }
    syncBesichtigungToPage21();
}

//function handlePage5Hinweis(selectId, hinweisText) {
//    const el = document.getElementById(selectId);
//    if (!el) return;
//
//    el.addEventListener("change", () => {
//        if (el.value === "ja") {
//            showHinweis(hinweisText);
//        }
//    });
//}


// -----------------------------
// Funktion zur Prüfung der Pflichteingaben auf Seite 5 (Kopfdaten für Anfrage) + speichern
// -----------------------------

function submitPage5() {

    const detailAktiv = !!document.getElementById("chkDetail")?.checked;

    const fields = [
        { id: "pj-number", name: "SHK - Kunden-Nr." },
        { id: "shk-name", name: "SHK Name/Firma" },
        { id: "shk-contact", name: "SHK Ansprechpartner" },
        { id: "shk-email", name: "SHK E-Mail" },
        { id: "shk-phone", name: "SHK Telefon-Nr." },
        { id: "site-address", name: "Adresse Baustelle" },
        { id: "execution-date", name: "Gewünschter Ausführungstermin" },
        { id: "offer-date", name: "Angebotsabgabe bis" },
        { id: "estrich", name: "Estrich anbieten?" },
        { id: "bodenbelag", name: "Bodenbelag anbieten?" },
        { id: "systemmarke", name: "Systemmarke" },
        { id: "system", name: "System" },
        { id: "rohrtyp1", name: "Rohrtyp Kunststoffrohr" },
        { id: "rohrtyp2", name: "Rohrtyp Metallrohr" },
        { id: "dämmung", name: "Dämmung" },
        { id: "wärmeleitgruppe1", name: "Wärmeleitgruppe (WLG) Unterdämmung:" },
        { id: "wärmeleitgruppe2", name: "Wärmeleitgruppe (WLG) Systemdämmung:" },
        { id: "aufbauhöhe", name: "Aufbauhöhe" },
        { id: "unbeheizt", name: "Unbeheizte Fläche" },
        { id: "heizkreisverteiler", name: "Heizkreisverteiler" },
        { id: "besichtigung", name: "Baustellenbesichtigung" },
        { id: "schnellauslegung", name: "Schnellauslegung" },
        { id: "berechnung", name: "Heizflächenberechnung" },
        { id: "heizlastberechnung", name: "Heizlastberechnung" }
    ];

    let missing = [];

    fields.forEach(f => {
        const el = document.getElementById(f.id);
        const val = (el?.value || "").trim();
        if (!val) missing.push(f.name);
    });

    const errorDiv = document.getElementById("page5-error");

    if (missing.length > 0) {
        errorDiv.innerText = "Bitte folgende Felder ausfüllen:\n" + missing.join(", ");
        return;
    }

    errorDiv.innerText = "";

    savePage5Data();

    showPage(detailAktiv ? "page-21" : "page-4");
}

function savePage5Data() {
    const ids = [
        "pj-number", "shk-name", "shk-contact",
        "shk-email", "shk-phone", "site-address", "execution-date",
        "offer-date", "estrich", "bodenbelag", "systemmarke", "system",
        "rohrtyp1", "rohrtyp2", "dämmung", "wärmeleitgruppe1", "wärmeleitgruppe2", "aufbauhöhe",
        "unbeheizt", "unbeheizte_Fläche", "heizkreisverteiler", "besichtigung",
        "schnellauslegung", "berechnung", "heizlastberechnung", "relevante_Details"
    ];

    const obj = {};
    ids.forEach(id => obj[id] = (document.getElementById(id)?.value || "").trim());

    obj.chkDetail = !!document.getElementById("chkDetail")?.checked;

    localStorage.setItem("page5Data", JSON.stringify(obj));
}

// -----------------------------
// SEITE 14 – Tackersystem Hausmarke (ndf1.csv)
// -----------------------------

// let page14Loaded = false;

// function loadPage14() {
// 
//     if (!isLoggedIn()) return;
//     
//    if (page14Loaded) return; // nicht doppelt laden
//    page14Loaded = true;
// 
//     fetch("ndf1.csv")
//        .then(response => response.text())
//        .then(data => {
// 
//             const lines = data.split("\n").slice(1);
//            const container = document.getElementById("page14-content");
// 
//             let html = "";
// let headerInserted = false;            
// let gespeicherteWerte = JSON.parse(localStorage.getItem("page14Data") || "{}");
// 
//            lines.forEach((line, index) => {
// 
//                if (!line.trim()) return;
// 
//                const cols = line.split(";");
//                const colA = cols[0]?.trim();
//                 const colB = cols[1]?.trim();
//                const colC = cols[2]?.trim();
//                const colD = cols[3]?.trim();
// 
//                if (colA === "Titel") {
//                    html += `<div class="title">${colB}</div>`;
//                    return;
//                }
//               if (colA === "Untertitel") {
//                    html += `<div class="subtitle">${colB}</div>`;
//                    return;
//                }
//                if (colA === "Zwischentitel") {
//                    html += `<div class="midtitle">${colB}</div>`;
//                    return;
//                }
// 
//                const preisVorhanden = colD && !isNaN(parseFloat(colD.replace(",", ".")));
// 
//                if (preisVorhanden) {

// if (!headerInserted) {
//    html += `
//      <div class="row table-header">
//        <div></div>
//        <div>Beschreibung</div>
//        <div>Einheit</div>
//        <div style="text-align:center;">Menge</div>
//        <div style="text-align:right;">Preis / Einheit</div>
//        <div style="text-align:right;">Positionsergebnis</div>
//      </div>
//    `;
//    headerInserted = true;
//  } 

//                   const preis = parseFloat(colD.replace(",", "."));
//                    const gespeicherteMenge = gespeicherteWerte[index] || 0;
// 
//                   html += `
//                   <div class="row">
//                        <div class="col-a">${colA}</div>
//                        <div class="col-b">${colB}</div>
//                        <div class="col-c">${colC}</div>
//                        <input class="menge-input" 
//                               type="number" min="0" step="any"
//                               value="${gespeicherteMenge}"
//                               oninput="calcRowPage14(this,${preis},${index})">
//                       <div class="col-d">${preis.toLocaleString("de-DE",{minimumFractionDigits:2})} €</div>
//                        <div class="col-e">0,00 €</div>
//                    </div>`;
//                } else {
// 
//                    html += `
//                    <div class="row no-price">
//                       <div class="col-a">${colA}</div>
//                        <div class="col-b" style="grid-column: 2 / 7;">${colB}</div>
//                   </div>`;
//                }
//           });
// 
//           html += `<div id="gesamtSumme14" class="gesamt">Gesamtsumme: 0,00 €</div>`;
//           html += `<div id="gesamtSumme14Rabatt" class="gesamt rabatt" data-rabatt="angebot">
//         Gesamtsumme abzgl. SHK-Rabatt (15%): 0,00 €
//        </div>`;
// 
//           container.innerHTML = html;
// 
//            berechneGesamt14();
//        });
// }
// 
// function calcRowPage14(input, preisWert, index) {
// 
//    const row = input.parentElement;
//    const ergebnis = row.querySelector(".col-e");
//    const menge = parseFloat(input.value.replace(",", ".")) || 0;
// 
//   const wert = menge * preisWert;
// 
//    ergebnis.innerText =
//        wert.toLocaleString("de-DE",{minimumFractionDigits:2}) + " €";
// 
//    let gespeicherteWerte =
//       JSON.parse(localStorage.getItem("page14Data") || "{}");
// 
//    gespeicherteWerte[index] = menge;
// 
//    localStorage.setItem("page14Data",
//       JSON.stringify(gespeicherteWerte));
// 
//    berechneGesamt14();
// }

// function berechneGesamt14() {
//     let sum = 0;
// 
//    document.querySelectorAll("#page-14 .col-e").forEach(el => {
//        const wert = parseFloat(
//            el.innerText.replace("€","")
//                       .replace(/\./g,"")
//                       .replace(",",".")
//                       .trim()
//        ) || 0;
//        sum += wert;
//    });

// Zwischensumme für Seite 14 speichern
//    saveSeitenSumme("page-14", sum);

// Gesamtsumme über alle Seiten
//    const gesamtDiv = document.getElementById("gesamtSumme14");
//    if (gesamtDiv) {
//        gesamtDiv.innerText =
//            "Gesamtsumme Angebot: " + getGesamtAngebotssumme().toLocaleString("de-DE",{minimumFractionDigits:2}) + " €";
//    }
// }



// -----------------------------
// SEITE 40 – Ausgabeseite Kostenvoranschlag / Anfrage
// -----------------------------

function isPreisZeile(colD) {
    if (!colD) return false;
    const p = parseFloat(String(colD).replace(",", "."));
    return !isNaN(p);
}

function renderHinweisLine(colA, colB) {
    const text = (colB || "").trim();
    if (!text) return "";

    if (colA === "Titel") return `<div class="title">${text}</div>`;
    if (colA === "Untertitel") return `<div class="subtitle">${text}</div>`;
    if (colA === "Zwischentitel") return `<div class="midtitle">${text}</div>`;

    // “Beschreibungstext”-Zeilen (no-price)
    return `<div class="hinweis-row">${text}</div>`;
}

/**
 * Extrahiert Textblöcke (Titel/Untertitel/Zwischentitel + no-price-Beschreibungen)
 * so, dass ein Block NUR dann ausgegeben wird, wenn darunter (bis zum nächsten Block)
 * mindestens eine Artikelposition Menge > 0 hat.
 */
function extractTriggeredTextBlocks(lines, dataObj) {
    const out = [];

    let pendingHeaderParts = [];      // sammelt Textzeilen bis zur ersten Preiszeile (oder bis zum nächsten Block)
    let sectionHeaderHtml = "";       // “Header” für die aktuelle Preis-Sektion
    let inSection = false;
    let sectionHasQty = false;

    function flushSectionIfNeeded() {
        if (inSection && sectionHasQty && sectionHeaderHtml.trim()) {
            out.push(sectionHeaderHtml);
        }
    }

    for (let index = 0; index < lines.length; index++) {
        const line = lines[index];
        if (!line || !line.trim()) continue;

        const cols = line.split(";");
        const colA = (cols[0] || "").trim();
        const colB = (cols[1] || "").trim();
        const colD = (cols[3] || "").trim();

        const istTitelZeile = (colA === "Titel" || colA === "Untertitel" || colA === "Zwischentitel");
        const preisVorhanden = isPreisZeile(colD);

        // TEXT-ZEILE (Titel/Untertitel/Zwischentitel oder "no-price"-Beschreibung)
        if (istTitelZeile || !preisVorhanden) {
            // Wenn wir gerade in einer Preis-Sektion waren und jetzt ein neuer Textblock beginnt:
            if (inSection) {
                flushSectionIfNeeded();
                inSection = false;
                sectionHasQty = false;
                sectionHeaderHtml = "";
                pendingHeaderParts = [];
            }

            const html = renderHinweisLine(colA, colB);
            if (html) pendingHeaderParts.push(html);
            continue;
        }

        // PREIS-ZEILE
        const menge = parseFloat((dataObj[index] ?? 0)) || 0;

        // Start einer neuen Preis-Sektion: der bis dahin gesammelte Textblock ist der “Header”
        if (!inSection) {
            inSection = true;
            sectionHasQty = false;
            sectionHeaderHtml = pendingHeaderParts.join("");
            pendingHeaderParts = [];
        }

        if (menge > 0) sectionHasQty = true;
    }

    // Letzte Sektion am Ende flushen
    flushSectionIfNeeded();

    return out.join("");
}


async function loadPage40() {
    if (!isLoggedIn()) return;

    const angebotTyp = localStorage.getItem("angebotTyp") || "kv";
    const titleEl = document.getElementById("page40-title");
    if (titleEl) {
        titleEl.innerText = (angebotTyp === "anfrage") ? "Anfrage" : "Kostenvoranschlag";
    }

    // Anfrage-Daten anzeigen (nur wenn angebotTyp === "anfrage")
    const anfrageBox = document.getElementById("anfrage-daten");
    const anfrageContent = document.getElementById("anfrage-daten-content");

    if (angebotTyp === "anfrage") {
        const p5 = JSON.parse(localStorage.getItem("page5Data") || "{}");

        const labels = {
            "pj-number": "SHK - Kunden-Nr.",
            "shk-name": "SHK Name/Firma",
            "shk-contact": "SHK Ansprechpartner",
            "shk-email": "SHK E-Mail",
            "shk-phone": "SHK Telefon-Nr.",
            "site-address": "Adresse Baustelle",
            "execution-date": "Gewünschter Ausführungstermin",
            "offer-date": "Angebotsabgabe bis",
            "estrich": "Estrich anbieten?",
            "bodenbelag": "Bodenbelag anbieten?",
            "systemmarke": "Systemmarke",
            "system": "System",
            "rohrtyp1": "Rohrtyp Kunststoffrohr",
            "rohrtyp2": "Rohrtyp Metallrohr",
            "dämmung": "Dämmung",
            "wärmeleitgruppe1": "Wärmeleitgruppe (WLG) Unterdämmung",
            "wärmeleitgruppe2": "Wärmeleitgruppe (WLG) Systemdämmung",
            "aufbauhöhe": "Aufbauhöhe",
            "unbeheizt": "Unbeheizte Fläche",
            "unbeheizte_Fläche": "Wo / m² unbeheizte Fläche",
            "heizkreisverteiler": "Heizkreisverteiler",
            "besichtigung": "Baustellenbesichtigung",
            "schnellauslegung": "Schnellauslegung",
            "berechnung": "Heizflächenberechnung",
            "heizlastberechnung": "Heizlastberechnung",
            "relevante_Details": "Relevante Details"
        };

        let html = "";
        Object.keys(labels).forEach(id => {
            const val = (p5[id] || "").trim();
            if (val) {
                html += `<div style="margin:6px 0;"><strong>${labels[id]}:</strong> ${val}</div>`;
            }
        });

        if (anfrageBox && anfrageContent) {
            anfrageContent.innerHTML = html || "<div>Keine Anfrage-Daten vorhanden.</div>";
            anfrageBox.style.display = "block";
        }
    } else {
        if (anfrageBox) anfrageBox.style.display = "none";
    }

    const container = document.getElementById("summary-content");
    const seitenHinweiseContainer = document.getElementById("seitenhinweise-content");
    const hinweiseContainer = document.getElementById("hinweise-content");
    if (!container || !hinweiseContainer || !seitenHinweiseContainer) return;

    container.innerHTML = "";
    seitenHinweiseContainer.innerHTML = "";
    hinweiseContainer.innerHTML = "";

    container.innerHTML += `
  <div class="row table-header">
    <div>EDV-Nr.</div>
    <div>Beschreibung</div>
    <div>Einheit</div>
    <div style="text-align:center;">Menge</div>
    <div style="text-align:right;">Preis / Einheit</div>
    <div style="text-align:right;">Positionsergebnis</div>
  </div>
`;

    let gesamt = 0;

    //const seitenConfig = [
    //        { key: "page14Data",  csv: "ndf1.csv" },
    //        { key: "page142Data", csv: "ndf5.csv" },
    //        { key: "page8Data", csv: "ndf6.csv" },
    //        { key: "page18Data", csv: "ndf7.csv" },
    //        { key: "page20Data", csv: "ndf8.csv" },
    //        { key: "page21Data", csv: "ndf9.csv" },
    //        { key: "page22Data", csv: "ndf10.csv" },
    //        { key: "page9Data", csv: "ndf11.csv" },
    //        { key: "page10Data", csv: "ndf2.csv" },
    //       { key: "page23Data", csv: "ndf12.csv" },
    //       { key: "page24Data", csv: "ndf13.csv" },
    //        { key: "page25Data", csv: "ndf14.csv" },
    //        { key: "page27Data", csv: "ndf15.csv" },
    //        { key: "page28Data", csv: "ndf16.csv" },
    //        { key: "page30Data", csv: "ndf17.csv" },
    //        { key: "page31Data", csv: "ndf18.csv" },
    //        { key: "page32Data", csv: "ndf19.csv" },
    //        { key: "page33Data", csv: "ndf20.csv" },
    //        { key: "page13Data", csv: "ndf21.csv" },
    //        { key: "page143Data", csv: "ndf3.csv" }
    //    ];

    let seitenHinweiseHtml = "";
    let firstHinweisBlock = true;

    for (const seite of seitenConfig) {

        const data = JSON.parse(localStorage.getItem(seite.key) || "{}");

        const response = await fetch(seite.csv);
        const csvText = await response.text();
        const lines = csvText.split("\n").slice(1);

        // 1) Seitenbezogene Textblöcke (nur wenn auf dieser Seite Mengen > 0 in der jeweiligen Sektion)
        const blocksHtml = extractTriggeredTextBlocks(lines, data);
        if (blocksHtml.trim()) {
            if (!firstHinweisBlock) seitenHinweiseHtml += `<hr class="seitenhinweis-sep">`;
            firstHinweisBlock = false;
            seitenHinweiseHtml += blocksHtml;
        }

        lines.forEach((line, index) => {

            if (!line.trim()) return;

            const cols = line.split(";");
            const colA = cols[0]?.trim();
            const colB = cols[1]?.trim();
            const colC = cols[2]?.trim();
            const colD = cols[3]?.trim();

            const menge = parseFloat(data[index] || 0);
            const preis = parseFloat(colD?.replace(",", ".") || 0);

            if (
                colA !== "Titel" &&
                colA !== "Untertitel" &&
                colA !== "Zwischentitel" &&
                menge > 0
            ) {

                const zeile = document.createElement("div");
                zeile.className = "row summary-row";
                zeile.innerHTML = `
                    <div class="col-a">${colA}</div>
                    <div class="col-b">${colB}</div>
                    <div class="col-c">${colC}</div>
                    <div class="col-d">${menge.toLocaleString("de-DE", { minimumFractionDigits: 0 })}</div>
                    <div class="col-e">${preis.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €</div>
                    <div class="col-f">${(menge * preis).toLocaleString("de-DE", { minimumFractionDigits: 2 })} €</div>
                `;

                container.appendChild(zeile);
                gesamt += menge * preis;
            }
            seitenHinweiseContainer.innerHTML = seitenHinweiseHtml;
        });
    }

    // Hinweise Frässystem
    // 	const fraesenHinweis = document.getElementById("fraesen-hinweis-print");
    // 	if (fraesenHinweis) {
    //  	 fraesenHinweis.style.display = fraesenVerwendet ? "block" : "none";
    // 	}
    // 
    //    const angebotspreisEl = document.getElementById("angebotspreis");
    //     if (angebotspreisEl) {
    //        angebotspreisEl.innerText =
    //             "Gesamtpreis: " + gesamt.toLocaleString("de-DE",{minimumFractionDigits:2}) + " €";
    //     }

    refreshRabattDisplays();

    // Hinweise laden (ndf4.csv)
    //    try {
    //       const hinweisRes = await fetch("ndf4.csv");
    //        const hinweisText = await hinweisRes.text();
    //        const hinweisLines = hinweisText.split("\n").slice(1);
    // 
    //       let html = "";
    //       hinweisLines.forEach(line => {
    //           if (!line.trim()) return;
    // 
    //            const cols = line.split(";");
    //            const colA = cols[0]?.trim();
    //            const colB = cols[1]?.trim();
    // 
    //            if (colA === "Titel") html += `<div class="title">${colB}</div>`;
    //            else if (colA === "Untertitel") html += `<div class="subtitle">${colB}</div>`;
    //            else if (colA === "Zwischentitel") html += `<div class="midtitle">${colB}</div>`;
    //            else html += `<div class="hinweis-row">${colB}</div>`;
    //        });

    //      hinweiseContainer.innerHTML = html;

    //   } catch (e) {
    //       console.error("Fehler beim Laden der Hinweise (ndf4.csv):", e);
    //   }
}

// -----------------------------
// direktZumAngebot (Button)
// -----------------------------

function direktZumAngebot() {

    const ids = [
        "pj-number", "shk-name", "shk-contact",
        "shk-email", "shk-phone", "site-address", "execution-date", "offer-date", "estrich", "bodenbelag",
        "systemmarke", "system", "rohrtyp1", "rohrtyp2", "dämmung", "wärmeleitgruppe1", "wärmeleitgruppe2", "aufbauhöhe", "unbeheizt",
        "heizkreisverteiler", "besichtigung", "schnellauslegung", "berechnung", "heizlastberechnung"
    ];

    const alleAusgefüllt = ids.every(id => {
        const val = document.getElementById(id)?.value?.trim();
        return val && val.length > 0;
    });
    if (alleAusgefüllt) {
        savePage5Data();
        localStorage.setItem("angebotTyp", "anfrage");
        showPage("page-40");
    } else {
        localStorage.setItem("angebotTyp", "kv");
        showPage("page-41");
    }
}

// -----------------------------
// SEITE 40 – printPage - (Button "Drucken / als PDF speichern")
// -----------------------------

function printPage40() {
    window.print();
}

// -----------------------------
// SEITE 40 – sendMail - (Button "Als Text-Mail versenden")
// -----------------------------

function sendMailPage40() {
    if (!isLoggedIn()) return;

    const angebotTyp = localStorage.getItem("angebotTyp") || "kv";

    let subject = "";
    let mailAdresse = "";

    if (angebotTyp === "anfrage") {
        subject = "Anfrage NDF GmbH";
        mailAdresse = "info@ndf-gmbh.de";
    } else {
        subject = `Kostenvoranschlag Peter Jensen - NDF - ${new Date().toLocaleDateString("de-DE")}`;
        mailAdresse = "";
    }

    const body = encodeURIComponent(document.getElementById("page-40").innerText);

    window.location.href =
        `mailto:${mailAdresse}?subject=${encodeURIComponent(subject)}&body=${body}`;
}

// -----------------------------
// SEITE 40 – Export als CSV - (Button "Export CsV")
// -----------------------------

// function exportCsvPage40() {
//   if (!isLoggedIn()) return;
// const rows = document.querySelectorAll("#summary-content .summary-row");
// if (!rows.length) {
//   alert("Keine Tabelleninhalte zum Export vorhanden.");
//   return;
//  }
// 
//  const SEP = "-"; // Vorgabe
// 
// Excel-Hinweiszeile, damit es sicher in Spalten trennt (auch bei "-")
//  const lines = [];
//  lines.push(`sep=${SEP}`);
// 
// Kopfzeile
// lines.push(["Artikelnummer", "Menge"].join(SEP));

// Werte "CSV-sicher" machen (ohne Anführungszeichen)
// function clean(val) {
//   return String(val ?? "")
//     .trim()
//     .replace(/\r?\n/g, " "); // keine Zeilenumbrüche in Zellen
// }

// rows.forEach(r => {
//   const artikel = clean(r.querySelector(".col-a")?.innerText);
//   const menge   = clean(r.querySelector(".col-d")?.innerText);

//   lines.push([artikel, menge].join(SEP));
//  });

// const csv = lines.join("\n");

// const datum = new Date().toLocaleDateString("de-DE").replaceAll(".", "-");
// const filename = `PJ_KalkPro_CSV-Export_${datum}.csv`;

// const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
// const url = URL.createObjectURL(blob);

// const a = document.createElement("a");
//  a.href = url;
//  a.download = filename;
// document.body.appendChild(a);
//  a.click();
//  a.remove();
// 
//  setTimeout(() => URL.revokeObjectURL(url), 2000);
// }

// window.exportCsvPage40 = exportCsvPage40;

// -----------------------------
// clearInputs - Button "Eingaben löschen"
// -----------------------------

function clearInputs() {

    localStorage.clear();
    localStorage.removeItem("page5Data");
    localStorage.removeItem("angebotTyp");

    // Eingabefelder im DOM leeren
    document.querySelectorAll("input").forEach(inp => inp.value = "");

    const chkDetail = document.getElementById("chkDetail");
    if (chkDetail) chkDetail.checked = false;

    // clearPage5DetailFields();
    updatePage5DetailUI();

    const page5Error = document.getElementById("page5-error");
    if (page5Error) page5Error.innerText = "";

    // Dynamische Inhalte leeren (damit nichts „stehen bleibt“)
    const idsToClear = [
        "page5Data"
        //         "page14-content",
        //        "content-14-3",
        //        "content-14-2",
        //        "content-8",
        //        "content-18",
        //        "content-20",
        //        "content-21",
        //       "content-22",
        //     "content-9",
        //       "content-10",
        //       "content-23",
        ////  	    "content-24",
        //       "content-25",
        //       "content-27",
        //       "content-28",
        //       "content-30",
        // 	    "content-31",
        //        "content-32",
        //       "content-33",
        //       "content-13",
        //       "summary-content",
        //       "hinweise-content",
        //        "seitenhinweise-content"
    ];
    idsToClear.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = "";

        document.querySelectorAll("select").forEach(sel => sel.selectedIndex = 0);

        const chkDetail = document.getElementById("chkDetail");
        if (chkDetail) chkDetail.checked = false;

        if (typeof updatePage5DetailUI === "function") {
            updatePage5DetailUI();
        }

    });

    // Summen-Anzeige zurücksetzen
    //    const angebotspreis = document.getElementById("angebotspreis");
    //    if (angebotspreis) angebotspreis.innerText = "Gesamtsumme: 0,00 €";

    //    const sum14 = document.getElementById("gesamtSumme14");
    //    if (sum14) sum14.innerText = "Gesamtsumme Angebot: 0,00 €";

    //    const sum143 = document.getElementById("gesamtSumme143");
    //    if (sum143) sum143.innerText = "Gesamtsumme Angebot: 0,00 €";

    //   const sum142 = document.getElementById("gesamtSumme142");
    //    if (sum142) sum142.innerText = "Gesamtsumme Angebot: 0,00 €";

    //   const sum8 = document.getElementById("gesamtSumme8");
    //    if (sum8) sum8.innerText = "Gesamtsumme Angebot: 0,00 €";

    //   const sum18 = document.getElementById("gesamtSumme18");
    //    if (sum18) sum18.innerText = "Gesamtsumme Angebot: 0,00 €";

    //   const sum20 = document.getElementById("gesamtSumme20");
    //    if (sum20) sum20.innerText = "Gesamtsumme Angebot: 0,00 €";

    //   const sum21 = document.getElementById("gesamtSumme21");
    //   if (sum21) sum21.innerText = "Gesamtsumme Angebot: 0,00 €";

    //   const sum22 = document.getElementById("gesamtSumme22");
    //   if (sum22) sum22.innerText = "Gesamtsumme Angebot: 0,00 €";

    //  const sum9 = document.getElementById("gesamtSumme9");
    //  if (sum9) sum9.innerText = "Gesamtsumme Angebot: 0,00 €";

    //   const sum10 = document.getElementById("gesamtSumme10");
    //   if (sum10) sum10.innerText = "Gesamtsumme Angebot: 0,00 €";

    //   const sum23 = document.getElementById("gesamtSumme23");
    //   if (sum23) sum23.innerText = "Gesamtsumme Angebot: 0,00 €";

    //  const sum24 = document.getElementById("gesamtSumme24");
    //   if (sum24) sum24.innerText = "Gesamtsumme Angebot: 0,00 €";

    //  const sum25 = document.getElementById("gesamtSumme25");
    //  if (sum25) sum25.innerText = "Gesamtsumme Angebot: 0,00 €";

    //  const sum27 = document.getElementById("gesamtSumme27");
    //   if (sum27) sum27.innerText = "Gesamtsumme Angebot: 0,00 €";

    //  const sum28 = document.getElementById("gesamtSumme28");
    //  if (sum28) sum28.innerText = "Gesamtsumme Angebot: 0,00 €";

    //  const sum30 = document.getElementById("gesamtSumme30");
    //  if (sum30) sum30.innerText = "Gesamtsumme Angebot: 0,00 €";

    //  const sum31 = document.getElementById("gesamtSumme31");
    //  if (sum31) sum31.innerText = "Gesamtsumme Angebot: 0,00 €";

    //  const sum32 = document.getElementById("gesamtSumme32");
    //  if (sum32) sum32.innerText = "Gesamtsumme Angebot: 0,00 €";

    //  const sum33 = document.getElementById("gesamtSumme33");
    //  if (sum33) sum33.innerText = "Gesamtsumme Angebot: 0,00 €";

    //  const sum13 = document.getElementById("gesamtSumme13");
    //  if (sum13) sum13.innerText = "Gesamtsumme Angebot: 0,00 €";

    // Flags zurücksetzen, damit Seiten neu aus CSV geladen werden
    //   page14Loaded = false;

    // Seite 14.3 hat kein Flag, daher reicht Container leeren

    // Angebots-Summen Objekt zurücksetzen (falls du es im RAM nutzt)
    //   angebotSummen = {};

    updateAdminUI_();

    // // document.querySelectorAll('[data-rabatt="angebot"]').forEach(el => {
    //   el.innerText = "Gesamtsumme abzgl. SHK-Rabatt (15%): 0,00 €";
    // });

    // const p40r = document.getElementById("angebotspreisRabatt");
    // if (p40r) p40r.innerText = "Gesamtpreis abzgl. SHK-Rabatt (15%): 0,00 €";

    
}



// -----------------------------
// SEITE 21 – Dienstleistungen (ndf9.csv)
// -----------------------------

//       function syncBesichtigungToPage21() {
//  const chkDetail = document.getElementById("chkDetail");
//  const besichtigung = document.getElementById("besichtigung");

//   const detailAktiv = !!chkDetail?.checked;
//   const istJa = detailAktiv && besichtigung?.value === "ja";

// Nur wenn Seite 21 schon geladen ist
//   const firstInput = document.querySelector("#page-21 .menge-input");
//    if (!firstInput) return;

//    firstInput.value = istJa ? "1" : "0";

// oninput-Logik bewusst mit auslösen, damit localStorage + Summen mitziehen
//    firstInput.dispatchEvent(new Event("input", { bubbles: true }));
// }

// function loadPage21() {
//  if (!isLoggedIn()) return;

//  const container = document.getElementById("content-21");
//  if (!container) return;

//  if (container.innerHTML.trim() !== "") return;

//  fetch("ndf9.csv")
//  .then(response => response.text())
//  .then(data => {

//     const lines = data.split("\n").slice(1);
//     let html = "";
// let headerInserted = false;

// //    const gespeicherteWerte =
//   JSON.parse(localStorage.getItem("page21Data") || "{}");

//  lines.forEach((line, index) => {
//   if (!line.trim()) return;

//   const cols = line.split(";");
//   const colA = cols[0]?.trim();
//   const colB = cols[1]?.trim();
//   const colC = cols[2]?.trim();
//   const colD = cols[3]?.trim();

//  if (colA === "Titel") {
//      html += `<div class="title">${colB}</div>`;
//       return;
//  }
//    if (colA === "Untertitel") {
//        html += `<div class="subtitle">${colB}</div>`;
//        return;
//   }
//   if (colA === "Zwischentitel") {
//       html += `<div class="midtitle">${colB}</div>`;
//       return;
//   }

// const preis = parseFloat(colD?.replace(",", "."));
// if (!isNaN(preis)) {

// if (!headerInserted) {
//  html += `
//    <div class="row table-header">
//       <div></div>
//       <div>Beschreibung</div>
//       <div>Einheit</div>
//       <div style="text-align:center;">Menge</div>
//       <div style="text-align:right;">Preis / Einheit</div>
//       <div style="text-align:right;">Positionsergebnis</div>
//     </div>
//   `;
//   headerInserted = true;
// }

//        const menge = gespeicherteWerte[index] || 0;
// 
//        html += `
//            <div class="row">
//                <div class="col-a">${colA}</div>
//                <div class="col-b">${colB}</div>
//               <div class="col-c">${colC}</div>
// 
//               <input class="menge-input"
//                      type="number" min="0" step="any"
//                      value="${menge}"
//                      oninput="calcRow21(this, ${preis}, ${index})">
// 
//               <div class="col-d">
//                   ${preis.toLocaleString("de-DE",{minimumFractionDigits:2})} €
//               </div>
// 
//               <div class="col-e">0,00 €</div>
//           </div>`;
//    } else {
//        html += `
//            <div class="row no-price">
//                <div class="col-a">${colA}</div>
//                <div class="col-b" style="grid-column: 2 / 7;">${colB}</div>
//            </div>`;
//    }
//  });

//  html += `<div id="gesamtSumme21" class="gesamt">Gesamtsumme: 0,00 €</div>`;
//  html += `<div id="gesamtSumme21Rabatt" class="gesamt rabatt" data-rabatt="angebot">
//  Gesamtsumme abzgl. SHK-Rabatt (15%): 0,00 €
//  </div>`;

//    container.innerHTML = html;
//    berechneGesamt21();
//    syncBesichtigungToPage21();
//     });
// }

// function calcRow21(input, preis, index) {

// const row = input.parentElement;
//  const ergebnis = row.querySelector(".col-e");
// const menge = parseFloat(input.value.replace(",", ".")) || 0;

// const sum = menge * preis;
// ergebnis.innerText =
//    sum.toLocaleString("de-DE",{minimumFractionDigits:2}) + " €";

//  let gespeicherteWerte =
//    JSON.parse(localStorage.getItem("page21Data") || "{}");

// gespeicherteWerte[index] = menge;
// localStorage.setItem("page21Data", JSON.stringify(gespeicherteWerte));

// berechneGesamt21();
// }

// function berechneGesamt21() {

//    let sum = 0;

//    document.querySelectorAll("#page-21 .col-e").forEach(el => {
//        const wert = parseFloat(
//            el.innerText.replace("€","")
//                      .replace(/\./g,"")
//                     .replace(",",".")
//                     .trim()
//     ) || 0;
//     sum += wert;
//  });

//  saveSeitenSumme("page-21", sum);

// const gesamtDiv = document.getElementById("gesamtSumme21");
// if (gesamtDiv) {
//     gesamtDiv.innerText =
//          "Gesamtsumme Angebot: " +
//         getGesamtAngebotssumme().toLocaleString("de-DE",{minimumFractionDigits:2}) + " €";
// }
// }

// -----------------------------
// Eingabefelder - 0 entfernen bei Eingabe
// -----------------------------

//    function setupAutoClearZeroInputs() {
//      document.addEventListener("focusin", (e) => {
/// /        const el = e.target;
//       if (el && el.classList && el.classList.contains("menge-input")) {
//         if (el.value === "0") el.value = "";
//        }
//     });

// Optional: falls man mit Wheel/Arrow Keys aus Versehen wieder 0 reinbekommt
//    document.addEventListener("input", (e) => {
//      const el = e.target;
//      if (el && el.classList && el.classList.contains("menge-input")) {
//        if (el.value === "0") {
// wenn wirklich 0 eingegeben wurde, lassen wir es drin -> daher NICHT löschen
//       }
//      }
//    });
//  }

// setupAutoClearZeroInputs();

// -----------------------------
// Spaltenüberschriften
// -----------------------------

function renderTableHeader() {
    return `
    <div class="row table-header">
      <div></div>
      <div>Beschreibung</div>
      <div>Einheit</div>
      <div style="text-align:center;">Menge</div>
      <div style="text-align:right;">Preis / Einheit</div>
      <div style="text-align:right;">Positionsergebnis</div>
    </div>
  `;
}

// -----------------------------
// Blob - Button - PDF download / teilen 
// -----------------------------

async function sharePdf() {
    // ---- Mobile-Fix: html2canvas rendert sonst gerne "aus der Mitte" ----
    const oldScrollX = window.scrollX || 0;
    const oldScrollY = window.scrollY || 0;

    // Seite nach ganz oben, damit Canvas sauber rendert
    window.scrollTo(0, 0);
    await new Promise(r => requestAnimationFrame(r));

    const h2p = window.html2pdf;
    if (!h2p) {
        alert("html2pdf ist nicht geladen. Prüfe: Script-Tag in index.html muss VOR app.js stehen und darf nicht geblockt werden.");
        window.scrollTo(oldScrollX, oldScrollY);
        return;
    }

    const el = document.getElementById("page-40");

    // Warten bis Seite 40 komplett aufgebaut ist (wichtig fürs Smartphone!)
    if (typeof page40Promise !== "undefined" && page40Promise) {
        await page40Promise;
        // kurzer Render-Puffer
        await new Promise(r => setTimeout(r, 150));
    }

    if (!el) {
        alert("Seite 40 nicht gefunden.");
        window.scrollTo(oldScrollX, oldScrollY);
        return;
    }

    const angebotTyp = localStorage.getItem("angebotTyp") || "kv";
    const datum = new Date().toLocaleDateString("de-DE").replaceAll(".", "-");
    const filename = (angebotTyp === "anfrage")
        ? `Anfrage_${datum}.pdf`
        : `Kostenvoranschlag_${datum}.pdf`;

    document.body.classList.add("pdf-mode");

    // Logo nur fürs PDF in Seite 40 klonen
    let tempLogo = null;
    const existingLogo = document.querySelector("img.logo");
    if (existingLogo) {
        tempLogo = existingLogo.cloneNode(true);
        tempLogo.classList.add("temp-pdf-logo");
        el.insertBefore(tempLogo, el.firstChild);
    }

    await new Promise(r => requestAnimationFrame(r));

    // Desktop-Erkennung: hier KEIN navigator.share() verwenden
    const isMobile =
        /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
        (navigator.maxTouchPoints > 1 && window.matchMedia("(max-width: 1024px)").matches);

    try {
        const opt = {
            margin: 10,
            image: { type: "jpeg", quality: 0.98 },
            html2canvas: {
                scale: 2,
                useCORS: true,
                backgroundColor: "#ffffff",
                scrollX: 0,
                scrollY: 0,
                windowWidth: document.documentElement.scrollWidth,
                windowHeight: document.documentElement.scrollHeight
            },
            pagebreak: { mode: ["css", "legacy"] },
            jsPDF: { unit: "mm", format: "a4", orientation: "portrait" }
        };

        const worker = h2p().set(opt).from(el).toPdf();
        const pdf = await worker.get("pdf");
        if (!pdf) throw new Error("PDF-Objekt ist null.");

        const blob = pdf.output("blob");
        const file = new File([blob], filename, { type: "application/pdf" });

        // 1) NUR AUF MOBILE teilen versuchen (damit auf Windows nicht dieses Share-Fenster aufgeht)
        if (isMobile && navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
            try {
                await navigator.share({ title: filename, text: "PDF", files: [file] });
                return;
            } catch (e) {
                console.warn("Mobile Share blockiert/abgebrochen, Fallback:", e);
                // Fallback unten
            }
        }

        // 2) Fallback: Öffnen + Download (Desktop immer, Mobile wenn Share nicht geht)
        const url = URL.createObjectURL(blob);

        // Öffnen ist oft der bequemste Weg, um danach in Outlook/WhatsApp manuell anzuhängen
        window.open(url, "_blank", "noopener");

        // Download als verlässlicher Pfad (vor allem für Outlook)
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();

        setTimeout(() => URL.revokeObjectURL(url), 30000);

    } catch (err) {
        console.error("sharePdf Fehler:", err);
        alert("PDF konnte nicht erstellt/geteilt werden:\n" + (err?.message || err));
    } finally {
        if (tempLogo) tempLogo.remove();
        document.body.classList.remove("pdf-mode");
        window.scrollTo(oldScrollX, oldScrollY);
    }
}

window.sharePdf = sharePdf;

// -----------------------------
// showLoader40 - EIERUHR 
// -----------------------------

function showLoader40(show) {
    const l = document.getElementById("loader40");
    if (!l) return;
    l.classList.toggle("hidden", !show);
}

// -----------------------------

window.addEventListener("popstate", (e) => {
    const page = e.state?.page;

    if (!page) return;

    // Sicherheit: Login-Seite blockieren, wenn eingeloggt
    if (page === "page-login" && auth.currentUser) {
        showPage("page-3", true);
        return;
    }

    showPage(page, true);
});

function getInitialPage() {
    const hash = location.hash.replace("#", "");
    return hash || "page-3";
}

// -----------------------------

document.body.addEventListener("mousemove", () => remaining = 600);
document.body.addEventListener("keydown", () => remaining = 600);

// -----------------------------
// Funktionen für HTML global verfügbar machen
// -----------------------------

window.login = login;
window.forgotPassword = forgotPassword;
window.savePassword = savePassword;
window.exportLoginLog = exportLoginLog;
window.showPage = showPage;
window.clearInputs = clearInputs;
window.goToChange = goToChange;
window.logout = logout;
window.submitPage5 = submitPage5;
window.direktZumAngebot = direktZumAngebot;
// window.calcRow8 = calcRow8;
window.printPage40 = printPage40;
window.sendMailPage40 = sendMailPage40;
// window.calcRowPage14 = calcRowPage14;
// window.saveSeitenSumme = saveSeitenSumme;
// window.getGesamtAngebotssumme = getGesamtAngebotssumme;
// window.loadPage14 = loadPage14;
// window.berechneGesamt14 = berechneGesamt14;
// window.loadPage143 = loadPage143;
// window.calcRow143 = calcRow143;
// window.berechneGesamt143 = berechneGesamt143;
window.savePage5Data = savePage5Data;
window.loadPage40 = loadPage40;
window.clearInputs = clearInputs;
// window.loadPage142 = loadPage142;
// window.calcRow142 = calcRow142;
// window.berechneGesamt142 = berechneGesamt142;
// window.loadPage8 = loadPage8;
// window.berechneGesamt8 = berechneGesamt8;
// window.loadPage18 = loadPage18;
// window.calcRow18 = calcRow18;
// window.berechneGesamt18 = berechneGesamt18;
// window.loadPage20 = loadPage20;
// window.calcRow20 = calcRow20;
// window.berechneGesamt20 = berechneGesamt20;
// window.loadPage21 = loadPage21;
// window.calcRow21 = calcRow21;
// window.berechneGesamt21 = berechneGesamt21;
// window.loadPage22 = loadPage22;
// window.calcRow22 = calcRow22;
// window.berechneGesamt22 = berechneGesamt22;
// window.loadPage9 = loadPage9;
// window.calcRow9 = calcRow9;
// window.berechneGesamt9 = berechneGesamt9;
// window.loadPage10 = loadPage10;
// window.calcRow10 = calcRow10;
// window.berechneGesamt10 = berechneGesamt10;
// window.loadPage23 = loadPage23;
// window.calcRow23 = calcRow23;
// window.berechneGesamt23 = berechneGesamt23;
// window.loadPage24 = loadPage24;
// window.calcRow24 = calcRow24;
// window.berechneGesamt24 = berechneGesamt24;
// window.loadPage25 = loadPage25;
// window.calcRow25 = calcRow25;
// window.berechneGesamt25 = berechneGesamt25;
// window.loadPage27 = loadPage27;
// window.calcRow27 = calcRow27;
// window.berechneGesamt27 = berechneGesamt27;
// window.loadPage28 = loadPage28;
// window.calcRow28 = calcRow28;
// window.berechneGesamt28 = berechneGesamt28;
// window.loadPage30 = loadPage30;
// window.calcRow30 = calcRow30;
// window.berechneGesamt30 = berechneGesamt30;
// window.loadPage31 = loadPage31;
// window.calcRow31 = calcRow31;
// window.berechneGesamt31 = berechneGesamt31;
// window.loadPage32 = loadPage32;
// window.calcRow32 = calcRow32;
// window.berechneGesamt32 = berechneGesamt32;
// window.loadPage33 = loadPage33;
// window.calcRow33 = calcRow33;
// window.berechneGesamt33 = berechneGesamt33;
// window.loadPage13 = loadPage13;
// window.calcRow13 = calcRow13;
// window.berechneGesamt13 = berechneGesamt13;
// window.toggleKomplettFlow = toggleKomplettFlow;
