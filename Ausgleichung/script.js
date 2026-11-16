// =====================================================================
// Ausgleichung Freie Stationierung (vermittelnde Ausgleichung, 2D)
// Aufbau dieser Datei:
//   Teil A: Rechnen (ohne Anzeige, nur Zahlen)
//   Teil B: Eingaben prüfen
//   Teil C: Anzeige im Browser (Eingabemaske, Tabellen, Matrizen)
// Einheiten: Längen in m, Winkel in gon.
// =====================================================================


// =====================================================================
// TEIL A: RECHNEN
// =====================================================================

// Feste Konstanten (ändern sich nie)
const FESTE_WERTE = {
  erdradius: 6378816,      // R in m
  nUrsprung: 1200000,      // N-Ursprung LV95 in m
  massstabNaeherung: 1     // Näherung für den Massstab m
};

const ROH = 200 / Math.PI;   // Umrechnung rad -> gon

// --- Winkelfunktionen ---

// Zahl auf den Bereich [0, 400) bringen (auch für negative Zahlen richtig)
function modulo400(winkel) {
  return ((winkel % 400) + 400) % 400;
}

// Winkeldifferenz auf [-200, +200) bringen
function wrap(winkel) {
  return modulo400(winkel + 200) - 200;
}

// Azimut (von Nord im Uhrzeigersinn) in gon. Achtung: atan2(y, x) = atan2(dE, dN)
function azimut(dE, dN) {
  return modulo400(Math.atan2(dE, dN) * ROH);
}

// --- Schritt 2: Distanzreduktion ---
function distanzReduktion(punkt, par) {
  const R = FESTE_WERTE.erdradius;
  const dH = punkt.schraegdistanz * Math.sin(punkt.vertikalwinkel * Math.PI / 200);
  const d0 = dH * R / (R + punkt.hoehe);
  const dN = punkt.north - FESTE_WERTE.nUrsprung;
  const dProj = d0 * (1 + (dN * dN) / (2 * R * R));
  return { dH: dH, d0: d0, dProj: dProj };
}

// --- Matrizenrechnung (einfach, mit Schleifen) ---

// N = A^T * P * A  (P ist Diagonale, deshalb nur Gewichte p)
function normalMatrix(A, p) {
  const u = A[0].length;
  const N = [];
  for (let j = 0; j < u; j++) {
    N.push(new Array(u).fill(0));
  }
  for (let i = 0; i < A.length; i++) {
    for (let j = 0; j < u; j++) {
      for (let k = 0; k < u; k++) {
        N[j][k] += p[i] * A[i][j] * A[i][k];
      }
    }
  }
  return N;
}

// n = A^T * P * f
function nVektorBerechnen(A, p, f) {
  const u = A[0].length;
  const n = new Array(u).fill(0);
  for (let i = 0; i < A.length; i++) {
    for (let j = 0; j < u; j++) {
      n[j] += p[i] * A[i][j] * f[i];
    }
  }
  return n;
}

// Matrix (u x u) mal Vektor
function matrixMalVektor(M, v) {
  return M.map(function (zeile) {
    let summe = 0;
    for (let j = 0; j < v.length; j++) {
      summe += zeile[j] * v[j];
    }
    return summe;
  });
}

// Matrix mal Vektor für A (n x u) * x (u)
function aMalX(A, x) {
  return matrixMalVektor(A, x);
}

// Inverse mit Gauss-Jordan und Pivotsuche. Gibt null zurück, wenn nicht lösbar.
// Die Matrix wird vorher skaliert (Diagonale = 1), damit sehr unterschiedlich
// grosse Zahlen (m, gon, Gewichte) die Prüfung nicht stören.
function invertiere(M) {
  const u = M.length;
  const d = [];
  for (let i = 0; i < u; i++) {
    d.push(Math.sqrt(Math.abs(M[i][i])));
    if (!(d[i] > 0)) {
      return null;
    }
  }
  // erweiterte Matrix [S | Einheitsmatrix]
  const E = [];
  for (let i = 0; i < u; i++) {
    const zeile = [];
    for (let j = 0; j < u; j++) {
      zeile.push(M[i][j] / (d[i] * d[j]));
    }
    for (let j = 0; j < u; j++) {
      zeile.push(i === j ? 1 : 0);
    }
    E.push(zeile);
  }
  for (let spalte = 0; spalte < u; spalte++) {
    // Pivot suchen: grösster Betrag in dieser Spalte
    let pivotZeile = spalte;
    for (let i = spalte + 1; i < u; i++) {
      if (Math.abs(E[i][spalte]) > Math.abs(E[pivotZeile][spalte])) {
        pivotZeile = i;
      }
    }
    if (Math.abs(E[pivotZeile][spalte]) < 1e-12) {
      return null;   // singulär
    }
    const tausch = E[spalte];
    E[spalte] = E[pivotZeile];
    E[pivotZeile] = tausch;
    const pivot = E[spalte][spalte];
    for (let j = 0; j < 2 * u; j++) {
      E[spalte][j] /= pivot;
    }
    for (let i = 0; i < u; i++) {
      if (i !== spalte) {
        const faktor = E[i][spalte];
        for (let j = 0; j < 2 * u; j++) {
          E[i][j] -= faktor * E[spalte][j];
        }
      }
    }
  }
  // Skalierung wieder rückgängig machen
  const Q = [];
  for (let i = 0; i < u; i++) {
    const zeile = [];
    for (let j = 0; j < u; j++) {
      zeile.push(E[i][u + j] / (d[i] * d[j]));
    }
    Q.push(zeile);
  }
  return Q;
}

// --- Chi-Quadrat-Quantil (95 %), ohne Bibliothek ---

// Logarithmus der Gammafunktion (Lanczos-Näherung)
function lnGamma(x) {
  const koeff = [676.5203681218851, -1259.1392167224028, 771.32342877765313,
    -176.61502916214059, 12.507343278686905, -0.13857109526572012,
    9.9843695780195716e-6, 1.5056327351493116e-7];
  if (x < 0.5) {
    return Math.log(Math.PI / Math.sin(Math.PI * x)) - lnGamma(1 - x);
  }
  x -= 1;
  let a = 0.99999999999980993;
  const t = x + 7.5;
  for (let i = 0; i < 8; i++) {
    a += koeff[i] / (x + i + 1);
  }
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
}

