// script.js – das Verhalten der Seite
// Basketball-Statsheet: Statistiken pro Spieler und Viertel erfassen und auswerten

// ---------------------------------------------------------
// 1. Zustand (state): Das ist alles, was die App sich merkt
// ---------------------------------------------------------

// Liste der Spieler (Rückennummer oder Vorname), z. B. ["Nr. 7", "Nr. 33"]
let spielerListe = [];

// Liste der Statistiken: pro Spieler und Viertel ein Objekt
// z. B. { spieler: "Nr. 7", viertel: 1, punkte: 0, rebounds: 0, ... }
let statistiken = [];

// Das Viertel, in dem wir gerade erfassen (1 bis 4)
let aktuellesViertel = 1;

// Welcher Spieler ist im Erfassen-Fenster gerade offen? (null = Fenster zu)
let offenerSpieler = null;

// Alle Arten von Statistik mit der Beschriftung für die Anzeige
const statistikArten = [
  { schluessel: "punkte", name: "Punkte" },
  { schluessel: "rebounds", name: "Rebounds" },
  { schluessel: "assists", name: "Assists" },
  { schluessel: "fouls", name: "Fouls" },
  { schluessel: "blocks", name: "Blocks" },
  { schluessel: "steals", name: "Steals" }
];

// Der Schlüssel, unter dem wir im Browser-Speicher (localStorage) speichern
const speicherName = "basketballStatsheet";

// ---------------------------------------------------------
// 2. Elemente aus index.html holen
// ---------------------------------------------------------

const spielerFormular = document.getElementById("spielerFormular");
const spielerEingabe = document.getElementById("spielerEingabe");
const spielerHinweis = document.getElementById("spielerHinweis");
const viertelAuswahl = document.getElementById("viertelAuswahl");
const spielerAuswahl = document.getElementById("spielerAuswahl");
const erfassenDialog = document.getElementById("erfassenDialog");
const dialogTitel = document.getElementById("dialogTitel");
const dialogInhalt = document.getElementById("dialogInhalt");
const dialogSchliessenKnopf = document.getElementById("dialogSchliessenKnopf");
const gesamtTabelle = document.getElementById("gesamtTabelle");
const viertelTabelle = document.getElementById("viertelTabelle");
const druckenKnopf = document.getElementById("druckenKnopf");
const berichtAuswahl = document.getElementById("berichtAuswahl");
const berichtAnzeige = document.getElementById("berichtAnzeige");
const berichtSpeichernKnopf = document.getElementById("berichtSpeichernKnopf");
const zuruecksetzenKnopf = document.getElementById("zuruecksetzenKnopf");

// ---------------------------------------------------------
// 3. Speichern und Laden (localStorage)
// ---------------------------------------------------------

function speichern() {
  const daten = {
    spielerListe: spielerListe,
    statistiken: statistiken,
    aktuellesViertel: aktuellesViertel
  };
  try {
    localStorage.setItem(speicherName, JSON.stringify(daten));
  } catch (fehler) {
    // Speichern hat nicht geklappt – die App läuft trotzdem weiter
    console.log("Speichern nicht möglich:", fehler);
  }
}

function laden() {
  try {
    const text = localStorage.getItem(speicherName);
    if (text === null) {
      return; // noch nichts gespeichert
    }
    const daten = JSON.parse(text);
    spielerListe = daten.spielerListe || [];
    statistiken = daten.statistiken || [];
    aktuellesViertel = daten.aktuellesViertel || 1;
    sortiereSpieler();
  } catch (fehler) {
    console.log("Laden nicht möglich:", fehler);
  }
}

// ---------------------------------------------------------
// 4. Hilfsfunktionen
// ---------------------------------------------------------

// Sortiert die Spieler nach Nummer: "Nr. 7" kommt vor "Nr. 33".
// numeric: true sorgt dafür, dass Zahlen als Zahlen verglichen werden.
function sortiereSpieler() {
  spielerListe.sort(function (a, b) {
    return a.localeCompare(b, "de", { numeric: true });
  });
}

