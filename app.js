document.documentElement.classList.add("js");

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

    // Upload-Dateien aus altem Stand löschen
    void clearUploadedFilesFromStorage();

    // Nur deine Eingabe-/Angebotsdaten löschen (Auth bleibt erhalten!)
    const keysToRemove = [
        "page5Data",
        "angebotTyp",
        "uploadedFiles"
    ];

    keysToRemove.forEach(k => localStorage.removeItem(k));
}




// -----------------------------
// Firebase - E-Mail+Passwort
// -----------------------------

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";

import {
    getStorage,
    ref as storageRef,
    uploadBytes,
    uploadBytesResumable,
    deleteObject
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-storage.js";

import {
    getFunctions,
    httpsCallable
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-functions.js";

const firebaseConfig = {
    apiKey: "AIzaSyDO8sb2v488jel3LuLCsE7-t40Rhf-aoT0",
    authDomain: "ndf-digicheck-fbh.firebaseapp.com",
    projectId: "ndf-digicheck-fbh",
    storageBucket: "ndf-digicheck-fbh.firebasestorage.app",
    messagingSenderId: "165203818651",
    appId: "1:165203818651:web:4a5b72bb52a4b283786e3e",
    measurementId: "G-6S2XTBJRYJ"
};

const blazeConfig = {
    apiKey: "AIzaSyCcHI5sGR7sFwrWRpo2uQ3Plm0HpTvqr30",
    authDomain: "kalkpro-4cc29.firebaseapp.com",
    projectId: "kalkpro-4cc29",
    storageBucket: "kalkpro-4cc29.firebasestorage.app",
    messagingSenderId: "185447466021",
    appId: "1:185447466021:web:e0d0720fae971b4ab52bcc",
    measurementId: "G-V4SF92V16K"
};

const fbApp = initializeApp(firebaseConfig);
const blazeApp = initializeApp(blazeConfig, "blazeApp");
const blazeStorage = getStorage(blazeApp);
const blazeFunctions = getFunctions(blazeApp, "europe-west1");

let uploadedFiles = JSON.parse(localStorage.getItem("uploadedFiles") || "[]");
let page40Promise = null;
resetStoredInputsOnReload();

document.addEventListener("DOMContentLoaded", () => {
    const app = document.getElementById("app");
    app?.classList.remove("hidden");

    const fileInput = document.getElementById("request-files");
    if (fileInput) {
        fileInput.addEventListener("change", handleFileUpload);
    }

    renderFileList();

    const startPage = location.hash.replace("#", "") || "page-start";
    showPage(startPage, true);
});




// -----------------------------
// allgemeine Hinweise-Checkbox Gate (Login + Registrierung)
// (ohne Persistenz: nach Reload wieder leer, Haken frei entfernbar)
// -----------------------------



document.addEventListener("DOMContentLoaded", () => {
    const fileInput = document.getElementById("request-files");
    if (!fileInput) return;

    fileInput.addEventListener("change", handleFileUpload);

    renderFileList();
});

// -----------------------------
// showPage
// -----------------------------

async function showPage(id, fromHistory = false) {
    if (!fromHistory) {
        history.pushState({ page: id }, "", "#" + id);
    }

    document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));

    const el = document.getElementById(id);
    if (!el) return;

    el.classList.add("active");

    if (id === "page-40") {
        showLoader40(true);
        try {
            page40Promise = loadPage40();
            await page40Promise;
        } finally {
            showLoader40(false);
        }
    }
}

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

    syncBesichtigungToPage21();
}

// -----------------------------
// Funktion zur Prüfung der Pflichteingaben auf Seite 5 (Kopfdaten für Anfrage) + speichern
// -----------------------------