// Regularisierte untere unvollständige Gammafunktion P(a, x)
function gammaP(a, x) {
  if (x <= 0) {
    return 0;
  }
  if (x < a + 1) {
    // Reihenentwicklung
    let summe = 1 / a;
    let glied = 1 / a;
    for (let n = 1; n < 500; n++) {
      glied *= x / (a + n);
      summe += glied;
      if (Math.abs(glied) < Math.abs(summe) * 1e-16) {
        break;
      }
    }
    return summe * Math.exp(-x + a * Math.log(x) - lnGamma(a));
  }
  // Kettenbruch (liefert Q = 1 - P)
  const winzig = 1e-300;
  let b = x + 1 - a;
  let c = 1 / winzig;
  let d = 1 / b;
  let h = d;
  for (let i = 1; i < 500; i++) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b;
    if (Math.abs(d) < winzig) { d = winzig; }
    c = b + an / c;
    if (Math.abs(c) < winzig) { c = winzig; }
    d = 1 / d;
    const delta = d * c;
    h *= delta;
    if (Math.abs(delta - 1) < 1e-16) {
      break;
    }
  }
  const q = Math.exp(-x + a * Math.log(x) - lnGamma(a)) * h;
  return 1 - q;
}

// Chi-Quadrat-Quantil mit Wahrscheinlichkeit 0.95 für f Freiheitsgrade (Bisektion)
function chi2inv95(f) {
  let unten = 0;
  let oben = 1000 + 10 * f;
  for (let i = 0; i < 200; i++) {
    const mitte = (unten + oben) / 2;
    if (gammaP(f / 2, mitte / 2) < 0.95) {
      unten = mitte;
    } else {
      oben = mitte;
    }
  }
  return (unten + oben) / 2;
}

// --- Schritt 3 / 4 / 5 / 6 / 7: eine Iteration ---

// Orientierungs-Startwert: robustes Mittel (vermeidet den Sprung bei 0/400 gon)
function oriStartwert(oriListe) {
  const erste = oriListe[0];
  let summe = 0;
  for (let i = 0; i < oriListe.length; i++) {
    summe += wrap(oriListe[i] - erste);
  }
  return wrap(erste + summe / oriListe.length);
}

function rechneIteration(nummer, punkte, reduktion, X0, par) {
  const k = punkte.length;
  const n = 2 * k;

  // Schritt 3: Näherungswerte der Beobachtungen
  const naeherungPunkte = [];
  const oriListe = [];
  for (let i = 0; i < k; i++) {
    const dE = punkte[i].east - X0.east;
    const dN = punkte[i].north - X0.north;
    const s = Math.sqrt(dE * dE + dN * dN);
    const az = azimut(dE, dN);
    const oriPunkt = wrap(az - punkte[i].horizontalwinkel);
    oriListe.push(oriPunkt);
    naeherungPunkte.push({ dE: dE, dN: dN, s: s, azimut: az, oriPunkt: oriPunkt });
  }
  // Orientierungs-Näherung: in der 1. Iteration Mittel, danach der ausgeglichene Wert
  const ori0 = (X0.ori === null) ? oriStartwert(oriListe) : X0.ori;
  const naeherung = { north: X0.north, east: X0.east, m: X0.m, ori: ori0 };

  // Schritt 4: A-Matrix, f-Vektor, sigma, p  (zuerst k Richtungen, dann k Distanzen)
  const A = [];
  const f = [];
  const sigma = [];
  const p = [];
  for (let i = 0; i < k; i++) {
    const q = naeherungPunkte[i];
    A.push([q.dE / (q.s * q.s) * ROH, -q.dN / (q.s * q.s) * ROH, 0, -1]);
    f.push(wrap(punkte[i].horizontalwinkel + ori0 - q.azimut));
    sigma.push(par.sigmaRichtung);
  }
  for (let i = 0; i < k; i++) {
    const q = naeherungPunkte[i];
    A.push([-q.dN / q.s, -q.dE / q.s, -reduktion[i].dProj, 0]);
    f.push(X0.m * reduktion[i].dProj - q.s);
    // Standardabweichung mit der Schrägdistanz
    sigma.push(par.sigmaDistanzKonstant + par.sigmaDistanzPpm * 1e-6 * punkte[i].schraegdistanz);
  }
  for (let i = 0; i < n; i++) {
    p.push(Math.pow(par.sigma0 / sigma[i], 2));
  }

  // Schritt 5: Normalgleichungen
  const N = normalMatrix(A, p);
  const nVek = nVektorBerechnen(A, p, f);
  const Qxx = invertiere(N);
  if (Qxx === null) {
    throw new Error('Die Normalgleichungsmatrix ist nicht lösbar. Geometrie ungeeignet (z. B. Punkte kollinear).');
  }
  const x = matrixMalVektor(Qxx, nVek);   // [xN, xE, xm, xOri]

  // Schritt 6: volle Unbekannte
  const X = {
    north: X0.north + x[0],
    east: X0.east + x[1],
    m: X0.m + x[2],
    ori: ori0 + x[3]
  };

  // Schritt 7 (a): Verbesserungen mit Matrix v = A*x - f
  const Ax = aMalX(A, x);
  const vMatrix = [];
  for (let i = 0; i < n; i++) {
    vMatrix.push(Ax[i] - f[i]);
  }

  // Schritt 7 (b): Verbesserungen aus der Beobachtungsgleichung
  const vBgl = [];
  for (let i = 0; i < k; i++) {
    const dE = punkte[i].east - X.east;
    const dN = punkte[i].north - X.north;
    vBgl.push(wrap(azimut(dE, dN) - (punkte[i].horizontalwinkel + X.ori)));
  }
  for (let i = 0; i < k; i++) {
    const dE = punkte[i].east - X.east;
    const dN = punkte[i].north - X.north;
    vBgl.push(Math.sqrt(dE * dE + dN * dN) - X.m * reduktion[i].dProj);
  }

  // Schlussprobe
  const differenz = [];
  let maxDifferenz = 0;
  for (let i = 0; i < n; i++) {
    differenz.push(vMatrix[i] - vBgl[i]);
    maxDifferenz = Math.max(maxDifferenz, Math.abs(differenz[i]));
  }

  return {
    nummer: nummer,
    naeherung: naeherung,
    punkte: naeherungPunkte,
    A: A, f: f, sigma: sigma, p: p,
    N: N, nVektor: nVek, Qxx: Qxx, x: x,
    X: X,
    vMatrix: vMatrix, vBgl: vBgl, differenz: differenz,
    maxDifferenz: maxDifferenz
  };
}