// Namen unschädlich machen, bevor wir sie in HTML einsetzen
function maskiere(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Gibt die Statistik eines Spielers in einem Viertel zurück.
// Gibt es sie noch nicht, wird sie neu angelegt (mit lauter Nullen).
function holeStatistik(spieler, viertel) {
  for (let i = 0; i < statistiken.length; i++) {
    if (statistiken[i].spieler === spieler && statistiken[i].viertel === viertel) {
      return statistiken[i];
    }
  }
  const neu = {
    spieler: spieler,
    viertel: viertel,
    punkte: 0,
    rebounds: 0,
    assists: 0,
    fouls: 0,
    blocks: 0,
    steals: 0
  };
  statistiken.push(neu);
  return neu;
}

// Zählt eine Art (z. B. "punkte") zusammen.
// spieler = null heisst: alle Spieler. viertel = null heisst: alle Viertel.
function summiere(art, spieler, viertel) {
  let summe = 0;
  for (let i = 0; i < statistiken.length; i++) {
    const eintrag = statistiken[i];
    const spielerPasst = spieler === null || eintrag.spieler === spieler;
    const viertelPasst = viertel === null || eintrag.viertel === viertel;
    if (spielerPasst && viertelPasst) {
      summe = summe + eintrag[art];
    }
  }
  return summe;
}

// ---------------------------------------------------------
// 5. Anzeige zeichnen
// ---------------------------------------------------------

// Spielerliste-Hinweis
function zeigeSpielerHinweis() {
  if (spielerListe.length === 0) {
    spielerHinweis.textContent = "Noch keine Spieler. Füge oben Spieler hinzu.";
  } else {
    spielerHinweis.textContent = "Spieler im Team: " + spielerListe.join(", ");
  }
}

// Die vier Knöpfe für die Viertel
function zeigeViertelAuswahl() {
  let html = "";
  for (let viertel = 1; viertel <= 4; viertel++) {
    let klasse = "";
    if (viertel === aktuellesViertel) {
      klasse = "aktiv";
    }
    html += '<button class="' + klasse + '" data-viertel="' + viertel + '">' + viertel + '. Viertel</button>';
  }
  viertelAuswahl.innerHTML = html;
}

// Eine kleine Taste pro Spieler (nimmt wenig Platz ein)
function zeigeSpielerAuswahl() {
  let html = "";
  for (let i = 0; i < spielerListe.length; i++) {
    html += '<button data-spieler="' + i + '">' + maskiere(spielerListe[i]) + "</button>";
  }
  spielerAuswahl.innerHTML = html;
}

// Der Inhalt des Fensters: die Knöpfe für den gewählten Spieler
function zeigeDialogInhalt() {
  if (offenerSpieler === null) {
    return;
  }
  const spieler = offenerSpieler;
  const statistik = holeStatistik(spieler, aktuellesViertel);
  dialogTitel.textContent = spieler + " · " + aktuellesViertel + ". Viertel";

  let html = "";
  for (let a = 0; a < statistikArten.length; a++) {
    const art = statistikArten[a];
    html += '<div class="statistik-zeile">';
    html += '<span class="statistik-name">' + art.name + '</span>';
    html += '<button data-art="' + art.schluessel + '" data-aenderung="-1">−1</button>';
    html += '<span class="statistik-wert">' + statistik[art.schluessel] + '</span>';

    if (art.schluessel === "punkte") {
      // Punkte gibt es in 1, 2 oder 3
      html += '<button data-art="punkte" data-aenderung="1">+1</button>';
      html += '<button data-art="punkte" data-aenderung="2">+2</button>';
      html += '<button data-art="punkte" data-aenderung="3">+3</button>';
    } else {
      html += '<button data-art="' + art.schluessel + '" data-aenderung="1">+1</button>';
    }
    html += '</div>';
  }
  html += '<div class="dialog-fuss"><button class="gefahr" data-aktion="entfernen">Spieler entfernen</button></div>';
  dialogInhalt.innerHTML = html;
}

// Tabelle: Summen pro Spieler über das ganze Spiel
function zeigeGesamtTabelle() {
  if (spielerListe.length === 0) {
    gesamtTabelle.innerHTML = "<p>Noch keine Daten.</p>";
    return;
  }
  let html = '<div class="tabellen-rahmen"><table><tr><th>Spieler</th>';
  for (let a = 0; a < statistikArten.length; a++) {
    html += "<th>" + statistikArten[a].name + "</th>";
  }
  html += "</tr>";

  for (let i = 0; i < spielerListe.length; i++) {
    html += "<tr><td>" + maskiere(spielerListe[i]) + "</td>";
    for (let a = 0; a < statistikArten.length; a++) {
      html += "<td>" + summiere(statistikArten[a].schluessel, spielerListe[i], null) + "</td>";
    }
    html += "</tr>";
  }

  // Letzte Zeile: das ganze Team
  html += "<tr><th>Team</th>";
  for (let a = 0; a < statistikArten.length; a++) {
    html += "<th>" + summiere(statistikArten[a].schluessel, null, null) + "</th>";
  }
  html += "</tr>";

  html += "</table></div>";
  gesamtTabelle.innerHTML = html;
}

// Tabelle: Team-Summen pro Viertel
function zeigeViertelTabelle() {
  let html = '<div class="tabellen-rahmen"><table><tr><th>Viertel</th>';
  for (let a = 0; a < statistikArten.length; a++) {
    html += "<th>" + statistikArten[a].name + "</th>";
  }
  html += "</tr>";

  for (let viertel = 1; viertel <= 4; viertel++) {
    html += "<tr><td>" + viertel + ". Viertel</td>";
    for (let a = 0; a < statistikArten.length; a++) {
      html += "<td>" + summiere(statistikArten[a].schluessel, null, viertel) + "</td>";
    }
    html += "</tr>";
  }
  html += "</table></div>";
  viertelTabelle.innerHTML = html;
}

// Baut die Tabelle für den Bericht eines einzelnen Spielers
function baueBerichtTabelle(spieler) {
  let html = "<table><tr><th>Viertel</th>";
  for (let a = 0; a < statistikArten.length; a++) {
    html += "<th>" + statistikArten[a].name + "</th>";
  }
  html += "</tr>";

  for (let viertel = 1; viertel <= 4; viertel++) {
    // data-viertel brauchen wir für den Filter in der HTML-Datei
    html += '<tr data-viertel="' + viertel + '"><td>' + viertel + ". Viertel</td>";
    for (let a = 0; a < statistikArten.length; a++) {
      html += "<td>" + summiere(statistikArten[a].schluessel, spieler, viertel) + "</td>";
    }
    html += "</tr>";
  }

  html += "<tr><th>Gesamt (alle Viertel)</th>";
  for (let a = 0; a < statistikArten.length; a++) {
    html += "<th>" + summiere(statistikArten[a].schluessel, spieler, null) + "</th>";
  }
  html += "</tr></table>";
  return html;
}

// Auswahl und Anzeige des Spielerberichts
function zeigeBericht() {
  // Die bisher gewählte Person merken, damit die Auswahl nicht springt
  const gewaehlt = berichtAuswahl.value;

  let optionen = "";
  for (let i = 0; i < spielerListe.length; i++) {
    optionen += '<option value="' + i + '">' + maskiere(spielerListe[i]) + "</option>";
  }
  berichtAuswahl.innerHTML = optionen;

  if (spielerListe.length === 0) {
    berichtAnzeige.innerHTML = "<p>Noch keine Spieler.</p>";
    return;
  }

  if (gewaehlt !== "" && Number(gewaehlt) < spielerListe.length) {
    berichtAuswahl.value = gewaehlt;
  }
  const spieler = spielerListe[Number(berichtAuswahl.value)];
  berichtAnzeige.innerHTML = '<div class="tabellen-rahmen"><h3>' + maskiere(spieler) + "</h3>" +
    baueBerichtTabelle(spieler) + "</div>";
}

// Alles neu zeichnen
function zeigeAlles() {
  zeigeSpielerHinweis();
  zeigeViertelAuswahl();
  zeigeSpielerAuswahl();
  zeigeDialogInhalt();
  zeigeGesamtTabelle();
  zeigeViertelTabelle();
  zeigeBericht();
}

// ---------------------------------------------------------
// 6. Auf Klicks reagieren
// ---------------------------------------------------------

// Spieler hinzufügen
spielerFormular.addEventListener("submit", function (ereignis) {
  ereignis.preventDefault(); // Seite nicht neu laden

  const name = spielerEingabe.value.trim();
  if (name === "") {
    return;
  }
  if (spielerListe.includes(name)) {
    alert("Diesen Spieler gibt es schon.");
    return;
  }
  spielerListe.push(name);
  sortiereSpieler(); // neue Spieler gleich an die richtige Stelle
  spielerEingabe.value = "";
  speichern();
  zeigeAlles();
});

// Viertel wechseln
viertelAuswahl.addEventListener("click", function (ereignis) {
  const knopf = ereignis.target.closest("button");
  if (knopf === null) {
    return;
  }
  aktuellesViertel = Number(knopf.dataset.viertel);
  speichern();
  zeigeAlles();
});

// Klick auf eine Spielernummer: Das Fenster zum Erfassen öffnen
spielerAuswahl.addEventListener("click", function (ereignis) {
  const knopf = ereignis.target.closest("button");
  if (knopf === null) {
    return;
  }
  offenerSpieler = spielerListe[Number(knopf.dataset.spieler)];
  zeigeDialogInhalt();
  erfassenDialog.showModal();
});

// Fenster schliessen (Knopf oder Esc-Taste)
dialogSchliessenKnopf.addEventListener("click", function () {
  erfassenDialog.close();
});

erfassenDialog.addEventListener("close", function () {
  offenerSpieler = null;
  zeigeAlles(); // Tabellen und Berichte aktualisieren
});

// Klicks im Fenster: Zähler ändern oder Spieler entfernen
dialogInhalt.addEventListener("click", function (ereignis) {
  const knopf = ereignis.target.closest("button");
  if (knopf === null || offenerSpieler === null) {
    return;
  }
  const spieler = offenerSpieler;

  if (knopf.dataset.aktion === "entfernen") {
    if (confirm(spieler + " und alle Statistiken entfernen?")) {
      spielerListe = spielerListe.filter(function (name) {
        return name !== spieler;
      });
      statistiken = statistiken.filter(function (eintrag) {
        return eintrag.spieler !== spieler;
      });
      speichern();
      erfassenDialog.close(); // zeigt danach alles neu an
    }
    return;
  }

  // Zähler erhöhen oder verringern (nie unter 0)
  const statistik = holeStatistik(spieler, aktuellesViertel);
  const art = knopf.dataset.art;
  const aenderung = Number(knopf.dataset.aenderung);
  statistik[art] = Math.max(0, statistik[art] + aenderung);
  speichern();
  zeigeAlles();
});

// Anderen Spieler im Bericht wählen
berichtAuswahl.addEventListener("change", zeigeBericht);

// Spielbericht drucken bzw. als PDF speichern (macht der Browser)
druckenKnopf.addEventListener("click", function () {
  window.print();
});

// Spielerbericht als eigene HTML-Datei herunterladen
berichtSpeichernKnopf.addEventListener("click", function () {
  if (spielerListe.length === 0) {
    return;
  }
  const spieler = spielerListe[Number(berichtAuswahl.value)];
  const seite = "<!DOCTYPE html><html lang=\"de\"><head><meta charset=\"UTF-8\">" +
    "<title>Bericht " + maskiere(spieler) + "</title>" +
    "<style>body{font-family:Arial,sans-serif;margin:24px}" +
    "table{border-collapse:collapse}th,td{border:1px solid #ccc;padding:6px 10px;text-align:center}" +
    "th{background:#f0f0f0}</style></head><body>" +
    "<h1>Spielbericht: " + maskiere(spieler) + "</h1>" +
    // Interaktiv: Mit der Auswahl blendet man einzelne Viertel ein oder aus
    '<p><label for="filter">Anzeigen: </label><select id="filter">' +
    '<option value="alle">Alle Viertel</option>' +
    '<option value="1">1. Viertel</option><option value="2">2. Viertel</option>' +
    '<option value="3">3. Viertel</option><option value="4">4. Viertel</option>' +
    "</select></p>" +
    baueBerichtTabelle(spieler) +
    "<script>" +
    'document.getElementById("filter").addEventListener("change", function () {' +
    "  var wahl = this.value;" +
    '  var zeilen = document.querySelectorAll("tr[data-viertel]");' +
    "  for (var i = 0; i < zeilen.length; i++) {" +
    '    var zeigen = wahl === "alle" || zeilen[i].dataset.viertel === wahl;' +
    '    zeilen[i].style.display = zeigen ? "" : "none";' +
    "  }" +
    "});" +
    "<" + "/script>" +
    "</body></html>";

  const datei = new Blob([seite], { type: "text/html" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(datei);
  link.download = "bericht.html";
  link.click();
  URL.revokeObjectURL(link.href);
});

// Neues Spiel: alles löschen
zuruecksetzenKnopf.addEventListener("click", function () {
  if (confirm("Wirklich alle Spieler und Statistiken löschen?")) {
    spielerListe = [];
    statistiken = [];
    aktuellesViertel = 1;
    speichern();
    zeigeAlles();
  }
});

// ---------------------------------------------------------
// 7. Start
// ---------------------------------------------------------

laden();
zeigeAlles();