function submitPage5() {

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
    localStorage.setItem("angebotTyp", "anfrage");

    showPage("page-40");
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
// SEITE 5 – Uplad-Funktion
// -----------------------------

function getRequesterEmail() {
    return (document.getElementById("shk-email")?.value || "").trim().toLowerCase();
}

function getRequesterKey() {
    const mail = getRequesterEmail();
    return (mail || "unknown").replace(/[^a-z0-9._-]/g, "_");
}

async function handleFileUpload(event) {
    const files = Array.from(event.target.files);

    const progressContainer = document.getElementById("upload-progress-container");
    const progressBar = document.getElementById("upload-progress-bar");
    const progressText = document.getElementById("upload-progress-text");

    const currentTotal = getUploadedFilesTotalSize();
    const newFilesTotal = files.reduce((sum, file) => sum + file.size, 0);
    const maxTotalSize = 10 * 1024 * 1024;

    if (currentTotal + newFilesTotal > maxTotalSize) {
        showHinweis("Die maximale Gesamtgröße aller hochgeladenen Dateien beträgt 10 MB.");
        event.target.value = "";
        return;
    }

    for (const file of files) {

        try {
            const requesterKey = getRequesterKey();
            const path = `requests/${requesterKey}/attachments/${Date.now()}_${file.name}`;

            const fileRef = storageRef(blazeStorage, path);

            const uploadTask = uploadBytesResumable(fileRef, file);



            progressContainer.style.display = "block";

            await new Promise((resolve, reject) => {
                uploadTask.on(
                    "state_changed",
                    (snapshot) => {
                        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                        progressBar.style.width = progress + "%";
                        progressText.innerText = Math.round(progress) + " %";
                    },
                    (error) => {
                        reject(error);
                    },
                    () => {
                        progressBar.style.width = "100%";
                        progressText.innerText = "Upload abgeschlossen";
                        resolve();
                    }
                );
            });

            uploadedFiles.push({
                name: file.name,
                path: path,
                size: file.size
            });

        } catch (err) {
            console.error("Upload Fehler:", err);
            showHinweis("Fehler beim Hochladen: " + file.name);
        }
    }

    localStorage.setItem("uploadedFiles", JSON.stringify(uploadedFiles));

    renderFileList();

    // Input zurücksetzen (damit gleiche Datei erneut gewählt werden kann)
    event.target.value = "";

    setTimeout(() => {
        progressBar.style.width = "0%";
        progressText.innerText = "0%";
        progressContainer.style.display = "none";
    }, 1000);
}

function getUploadedFilesTotalSize() {
    return uploadedFiles.reduce((sum, file) => sum + (file.size || 0), 0);
}



// SEITE 5 – Anzeige der Dateien

function renderFileList() {
    const container = document.getElementById("file-list");
    if (!container) return;

    container.innerHTML = "";

    uploadedFiles.forEach((file, index) => {
        const div = document.createElement("div");
        div.className = "file-item";

        div.innerHTML = `
  <span class="file-name">${file.name}</span>
  <button type="button" onclick="removeFile(${index})">Entfernen</button>
`;

        container.appendChild(div);
    });
}

// SEITE 5 – Entfernen der Dateien

async function removeFile(index) {
    const file = uploadedFiles[index];

    try {
        const fileRef = storageRef(blazeStorage, file.path);
        await deleteObject(fileRef);
    } catch (err) {
        console.warn("Datei konnte nicht gelöscht werden:", err);
    }

    uploadedFiles.splice(index, 1);

    localStorage.setItem("uploadedFiles", JSON.stringify(uploadedFiles));

    renderFileList();
}

window.removeFile = removeFile;

// SEITE 5 – Löschfunktion der Upload-Dateien

async function clearUploadedFilesFromStorage() {
    const files = JSON.parse(localStorage.getItem("uploadedFiles") || "[]");

    for (const file of files) {
        if (!file?.path) continue;

        try {
            const fileRef = storageRef(blazeStorage, file.path);
            await deleteObject(fileRef);
        } catch (err) {
            console.warn("Datei konnte nicht aus Storage gelöscht werden:", file?.name, err);
        }
    }

    localStorage.removeItem("uploadedFiles");

    const fileInput = document.getElementById("request-files");
    if (fileInput) fileInput.value = "";

    if (typeof uploadedFiles !== "undefined") {
        uploadedFiles = [];
    }

    if (typeof renderFileList === "function") {
        renderFileList();
    }
}

window.clearUploadedFilesFromStorage = clearUploadedFilesFromStorage

// -----------------------------
// SEITE 40 – Ausgabeseite Anfrage
// -----------------------------

function renderHinweisLine(colA, colB) {
    const text = (colB || "").trim();
    if (!text) return "";

    if (colA === "Titel") return `<div class="title">${text}</div>`;
    if (colA === "Untertitel") return `<div class="subtitle">${text}</div>`;
    if (colA === "Zwischentitel") return `<div class="midtitle">${text}</div>`;

    // “Beschreibungstext”-Zeilen (no-price)
    return `<div class="hinweis-row">${text}</div>`;
}

async function loadPage40() {

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

        const uploadedFilesSection = document.getElementById("uploaded-files-section");
        const uploadedFilesSummary = document.getElementById("uploaded-files-summary");

        if (uploadedFilesSection && uploadedFilesSummary) {
            const files = JSON.parse(localStorage.getItem("uploadedFiles") || "[]");

            if (files.length > 0) {
                uploadedFilesSummary.innerHTML = files
                    .map(file => `<div style="margin:6px 0;">• ${file.name}</div>`)
                    .join("");
                uploadedFilesSection.style.display = "block";
            } else {
                uploadedFilesSummary.innerHTML = "";
                uploadedFilesSection.style.display = "none";
            }
        }

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
}

// -----------------------------
// clearInputs - Button "Eingaben löschen"
// -----------------------------

async function clearInputs() {

    await clearUploadedFilesFromStorage();

    localStorage.clear();
    localStorage.removeItem("page5Data");
    localStorage.removeItem("angebotTyp");
    localStorage.removeItem("uploadedFiles");


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

    updateAdminUI_();

}

window.clearInputs = clearInputs

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

async function buildPage40PdfBlob() {
    const oldScrollX = window.scrollX || 0;
    const oldScrollY = window.scrollY || 0;

    // Seite nach ganz oben, damit html2canvas sauber rendert
    window.scrollTo(0, 0);
    await new Promise(r => requestAnimationFrame(r));

    const h2p = window.html2pdf;
    if (!h2p) {
        window.scrollTo(oldScrollX, oldScrollY);
        throw new Error("html2pdf ist nicht geladen. Prüfe: Script-Tag in index.html muss VOR app.js stehen und darf nicht geblockt werden.");
    }

    const el = document.getElementById("page-40");
    if (!el) {
        window.scrollTo(oldScrollX, oldScrollY);
        throw new Error("Seite 40 nicht gefunden.");
    }

    // Warten bis Seite 40 komplett aufgebaut ist
    if (typeof page40Promise !== "undefined" && page40Promise) {
        await page40Promise;
        await new Promise(r => setTimeout(r, 150));
    }

    const angebotTyp = localStorage.getItem("angebotTyp") || "kv";
    const datum = new Date().toLocaleDateString("de-DE").replaceAll(".", "-");
    const filename = (angebotTyp === "anfrage")
        ? `Anfrage_${datum}.pdf`
        : `Kostenvoranschlag_${datum}.pdf`;

    document.body.classList.add("pdf-mode");

    let tempLogo = null;
    const existingLogo = document.querySelector("img.logo");
    if (existingLogo) {
        tempLogo = existingLogo.cloneNode(true);
        tempLogo.classList.add("temp-pdf-logo");
        el.insertBefore(tempLogo, el.firstChild);
    }

    await new Promise(r => requestAnimationFrame(r));

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

        return { blob, filename };

    } finally {
        if (tempLogo) tempLogo.remove();
        document.body.classList.remove("pdf-mode");
        window.scrollTo(oldScrollX, oldScrollY);
    }
}