// --- Gesamte Ausgleichung mit Iteration (Schritte 2 bis 11) ---
function ausgleichen(punkte, station, par) {
  const k = punkte.length;
  const n = 2 * k;
  const u = 4;
  const f = n - u;

  // Schritt 2 (einmal)
  const reduktion = punkte.map(function (punkt) {
    return distanzReduktion(punkt, par);
  });

  // Schritt 8: Iteration
  let X0 = { north: station.north, east: station.east, m: FESTE_WERTE.massstabNaeherung, ori: null };
  const iterationen = [];
  let konvergiert = false;
  for (let nr = 1; nr <= par.maxIterationen; nr++) {
    const it = rechneIteration(nr, punkte, reduktion, X0, par);
    if (!Number.isFinite(it.maxDifferenz)) {
      throw new Error('Die Rechnung liefert keine gültigen Zahlen. Bitte Eingaben prüfen.');
    }
    iterationen.push(it);
    if (it.maxDifferenz <= par.toleranz) {
      konvergiert = true;
      break;
    }
    X0 = it.X;
  }
  const letzte = iterationen[iterationen.length - 1];

  // Schritt 10: Modelltest und Genauigkeit
  let vPv = 0;
  for (let i = 0; i < n; i++) {
    vPv += letzte.p[i] * letzte.vMatrix[i] * letzte.vMatrix[i];
  }
  const s0 = Math.sqrt(vPv / f);
  const F = Math.pow(s0 / par.sigma0, 2);
  const grenze = chi2inv95(f) / f;
  const q = letzte.Qxx;
  const genauigkeit = {
    sN: s0 * Math.sqrt(q[0][0]) * 1000,      // mm
    sE: s0 * Math.sqrt(q[1][1]) * 1000,      // mm
    sM: s0 * Math.sqrt(q[2][2]) * 1e6,       // ppm
    sOri: s0 * Math.sqrt(q[3][3]) * 1000     // mgon
  };

  // Schritt 9 und 11: ausgeglichene Beobachtungen und Ausreisser-Markierung
  const beobachtungen = [];
  for (let i = 0; i < n; i++) {
    const istRichtung = i < k;
    const pt = punkte[istRichtung ? i : i - k];
    const gemessen = istRichtung
      ? pt.horizontalwinkel + letzte.X.ori
      : letzte.X.m * reduktion[i - k].dProj;
    const v = letzte.vMatrix[i];
    const vNormiert = Math.abs(v) / letzte.sigma[i];
    beobachtungen.push({
      typ: istRichtung ? 'Richtung' : 'Distanz',
      punkt: pt.name,
      gemessen: gemessen,
      v: v,
      ausgeglichen: gemessen + v,
      vNormiert: vNormiert,
      auffaellig: vNormiert > par.ausreisserGrenze
    });
  }

  return {
    punkte: punkte,
    station: station,
    parameter: par,
    reduktion: reduktion,
    iterationen: iterationen,
    konvergiert: konvergiert,
    n: n, u: u, f: f,
    vPv: vPv, s0: s0, F: F, grenze: grenze,
    modelltestBestanden: F <= grenze,
    genauigkeit: genauigkeit,
    beobachtungen: beobachtungen,
    kontrollen: eingebauteKontrollen(letzte, k)
  };
}

// Eingebaute Kontrollen (ohne externe Vergleichswerte)
function eingebauteKontrollen(it, k) {
  const kontrollen = [];
  const u = 4;

  kontrollen.push({
    text: 'Schlussprobe: max |v − v_BGL| = ' + it.maxDifferenz.toExponential(2),
    ok: null   // wird in ausgleichen()-Aufrufer über Toleranz bewertet (siehe Anzeige)
  });

  // N symmetrisch
  let maxAbweichung = 0;
  let maxWert = 0;
  for (let i = 0; i < u; i++) {
    for (let j = 0; j < u; j++) {
      maxAbweichung = Math.max(maxAbweichung, Math.abs(it.N[i][j] - it.N[j][i]));
      maxWert = Math.max(maxWert, Math.abs(it.N[i][j]));
    }
  }
  kontrollen.push({
    text: 'N-Matrix ist symmetrisch',
    ok: maxAbweichung <= 1e-9 * maxWert
  });

  // Eintrag (Ori, Ori) = Summe der Richtungsgewichte
  let summeP = 0;
  for (let i = 0; i < k; i++) {
    summeP += it.p[i];
  }
  kontrollen.push({
    text: 'N(Ori, Ori) = Summe der Richtungsgewichte',
    ok: Math.abs(it.N[3][3] - summeP) <= 1e-9 * Math.abs(summeP)
  });

  // Aufbau der A-Zeilen
  let okRichtung = true;
  let okDistanz = true;
  for (let i = 0; i < k; i++) {
    if (it.A[i][2] !== 0 || it.A[i][3] !== -1) {
      okRichtung = false;
    }
    const zeile = it.A[k + i];
    if (zeile[3] !== 0 || Math.abs(zeile[0] * zeile[0] + zeile[1] * zeile[1] - 1) > 1e-12) {
      okDistanz = false;
    }
  }
  kontrollen.push({ text: 'Richtungszeilen: Spalte m = 0, Spalte Ori = −1', ok: okRichtung });
  kontrollen.push({ text: 'Distanzzeilen: Spalte Ori = 0 und (∂s/∂N)² + (∂s/∂E)² = 1', ok: okDistanz });
  return kontrollen;
}


// =====================================================================
// TEIL B: EINGABEN PRÜFEN
// =====================================================================

// Text in Zahl umwandeln (Punkt oder Komma erlaubt). Leer oder ungültig -> NaN
function leseZahl(text) {
  const t = String(text === undefined || text === null ? '' : text).trim().replace(',', '.');
  if (t === '') {
    return NaN;
  }
  return Number(t);
}

// roh = { punkte: [{name, east, north, hoehe, schraegdistanz, horizontalwinkel, vertikalwinkel}] (Texte),
//         station: {east, north}, parameter: {...} }
// Gibt { fehler: [...], punkte, station, parameter } zurück
function pruefeEingaben(roh) {
  const fehler = [];

  // Station
  const station = { east: leseZahl(roh.station.east), north: leseZahl(roh.station.north) };
  if (Number.isNaN(station.east) || Number.isNaN(station.north)) {
    fehler.push('Näherungskoordinaten der Station: East und North müssen Zahlen sein.');
  }

  // Parameter
  const par = {
    sigma0: leseZahl(roh.parameter.sigma0),
    sigmaRichtung: leseZahl(roh.parameter.sigmaRichtung),
    sigmaDistanzKonstant: leseZahl(roh.parameter.sigmaDistanzKonstant),
    sigmaDistanzPpm: leseZahl(roh.parameter.sigmaDistanzPpm),
    toleranz: leseZahl(roh.parameter.toleranz),
    maxIterationen: leseZahl(roh.parameter.maxIterationen),
    ausreisserGrenze: leseZahl(roh.parameter.ausreisserGrenze)
  };
  if (!(par.sigma0 > 0)) { fehler.push('σ0 muss eine Zahl grösser als 0 sein.'); }
  if (!(par.sigmaRichtung > 0)) { fehler.push('σ Richtung muss eine Zahl grösser als 0 sein.'); }
  if (!(par.sigmaDistanzKonstant >= 0)) { fehler.push('σ Distanz konstant muss eine Zahl (≥ 0) sein.'); }
  if (!(par.sigmaDistanzPpm >= 0)) { fehler.push('σ Distanz ppm muss eine Zahl (≥ 0) sein.'); }
  if (par.sigmaDistanzKonstant === 0 && par.sigmaDistanzPpm === 0) {
    fehler.push('σ Distanz konstant und σ Distanz ppm dürfen nicht beide 0 sein.');
  }
  if (!(par.toleranz > 0)) { fehler.push('Toleranz der Schlussprobe muss eine Zahl grösser als 0 sein.'); }
  if (!(Number.isInteger(par.maxIterationen) && par.maxIterationen >= 1)) {
    fehler.push('Maximale Iterationen muss eine ganze Zahl ab 1 sein.');
  }
  if (!(par.ausreisserGrenze > 0)) { fehler.push('Ausreissergrenze muss eine Zahl grösser als 0 sein.'); }

  // Punkte
  if (roh.punkte.length < 3) {
    fehler.push('Es braucht mindestens 3 Anschlusspunkte (sonst ist die Redundanz 0).');
  }
  const punkte = [];
  const felder = [
    ['east', 'East'], ['north', 'North'], ['hoehe', 'Höhe'],
    ['schraegdistanz', 'SD'], ['horizontalwinkel', 'Hz'], ['vertikalwinkel', 'V']
  ];
  const namen = {};
  roh.punkte.forEach(function (r, index) {
    const nr = index + 1;
    const punkt = { name: String(r.name || '').trim() };
    if (punkt.name === '') {
      fehler.push('Punkt ' + nr + ': Der Punktname fehlt.');
    } else if (namen[punkt.name]) {
      fehler.push('Punkt ' + nr + ': Der Name «' + punkt.name + '» kommt doppelt vor.');
    }
    namen[punkt.name] = true;
    let alleZahlen = true;
    felder.forEach(function (feld) {
      punkt[feld[0]] = leseZahl(r[feld[0]]);
      if (Number.isNaN(punkt[feld[0]])) {
        alleZahlen = false;
        fehler.push('Punkt ' + nr + ' (' + punkt.name + '): ' + feld[1] + ' muss eine Zahl sein.');
      }
    });
    if (alleZahlen) {
      if (!(punkt.horizontalwinkel >= 0 && punkt.horizontalwinkel < 400)) {
        fehler.push('Punkt ' + nr + ' (' + punkt.name + '): Hz muss in [0, 400) gon liegen.');
      }
      if (!(punkt.vertikalwinkel > 0 && punkt.vertikalwinkel < 200)) {
        fehler.push('Punkt ' + nr + ' (' + punkt.name + '): V muss zwischen 0 und 200 gon liegen.');
      }
      if (!(punkt.schraegdistanz > 0)) {
        fehler.push('Punkt ' + nr + ' (' + punkt.name + '): SD muss grösser als 0 sein.');
      }
      if (!Number.isNaN(station.east) && !Number.isNaN(station.north)) {
        const abstand = Math.hypot(punkt.east - station.east, punkt.north - station.north);
        if (abstand < 1e-6) {
          fehler.push('Punkt ' + nr + ' (' + punkt.name + '): Die Station liegt auf dem Anschlusspunkt.');
        }
      }
    }
    punkte.push(punkt);
  });

  return { fehler: fehler, punkte: punkte, station: station, parameter: par };
}


// =====================================================================
// TEIL C: ANZEIGE IM BROWSER
// (wird nur ausgeführt, wenn eine Webseite vorhanden ist)
// =====================================================================