window.buildPage40PdfBlob = buildPage40PdfBlob;

async function sendRequestPdfByEmail() {
    const angebotTyp = localStorage.getItem("angebotTyp") || "kv";
    if (angebotTyp !== "anfrage") {
        showHinweis("Der PDF-Versand ist nur für Anfragen vorgesehen.");
        return;
    }

    const page5Data = JSON.parse(localStorage.getItem("page5Data") || "{}");
    const requesterEmail = (page5Data["shk-email"] || "").trim().toLowerCase();

    if (!requesterEmail) {
        showHinweis("Bitte geben Sie auf Seite 5 eine SHK-E-Mail-Adresse an.");
        return;
    }

    try {
        showLoader40(true);

        if (typeof page40Promise !== "undefined" && page40Promise) {
            await page40Promise;
            await new Promise(r => setTimeout(r, 150));
        }

        const { blob, filename } = await buildPage40PdfBlob();

        if (!blob || !filename) {
            throw new Error("PDF konnte nicht erzeugt werden.");
        }

        const requesterKey = requesterEmail.replace(/[^a-z0-9._-]/g, "_");
        const path = `requests/${requesterKey}/${Date.now()}_${filename}`;

        const fileRef = storageRef(blazeStorage, path);
        await uploadBytes(fileRef, blob, {
            contentType: "application/pdf"
        });

        const uploadedFiles = JSON.parse(localStorage.getItem("uploadedFiles") || "[]");
        const totalSize = uploadedFiles.reduce((sum, f) => sum + (f.size || 0), 0);

        if (totalSize > 10 * 1024 * 1024) {
            showHinweis("Die Gesamtgröße der Dateien ist zu groß für den Versand (max. 10 MB).");
            return;
        }

        const sendPdfMail = httpsCallable(blazeFunctions, "sendRequestPdfMail");
        await sendPdfMail({
            storagePath: path,
            filename: filename,
            to: "pascal.gasch@tpholding.de",
            cc: requesterEmail,
            requesterEmail: requesterEmail,
            angebotTyp: angebotTyp,
            shkName: page5Data["shk-name"] || "",
            shkContact: page5Data["shk-contact"] || "",
            shkEmail: requesterEmail,
            siteAddress: page5Data["site-address"] || "",
            offerDate: page5Data["offer-date"] || "",
            executionDate: page5Data["execution-date"] || "",
            attachmentFiles: uploadedFiles
        });

        showHinweis("Die Anfrage wurde erfolgreich per E-Mail versendet.");
    } catch (err) {
        console.error("sendRequestPdfByEmail Fehler:", err);
        showHinweis("Die Anfrage konnte nicht versendet werden:\n" + (err?.message || err));
    } finally {
        showLoader40(false);
    }
}

window.sendRequestPdfByEmail = sendRequestPdfByEmail;

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
    showPage(page, true);
});

function getInitialPage() {
    const hash = location.hash.replace("#", "");
    return hash || "page-start";
}

// -----------------------------
// Funktionen für HTML global verfügbar machen
// -----------------------------

window.showPage = showPage;
window.clearInputs = clearInputs;
window.submitPage5 = submitPage5;
window.savePage5Data = savePage5Data;
window.loadPage40 = loadPage40;
window.clearInputs = clearInputs;