if (typeof document !== 'undefined') {

  const SPEICHER_NAME = 'ausgleichung_freie_stationierung';
  const PUNKT_FELDER = ['name', 'east', 'north', 'hoehe', 'schraegdistanz', 'horizontalwinkel', 'vertikalwinkel'];
  const SPALTEN = ['N', 'E', 'm', 'Ori'];

  // Zustand der Eingaben (alles als Text, wie getippt)
  let zustand = standardZustand();
  let letztesErgebnis = null;

  function leerePunktZeile() {
    return { name: '', east: '', north: '', hoehe: '', schraegdistanz: '', horizontalwinkel: '', vertikalwinkel: '' };
  }

  function standardZustand() {
    return {
      punkte: [leerePunktZeile(), leerePunktZeile(), leerePunktZeile()],
      station: { east: '', north: '' },
      parameter: {
        sigma0: '1',
        sigmaRichtung: '0.0003',
        sigmaDistanzKonstant: '0.001',
        sigmaDistanzPpm: '1.5',
        toleranz: '0.000001',
        maxIterationen: '20',
        ausreisserGrenze: '3'
      }
    };
  }

  // --- Speichern / Laden (localStorage) ---
  function speichern() {
    try {
      localStorage.setItem(SPEICHER_NAME, JSON.stringify(zustand));
    } catch (fehler) {
      // Speichern nicht möglich (z. B. gesperrt) - die App läuft trotzdem
    }
  }

  function laden() {
    try {
      const text = localStorage.getItem(SPEICHER_NAME);
      if (text) {
        const gespeichert = JSON.parse(text);
        const standard = standardZustand();
        zustand = {
          punkte: Array.isArray(gespeichert.punkte) && gespeichert.punkte.length > 0
            ? gespeichert.punkte.map(function (z) { return Object.assign(leerePunktZeile(), z); })
            : standard.punkte,
          station: Object.assign(standard.station, gespeichert.station),
          parameter: Object.assign(standard.parameter, gespeichert.parameter)
        };
      }
    } catch (fehler) {
      zustand = standardZustand();
    }
  }

  // --- Hilfsfunktionen Anzeige ---
  function esc(text) {
    return String(text)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // Zahl mit fester Anzahl Nachkommastellen
  function fix(wert, stellen) {
    return Number.isFinite(wert) ? wert.toFixed(stellen) : '–';
  }

  // Zahl für Matrizen: normal mit 5 Stellen, sehr gross/klein in Exponentialschreibweise
  function matZahl(wert) {
    if (wert === 0) { return '0'; }
    const betrag = Math.abs(wert);
    if (betrag >= 1e5 || betrag < 1e-3) { return wert.toExponential(4); }
    return wert.toFixed(5);
  }

  // Matrix als Tabelle mit Beschriftung und Klammern
  function matrixHtml(titel, daten, zeilenNamen, spaltenNamen) {
    let html = '<div class="matrixBox"><div class="matrixTitel">' + esc(titel) +
      ' (' + daten.length + ' × ' + spaltenNamen.length + ')</div>';
    html += '<table class="matrix"><thead><tr><th></th>';
    spaltenNamen.forEach(function (name) { html += '<th>' + esc(name) + '</th>'; });
    html += '</tr></thead><tbody>';
    daten.forEach(function (zeile, i) {
      html += '<tr><th>' + esc(zeilenNamen[i]) + '</th>';
      zeile.forEach(function (wert) { html += '<td>' + matZahl(wert) + '</td>'; });
      html += '</tr>';
    });
    html += '</tbody></table></div>';
    return html;
  }

  // Vektor = Matrix mit einer Spalte
  function vektorHtml(titel, daten, zeilenNamen, spaltenName) {
    return matrixHtml(titel, daten.map(function (w) { return [w]; }), zeilenNamen, [spaltenName]);
  }

  // Einfache Tabelle: kopf = Liste von Texten, zeilen = Liste von Listen (HTML-Texte)
  function tabelleHtml(kopf, zeilen, auffaellig) {
    let html = '<table class="daten"><thead><tr>';
    kopf.forEach(function (text) { html += '<th>' + text + '</th>'; });
    html += '</tr></thead><tbody>';
    zeilen.forEach(function (zeile, i) {
      const klasse = auffaellig && auffaellig[i] ? ' class="auffaellig"' : '';
      html += '<tr' + klasse + '>';
      zeile.forEach(function (zelle) { html += '<td>' + zelle + '</td>'; });
      html += '</tr>';
    });
    html += '</tbody></table>';
    return html;
  }

  function beobachtungsNamen(punkte) {
    const namen = [];
    punkte.forEach(function (p) { namen.push('Ri ' + p.name); });
    punkte.forEach(function (p) { namen.push('Di ' + p.name); });
    return namen;
  }

  // --- Eingabemaske zeichnen ---
  function zeichneEingabe() {
    document.getElementById('stationEast').value = zustand.station.east;
    document.getElementById('stationNorth').value = zustand.station.north;
    document.querySelectorAll('[data-param]').forEach(function (feld) {
      feld.value = zustand.parameter[feld.dataset.param];
    });

    const koerper = document.getElementById('punktKoerper');
    let html = '';
    zustand.punkte.forEach(function (zeile, i) {
      html += '<tr>';
      PUNKT_FELDER.forEach(function (feld) {
        html += '<td><input type="text" data-zeile="' + i + '" data-feld="' + feld + '" value="' +
          esc(zeile[feld]) + '"' + (feld === 'name' ? '' : ' inputmode="decimal"') + '></td>';
      });
      html += '<td><button type="button" class="loeschen" data-loeschen="' + i +
        '" title="Punkt löschen">✕</button></td></tr>';
    });
    koerper.innerHTML = html;
  }

  function zeigeFehler(liste) {
    const box = document.getElementById('fehlerBox');
    if (liste.length === 0) {
      box.hidden = true;
      box.innerHTML = '';
      return;
    }
    let html = '<strong>Bitte Eingaben korrigieren:</strong><ul>';
    liste.forEach(function (text) { html += '<li>' + esc(text) + '</li>'; });
    html += '</ul>';
    box.innerHTML = html;
    box.hidden = false;
    box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  // --- Ergebnis anzeigen ---
  function zeigeErgebnis(erg) {
    const bereich = document.getElementById('ergebnis');
    const letzte = erg.iterationen[erg.iterationen.length - 1];
    const X = letzte.X;
    const g = erg.genauigkeit;
    const auffaellige = erg.beobachtungen.filter(function (b) { return b.auffaellig; });

    let html = '<h2>Ergebnis</h2>';

    // Hauptergebnis
    html += '<table class="hauptTabelle"><thead><tr><th>Grösse</th><th>ausgeglichen</th><th>Genauigkeit (s)</th></tr></thead><tbody>';
    html += '<tr><th>N</th><td>' + fix(X.north, 4) + ' m</td><td>± ' + fix(g.sN, 4) + ' mm</td></tr>';
    html += '<tr><th>E</th><td>' + fix(X.east, 4) + ' m</td><td>± ' + fix(g.sE, 4) + ' mm</td></tr>';
    html += '<tr><th>Massstab m</th><td>' + fix(X.m, 9) + ' (' + fix((X.m - 1) * 1e6, 3) + ' ppm)</td><td>± ' +
      fix(g.sM, 3) + ' ppm</td></tr>';
    html += '<tr><th>Orientierung Ori</th><td>' + fix(X.ori, 6) + ' gon</td><td>± ' + fix(g.sOri, 4) + ' mgon</td></tr>';
    html += '</tbody></table>';

    html += '<p>Modelltest: <span class="abzeichen ' + (erg.modelltestBestanden ? 'gut' : 'schlecht') + '">' +
      (erg.modelltestBestanden ? 'bestanden' : 'NICHT bestanden') + '</span></p>';
    html += '<p>s0 = ' + fix(erg.s0, 6) + ' · F = ' + fix(erg.F, 6) + ' · Grenze χ²(0.95; f)/f = ' + fix(erg.grenze, 6) +
      ' · n = ' + erg.n + ', u = ' + erg.u + ', f = ' + erg.f + '</p>';
    html += '<p>Iterationen: ' + erg.iterationen.length + ' · max |v − v_BGL| = ' + letzte.maxDifferenz.toExponential(2) + '</p>';

    if (!erg.konvergiert) {
      html += '<div class="warnung">⚠ Die Schlussprobe ist nach ' + erg.iterationen.length +
        ' Iterationen nicht erfüllt (Toleranz ' + erg.parameter.toleranz + '). Das Ergebnis ist mit Vorsicht zu verwenden.</div>';
    }
    if (auffaellige.length > 0) {
      const liste = auffaellige.map(function (b) {
        return (b.typ === 'Richtung' ? 'Ri ' : 'Di ') + b.punkt + ' (' + fix(b.vNormiert, 1) + ')';
      }).join(', ');
      html += '<div class="warnung">Mögliche Ausreisser (|v|/σ &gt; ' + erg.parameter.ausreisserGrenze + '): ' +
        esc(liste) + '</div>';
    }

    // Schritt 1
    html += '<details class="schritt"><summary>Schritt 1: Eingabedaten</summary>';
    html += tabelleHtml(['Pt', 'E (m)', 'N (m)', 'H (m)', 'SD (m)', 'Hz (gon)', 'V (gon)'],
      erg.punkte.map(function (p) {
        return [esc(p.name), fix(p.east, 3), fix(p.north, 3), fix(p.hoehe, 3),
          fix(p.schraegdistanz, 3), fix(p.horizontalwinkel, 4), fix(p.vertikalwinkel, 4)];
      }));
    html += '<p>Näherung Station: E = ' + fix(erg.station.east, 3) + ' m, N = ' + fix(erg.station.north, 3) + ' m</p>';
    html += '<p>σ0 = ' + erg.parameter.sigma0 + ' · σ Richtung = ' + erg.parameter.sigmaRichtung +
      ' gon · σ Distanz = ' + erg.parameter.sigmaDistanzKonstant + ' m + ' + erg.parameter.sigmaDistanzPpm + ' ppm</p>';
    html += '</details>';

    // Schritt 2
    html += '<details class="schritt"><summary>Schritt 2: Distanzreduktion</summary>';
    html += '<div class="formel">dH = SD · sin(V · π/200)\nd0 = dH · R / (R + H)\ndProj = d0 · (1 + (N − N_Ursprung)² / (2·R²))</div>';
    html += tabelleHtml(['Pt', 'SD (m)', 'V (gon)', 'dH (m)', 'd0 (m)', 'dProj (m)'],
      erg.punkte.map(function (p, i) {
        const r = erg.reduktion[i];
        return [esc(p.name), fix(p.schraegdistanz, 3), fix(p.vertikalwinkel, 4),
          fix(r.dH, 9), fix(r.d0, 9), fix(r.dProj, 9)];
      }));
    html += '</details>';

    // Schritte 3-7 je Iteration
    html += '<details class="schritt" open><summary>Schritte 3–7: Rechnung je Iteration</summary>';
    html += '<div class="iterationWahl"><label>Iteration anzeigen: <select id="iterationWahl">';
    erg.iterationen.forEach(function (it, i) {
      html += '<option value="' + i + '"' + (i === erg.iterationen.length - 1 ? ' selected' : '') + '>' +
        it.nummer + ' von ' + erg.iterationen.length + '</option>';
    });
    html += '</select></label></div>';
    html += '<div id="iterationInhalt"></div></details>';

    // Schritt 8
    html += '<details class="schritt"><summary>Schritt 8: Iterationsübersicht</summary>';
    html += tabelleHtml(['Iteration', 'max |v − v_BGL|', 'xN (m)', 'xE (m)', 'xm', 'xOri (gon)', 'Schlussprobe'],
      erg.iterationen.map(function (it) {
        const erfuellt = it.maxDifferenz <= erg.parameter.toleranz;
        return [it.nummer, it.maxDifferenz.toExponential(2), it.x[0].toExponential(4), it.x[1].toExponential(4),
          it.x[2].toExponential(4), it.x[3].toExponential(4), erfuellt ? 'erfüllt' : 'nicht erfüllt → weiter'];
      }));
    html += '</details>';

    // Schritt 9 und 11
    html += '<details class="schritt"><summary>Schritt 9 und 11: Ausgeglichene Beobachtungen und Ausreisser</summary>';
    html += '<div class="formel">Richtung: ausgeglichen = Hz + Ori + v\nDistanz: ausgeglichen = m · dProj + v\n|v|/σ &gt; ' +
      erg.parameter.ausreisserGrenze + ' wird rot markiert (nur ein Hinweis, kein statistischer Test)</div>';
    html += tabelleHtml(['Typ', 'Pt', 'gemessen', 'v', 'ausgeglichen', '|v|/σ'],
      erg.beobachtungen.map(function (b) {
        const istRichtung = b.typ === 'Richtung';
        return [b.typ, esc(b.punkt),
          fix(b.gemessen, istRichtung ? 6 : 5) + (istRichtung ? ' gon' : ' m'),
          fix(b.v * 1000, 4) + (istRichtung ? ' mgon' : ' mm'),
          fix(b.ausgeglichen, istRichtung ? 6 : 5) + (istRichtung ? ' gon' : ' m'),
          fix(b.vNormiert, 2)];
      }),
      erg.beobachtungen.map(function (b) { return b.auffaellig; }));
    html += '</details>';

    // Schritt 10
    html += '<details class="schritt"><summary>Schritt 10: Modelltest und Genauigkeit</summary>';
    html += '<div class="formel">n = 2·k = ' + erg.n + ',  u = 4,  f = n − u = ' + erg.f +
      '\nvᵀPv = Σ p·v² = ' + fix(erg.vPv, 6) +
      '\ns0 = √(vᵀPv / f) = ' + fix(erg.s0, 6) +
      '\nF = (s0 / σ0)² = ' + fix(erg.F, 6) +
      '\nGrenze = χ²(0.95; f) / f = ' + fix(erg.grenze, 6) +
      '\nTest: F ≤ Grenze → ' + (erg.modelltestBestanden ? 'bestanden' : 'NICHT bestanden') + '</div>';
    html += tabelleHtml(['Unbekannte', 'q (Diagonale Qxx)', 's = s0·√q'],
      [['N', letzte.Qxx[0][0].toExponential(4), fix(g.sN, 4) + ' mm'],
       ['E', letzte.Qxx[1][1].toExponential(4), fix(g.sE, 4) + ' mm'],
       ['m', letzte.Qxx[2][2].toExponential(4), fix(g.sM, 3) + ' ppm'],
       ['Ori', letzte.Qxx[3][3].toExponential(4), fix(g.sOri, 4) + ' mgon']]);
    html += '</details>';

    // Kontrollen
    html += '<details class="schritt"><summary>Eingebaute Kontrollen</summary><ul>';
    erg.kontrollen.forEach(function (kontrolle, i) {
      let ok = kontrolle.ok;
      if (i === 0) {
        ok = letzte.maxDifferenz <= erg.parameter.toleranz;
      }
      html += '<li class="kontrolle ' + (ok ? 'ok' : 'nichtOk') + '">' + (ok ? '✓ ' : '✗ ') + esc(kontrolle.text) + '</li>';
    });
    html += '</ul></details>';

    bereich.innerHTML = html;
    bereich.hidden = false;
    zeigeIteration(erg.iterationen.length - 1);
    document.getElementById('iterationWahl').addEventListener('change', function (ereignis) {
      zeigeIteration(Number(ereignis.target.value));
    });
    bereich.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // Schritte 3-7 für eine gewählte Iteration
  function zeigeIteration(index) {
    const erg = letztesErgebnis;
    const it = erg.iterationen[index];
    const zeilen = beobachtungsNamen(erg.punkte);
    const k = erg.punkte.length;
    let html = '';

    // Schritt 3
    html += '<h4>Schritt 3: Näherungswerte (Iteration ' + it.nummer + ')</h4>';
    html += '<div class="formel">ΔE = E − E0,  ΔN = N − N0,  s = √(ΔE² + ΔN²)\nAz = atan2(ΔE, ΔN)·ρ mod 400,  Ori_i = wrap(Az − Hz)</div>';
    html += tabelleHtml(['Pt', 'ΔE (m)', 'ΔN (m)', 's (m)', 'Az (gon)', 'Ori_i (gon)'],
      it.punkte.map(function (q, i) {
        return [esc(erg.punkte[i].name), fix(q.dE, 4), fix(q.dN, 4), fix(q.s, 5), fix(q.azimut, 6), fix(q.oriPunkt, 6)];
      }));
    html += tabelleHtml(['Näherung X0', 'Wert'],
      [['N0 (m)', fix(it.naeherung.north, 6)], ['E0 (m)', fix(it.naeherung.east, 6)],
       ['m0', fix(it.naeherung.m, 9)], ['Ori0 (gon)', fix(it.naeherung.ori, 9)]]);

    // Schritt 4
    html += '<h4>Schritt 4: A-Matrix, f-Vektor, σ und Gewichte P</h4>';
    html += '<div class="formel">Richtung: A = [ΔE/s²·ρ, −ΔN/s²·ρ, 0, −1],  f = wrap(Hz + Ori0 − Az)\n' +
      'Distanz:  A = [−ΔN/s, −ΔE/s, −dProj, 0],  f = m0·dProj − s\n' +
      'σ Richtung = konstant,  σ Distanz = σ_konst + ppm·10⁻⁶·SD,  p = (σ0/σ)²,  P = Diagonalmatrix</div>';
    html += matrixHtml('A', it.A, zeilen, SPALTEN);
    html += vektorHtml('f', it.f, zeilen, 'f');
    html += vektorHtml('σ', it.sigma, zeilen, 'σ');
    html += vektorHtml('P (Diagonale)', it.p, zeilen, 'p');

    // Schritt 5
    html += '<h4>Schritt 5: Normalgleichungen</h4>';
    html += '<div class="formel">N = Aᵀ·P·A,  n = Aᵀ·P·f,  Qxx = N⁻¹,  x = Qxx·n</div>';
    html += matrixHtml('N', it.N, SPALTEN, SPALTEN);
    html += vektorHtml('n', it.nVektor, SPALTEN, 'n');
    html += matrixHtml('Qxx', it.Qxx, SPALTEN, SPALTEN);
    html += vektorHtml('x', it.x, SPALTEN, 'x');

    // Schritt 6
    html += '<h4>Schritt 6: Volle Unbekannte  X = X0 + x</h4>';
    html += tabelleHtml(['Unbekannte', 'Näherung X0', 'Zuschlag x', 'ausgeglichen X'],
      [['N (m)', fix(it.naeherung.north, 6), it.x[0].toExponential(6), fix(it.X.north, 6)],
       ['E (m)', fix(it.naeherung.east, 6), it.x[1].toExponential(6), fix(it.X.east, 6)],
       ['m', fix(it.naeherung.m, 9), it.x[2].toExponential(6), fix(it.X.m, 9)],
       ['Ori (gon)', fix(it.naeherung.ori, 9), it.x[3].toExponential(6), fix(it.X.ori, 9)]]);

    // Schritt 7
    html += '<h4>Schritt 7: Verbesserungen und Schlussprobe</h4>';
    html += '<div class="formel">(a) v = A·x − f\n(b) Richtung: v = wrap(Az(ausgeglichen) − (Hz + Ori))\n' +
      '    Distanz:  v = √((N_Pt − N)² + (E_Pt − E)²) − m·dProj\nSchlussprobe: max |v − v_BGL| ≤ Toleranz</div>';
    html += '<div class="gleichung">' +
      matrixHtml('A', it.A, zeilen, SPALTEN) + '<span class="op">·</span>' +
      vektorHtml('x', it.x, SPALTEN, 'x') + '<span class="op">−</span>' +
      vektorHtml('f', it.f, zeilen, 'f') + '<span class="op">=</span>' +
      vektorHtml('v', it.vMatrix, zeilen, 'v') + '</div>';
    html += tabelleHtml(['Beobachtung', 'v = A·x − f', 'v aus BGL', 'Differenz', 'v (mgon | mm)', '|v|/σ'],
      zeilen.map(function (name, i) {
        const vNormiert = Math.abs(it.vMatrix[i]) / it.sigma[i];
        return [esc(name), it.vMatrix[i].toExponential(6), it.vBgl[i].toExponential(6),
          it.differenz[i].toExponential(2), fix(it.vMatrix[i] * 1000, 4) + (i < k ? ' mgon' : ' mm'),
          fix(vNormiert, 2)];
      }),
      zeilen.map(function (name, i) {
        return Math.abs(it.vMatrix[i]) / it.sigma[i] > erg.parameter.ausreisserGrenze;
      }));
    const erfuellt = it.maxDifferenz <= erg.parameter.toleranz;
    html += '<p>max |v − v_BGL| = ' + it.maxDifferenz.toExponential(2) + ' → Schlussprobe ' +
      (erfuellt ? '<strong>erfüllt</strong>' : '<strong>nicht erfüllt</strong> (nächste Iteration mit X als Näherung)') + '</p>';

    document.getElementById('iterationInhalt').innerHTML = html;
  }

  // --- Knöpfe und Eingaben ---
  function berechnenKlick() {
    const pruefung = pruefeEingaben(zustand);
    zeigeFehler(pruefung.fehler);
    if (pruefung.fehler.length > 0) {
      document.getElementById('ergebnis').hidden = true;
      letztesErgebnis = null;
      return;
    }
    try {
      letztesErgebnis = ausgleichen(pruefung.punkte, pruefung.station, pruefung.parameter);
      zeigeErgebnis(letztesErgebnis);
    } catch (fehler) {
      letztesErgebnis = null;
      document.getElementById('ergebnis').hidden = true;
      zeigeFehler([fehler.message]);
    }
  }

  // Zeilen aus der Zwischenablage übernehmen (Pt E N H SD Hz V)
  function einfuegenKlick() {
    const text = document.getElementById('einfuegeText').value;
    const probleme = [];
    const neue = [];
    text.split(/\r?\n/).forEach(function (zeile, index) {
      if (zeile.trim() === '') {
        return;
      }
      const teile = zeile.trim().split(/[\t;\s]+/);
      if (teile.length !== 7) {
        probleme.push('Zeile ' + (index + 1) + ': Es braucht 7 Spalten (Pt E N H SD Hz V), gefunden: ' + teile.length + '.');
        return;
      }
      const eintrag = {};
      PUNKT_FELDER.forEach(function (feld, i) { eintrag[feld] = teile[i]; });
      neue.push(eintrag);
    });
    if (probleme.length > 0) {
      zeigeFehler(probleme);
      return;
    }
    if (neue.length === 0) {
      return;
    }
    // leere Zeilen am Ende ersetzen
    zustand.punkte = zustand.punkte.filter(function (z) {
      return PUNKT_FELDER.some(function (feld) { return String(z[feld]).trim() !== ''; });
    });
    zustand.punkte = zustand.punkte.concat(neue);
    document.getElementById('einfuegeText').value = '';
    zeigeFehler([]);
    zeichneEingabe();
    speichern();
  }

  function starte() {
    laden();
    zeichneEingabe();

    // Eingaben in der Punkttabelle
    document.getElementById('punktKoerper').addEventListener('input', function (ereignis) {
      const feld = ereignis.target;
      if (feld.dataset.zeile !== undefined) {
        zustand.punkte[Number(feld.dataset.zeile)][feld.dataset.feld] = feld.value;
        speichern();
      }
    });

    // Punkt löschen
    document.getElementById('punktKoerper').addEventListener('click', function (ereignis) {
      const knopf = ereignis.target.closest('[data-loeschen]');
      if (knopf) {
        zustand.punkte.splice(Number(knopf.dataset.loeschen), 1);
        zeichneEingabe();
        speichern();
      }
    });

    // Station
    document.querySelectorAll('[data-station]').forEach(function (feld) {
      feld.addEventListener('input', function () {
        zustand.station[feld.dataset.station] = feld.value;
        speichern();
      });
    });

    // Parameter
    document.querySelectorAll('[data-param]').forEach(function (feld) {
      feld.addEventListener('input', function () {
        zustand.parameter[feld.dataset.param] = feld.value;
        speichern();
      });
    });

    document.getElementById('punktHinzufuegen').addEventListener('click', function () {
      zustand.punkte.push(leerePunktZeile());
      zeichneEingabe();
      speichern();
    });

    document.getElementById('einfuegeKnopf').addEventListener('click', einfuegenKlick);
    document.getElementById('berechnenKnopf').addEventListener('click', berechnenKlick);

    document.getElementById('zuruecksetzenKnopf').addEventListener('click', function () {
      if (confirm('Alle Eingaben und das Ergebnis löschen?')) {
        zustand = standardZustand();
        letztesErgebnis = null;
        zeichneEingabe();
        zeigeFehler([]);
        document.getElementById('ergebnis').hidden = true;
        speichern();
      }
    });

    document.getElementById('druckenKnopf').addEventListener('click', function () {
      window.print();
    });

    // Vor dem Drucken alle Detail-Abschnitte öffnen
    window.addEventListener('beforeprint', function () {
      document.querySelectorAll('details').forEach(function (d) { d.open = true; });
    });
  }

  starte();
}


// Für Tests ausserhalb des Browsers (z. B. mit Node.js) - im Browser ohne Wirkung
if (typeof module !== 'undefined') {
  module.exports = {
    wrap: wrap, azimut: azimut, chi2inv95: chi2inv95, invertiere: invertiere,
    pruefeEingaben: pruefeEingaben, ausgleichen: ausgleichen
  };
}
