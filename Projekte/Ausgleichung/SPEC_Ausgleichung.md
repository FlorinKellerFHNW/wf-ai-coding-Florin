# Projektname
Ausgleichung Freie-Stationierung

> **SPEC.md – Ihr Projektsteckbrief.** Diese Datei beschreibt, *was* Ihre App können soll.
> Sie wächst über alle vier Kurstage und ist Ihr wichtigster Kontext für die KI.

> **Quellen für die Berechnung:** `U_FS_Anleitung.pdf` (Vorgehen) und
> `Freie_Stationierung_App_Spezifikation.md` (Formeln und Konventionen).
> Die App rechnet **autonom**: Alle Werte kommen aus den Eingaben der Nutzerin / des Nutzers
> oder sind feste Konstanten (z. B. Erdradius). Es werden keine Werte aus anderen Dateien übernommen.

## Idee
Die App dient dazu, um eine freie Stationierung einer Totalstation zu rechnen anhand von Messrohdaten.
Sie gleicht die Messungen nach der Methode der kleinsten Quadrate aus (vermittelnde Ausgleichung, 2D: nur East und North)
und zeigt **jeden Berechnungsschritt** übersichtlich an, auch die Matrizen (A, f, P, N, n, Qxx, x, v).
So kann man die Rechnung Schritt für Schritt nachvollziehen und prüfen.

## Für wen
Die App richtet sich an Geomatiker.

## User Stories
*Format: Als … möchte ich …, damit …*

**Eingabe**
- Als Geomatiker möchte ich eine Anwendung vorfinden, bei der ich die Option habe, einen Anschlusspunkt hinzufügen, damit ich die Messrohdaten (East, North, Height, Schrägdistanz, Horizontalwinkel, Vertikalwinkel) eingeben kann.
- Als Geomatiker möchte ich zudem die Option haben, Näherungskoordinaten (East, North) einzugeben für den Standort des Messinstruments.
- Als Geomatiker möchte ich Anschlusspunkte wieder löschen können, damit ich Eingabefehler oder fehlerhafte Messungen entfernen kann.
- Als Geomatiker möchte ich die Standardabweichungen (Richtung, Distanz konstant, Distanz ppm) und σ0 selbst eingeben können, damit ich das Instrumentenmodell an mein Gerät anpassen kann.
- Als Geomatiker möchte ich mehrere Zeilen Messdaten (Tab-getrennt) auf einmal einfügen können, damit ich nicht alles von Hand abtippen muss.
- Als Geomatiker möchte ich bei falschen oder fehlenden Eingaben eine verständliche Fehlermeldung auf Deutsch sehen, damit ich weiss, was ich korrigieren muss.

**Berechnung**
- Als Geomatiker möchte ich per Knopfdruck die Ausgleichung starten, damit ich N, E, Massstab und Orientierung der Station erhalte.
- Als Geomatiker möchte ich, dass die App automatisch iteriert, bis die Schlussprobe erfüllt ist, damit die Näherungswerte gut genug sind.

**Ausgabe / Nachvollziehbarkeit**
- Als Geomatiker möchte ich jeden Berechnungsschritt (Distanzreduktion, Näherungswerte, A-Matrix, f-Vektor, P-Matrix, Normalgleichungen, Unbekannte, Verbesserungen) der Reihe nach sehen, damit ich die Rechnung nachvollziehen kann.
- Als Geomatiker möchte ich Matrizen und Vektoren als echte Matrix-Darstellung (Zeilen und Spalten mit Beschriftung) sehen, damit ich jeden Wert nachrechnen kann.
- Als Geomatiker möchte ich die Zwischenergebnisse jeder Iteration einzeln anschauen können, damit ich sehe, wie sich die Lösung verbessert.
- Als Geomatiker möchte ich oben ein Hauptergebnis (N, E, m, Ori mit Genauigkeiten) und das Ergebnis des Modelltests (bestanden / nicht bestanden) sehen, damit ich die Qualität sofort beurteilen kann.
- Als Geomatiker möchte ich die Verbesserungen der einzelnen Beobachtungen sehen und auffällige Beobachtungen (mögliche Ausreisser) markiert bekommen, damit ich fehlerhafte Messungen erkenne.
- Als Geomatiker möchte ich die Seite über die Druckfunktion des Browsers drucken oder als PDF speichern können, damit ich die Rechnung dokumentieren kann.
- Als Geomatiker möchte ich meine Eingaben im Browser gespeichert haben, damit sie nach dem Neuladen der Seite nicht verloren sind.

## Datenmodell
*Welche Dinge (Objekte) gibt es, und welche Eigenschaften mit welchem Typ haben sie?*

Einheiten: Längen in **m**, Winkel in **gon**. Alle Zahlen sind `Number` (volle Genauigkeit, keine Rundung in Zwischenschritten).

```
// Objekt: Anschlusspunkt · Zweck: ein bekannter Punkt mit den Messungen der Station zu ihm
{
  name: "P1",                // Text, Punktname
  east: 2600100.000,         // Zahl (m), gegeben: Ost-Koordinate (E)
  north: 1200100.000,        // Zahl (m), gegeben: Nord-Koordinate (N)
  hoehe: 500.000,            // Zahl (m), gegeben: Höhe (H)
  schraegdistanz: 50.000,    // Zahl (m), gemessen (SD)
  horizontalwinkel: 100.0000, // Zahl (gon), gemessen (Hz), Lagen schon gemittelt
  vertikalwinkel: 100.0000   // Zahl (gon), gemessen (V = Zenitwinkel)
}

// Objekt: Station · Zweck: Näherungskoordinaten des Instrumentenstandorts (keine Höhe)
{
  east: 2600090.000,         // Zahl (m), E-Näherung
  north: 1200090.000         // Zahl (m), N-Näherung
}

// Objekt: Parameter · Zweck: Konstanten und Instrumentenmodell
{
  // feste Konstanten
  erdradius: 6378816,          // Zahl (m), R
  nUrsprung: 1200000,          // Zahl (m), N-Ursprung LV95
  massstabNaeherung: 1,        // Zahl, Näherung für m
  // Eingabe durch Nutzer:in
  sigma0: 1,                   // Zahl, a priori
  sigmaRichtung: 0.0003,       // Zahl (gon), Platzhalter als Startwert, änderbar
  sigmaDistanzKonstant: 0.001, // Zahl (m), Vorgabe aus PDF: 1 mm
  sigmaDistanzPpm: 1.5,        // Zahl (ppm), Vorgabe aus PDF
  // Einstellungen
  toleranz: 1e-6,              // Zahl, Grenze für die Schlussprobe (m bzw. gon)
  maxIterationen: 20,          // Ganzzahl
  ausreisserGrenze: 3          // Zahl, ab diesem |v|/σ wird markiert
}

// Objekt: Iteration · Zweck: alle Zwischenergebnisse eines Rechendurchgangs (für die Anzeige)
{
  nummer: 1,                   // Ganzzahl
  naeherung: { n, e, m, ori }, // Zahlen: Näherungswerte X0
  punkte: [                    // pro Anschlusspunkt:
    { dH, d0, dProj,           //   Distanzreduktion (m)
      dE, dN, s, azimut, oriPunkt } //   Näherungswerte (m, gon)
  ],
  A: [[ ... ]],                // Matrix n × 4 (Spalten N, E, m, Ori)
  f: [ ... ],                  // Vektor n
  sigma: [ ... ],              // Vektor n, Standardabweichungen
  p: [ ... ],                  // Vektor n, Gewichte (Diagonale von P)
  N: [[ ... ]],                // Normalgleichungsmatrix 4 × 4
  nVektor: [ ... ],            // Vektor 4
  Qxx: [[ ... ]],              // Kofaktormatrix 4 × 4
  x: [ ... ],                  // Zuschläge [xN, xE, xm, xOri]
  X: { n, e, m, ori },         // volle Unbekannte = X0 + x
  vMatrix: [ ... ],            // Verbesserungen v = A·x − f
  vBgl: [ ... ],               // Verbesserungen aus der Beobachtungsgleichung
  maxDifferenz: 0              // Zahl, max |v − vBgl|
}

// Objekt: Ergebnis · Zweck: Endresultat der Ausgleichung
{
  iterationen: [ ... ],        // Liste von «Iteration»
  n: 0, u: 4, f: 0,            // Ganzzahlen: Beobachtungen, Unbekannte (immer 4), Redundanz
  vPv: 0,                      // Zahl
  s0: 0,                       // Zahl, a posteriori
  F: 0,                        // Zahl, (s0 / σ0)²
  grenze: 0,                   // Zahl, χ²(0.95; f) / f
  modelltestBestanden: true,   // Ja/Nein
  genauigkeit: { sN, sE, sM, sOri }, // Zahlen: mm, mm, ppm, mgon
  beobachtungen: [             // pro Beobachtung:
    { typ, punkt, gemessen, v, ausgeglichen, vNormiert, auffaellig }
  ]
}
```

## Datenkarte
| Frage | Meine App |
| --- | --- |
| Welche Daten gibt es? | Anschlusspunkte (Name, E, N, H, Schrägdistanz, Hz, V), Näherungskoordinaten der Station (E, N), Parameter (feste Konstanten, σ-Werte, Toleranz, max. Iterationen, Ausreissergrenze), berechnete Zwischenergebnisse (Matrizen, Vektoren) und Endergebnis |
| Welche Eingaben braucht es? | Anschlusspunkt hinzufügen / löschen und Werte eintippen oder einfügen, Näherungskoordinaten der Station, σ-Werte, Knopf «Berechnen», Zurücksetzen, Knopf «Drucken», Auswahl der Iteration für die Anzeige |
| Welche Entscheidungen werden getroffen? | Sind die Eingaben gültig (mind. 3 Punkte, nur Zahlen, Hz in 0–400, V in 0–200, SD > 0, Station nicht auf einem Punkt)? Ist die Schlussprobe erfüllt, oder muss nochmals iteriert werden? Wurde das Maximum an Iterationen erreicht (dann Warnung)? Ist die Normalgleichungsmatrix lösbar (sonst Fehler «Geometrie ungeeignet»)? Ist der Modelltest bestanden (F ≤ Grenze)? Ist eine Beobachtung auffällig (\|v\|/σ über der Grenze)? |
| Was wird wiederholt? | Für jeden Anschlusspunkt: Distanzreduktion, Näherungswerte, eine Richtungszeile und eine Distanzzeile in A und f. Die ganze Ausgleichung (Näherungen → A, f → Lösung → Schlussprobe) wird wiederholt, bis die Schlussprobe erfüllt ist. Tabellen und Matrizen werden Zeile für Zeile angezeigt. |
| Was ist der Zustand? | Liste der Anschlusspunkte, Näherungskoordinaten, Parameter, Liste der Iterationen mit allen Zwischenergebnissen, aktuell angezeigte Iteration. Eingaben werden in localStorage gespeichert, Rechenergebnisse werden bei Bedarf neu berechnet. |
| Welche Ausgabe entsteht? | Hauptergebnis (N, E, m, Ori mit Genauigkeiten, s0, F, Grenze, Modelltest, Anzahl Iterationen), aufklappbare Detailschritte mit Tabellen und Matrizen, Verbesserungen in mgon bzw. mm mit Markierung auffälliger Beobachtungen, ausgeglichene Beobachtungen, druckbare Ansicht (Drucken / als PDF speichern) |

## Berechnung
Der exakte Ablauf. Alle Schritte gelten für k Anschlusspunkte (n = 2·k Beobachtungen, immer **4 Unbekannte** inkl. Massstab).
Jeder Schritt wird in der App als eigener aufklappbarer Abschnitt mit Tabellen bzw. Matrizen angezeigt.
Rechnung immer in **m und gon**.

**Konventionen:** ρ = 200/π; Azimut = `atan2(ΔE, ΔN) · ρ` modulo 400 (in JavaScript `Math.atan2(dE, dN)`);
wrap(a) = ((a + 200) mod 400) − 200 (in JavaScript `((a % 400) + 400) % 400` für das Modulo); Unbekannte in der Reihenfolge **[N, E, m, Ori]**;
v = A·x − f mit f = Messung − Näherung.

### Schritt 1: Eingaben prüfen und einlesen
- Mindestens 3 Anschlusspunkte, alle Felder Zahlen (Punkt oder Komma), Hz in [0, 400), V in (0, 200), SD > 0.
- Parameter und Näherungskoordinaten der Station einlesen.
- *Anzeige:* Tabelle der Eingabedaten.

### Schritt 2: Distanzreduktion (einmal, ändert sich nicht in der Iteration)
Für jeden Punkt i:
```
dH_i    = SD_i · sin(V_i · π/200)               // Schrägdistanz → Horizontaldistanz
d0_i    = dH_i · R / (R + H_i)                  // auf Höhe 0
dProj_i = d0_i · (1 + (N_i − N_Ursprung)² / (2·R²))   // in die Projektionsebene
```
H_i und N_i sind Höhe und Nord-Koordinate des Anschlusspunkts. Die SD gelten als bereits atmosphärisch korrigiert.

*Anzeige:* Tabelle mit SD, V, dH, d0, dProj pro Punkt.

### Schritt 3: Näherungswerte (in jeder Iteration neu)
Für jeden Punkt i, mit der aktuellen Näherung der Station (E0, N0):
```
ΔE_i = E_i − E0
ΔN_i = N_i − N0
s_i  = √(ΔE_i² + ΔN_i²)             // Näherungsdistanz
Az_i = atan2(ΔE_i, ΔN_i) · ρ  mod 400
Ori_i = wrap(Az_i − Hz_i)           // Orientierung aus Punkt i
```
Näherung der Unbekannten **in der 1. Iteration**:

| Unbekannte | Näherung |
| --- | --- |
| N0 | N der Station (Eingabe) |
| E0 | E der Station (Eingabe) |
| m0 | 1 |
| Ori0 | Mittel der Ori_i, robust: Ori0 = wrap(Ori_1 + (1/k)·Σ wrap(Ori_i − Ori_1)) |

(Das robuste Mittel vermeidet den Sprung bei 0/400 gon.)

**Ab der 2. Iteration** sind N0, E0, m0, Ori0 die ausgeglichenen Werte der vorherigen Iteration (Ori0 wird nicht neu gemittelt).

*Anzeige:* Tabelle mit ΔE, ΔN, s, Az, Ori_i pro Punkt und die Näherungswerte der Unbekannten.

### Schritt 4: A-Matrix, f-Vektor, σ und P-Matrix
Zeilenreihenfolge: **zuerst alle k Richtungen, dann alle k Distanzen**. A hat die Grösse n × 4 (Spalten N, E, m, Ori).

Richtungszeile für Punkt i:
```
A_r,i = [ +ΔE_i/s_i² · ρ ,  −ΔN_i/s_i² · ρ ,  0 ,  −1 ]
f_r,i = wrap(Hz_i + Ori0 − Az_i)
```
Distanzzeile für Punkt i:
```
A_d,i = [ −ΔN_i/s_i ,  −ΔE_i/s_i ,  −dProj_i ,  0 ]
f_d,i = m0 · dProj_i − s_i
```
Standardabweichungen und Gewichte:
```
σ_r,i = σ_Richtung                                   (gon)
σ_d,i = σ_Distanz_konstant + σ_ppm · 10⁻⁶ · SD_i      (m, mit der Schrägdistanz SD!)
p_i   = (σ0 / σ_i)²                                  → P = Diagonalmatrix n × n
```

*Anzeige:* A als Matrix (Zeilen beschriftet mit «Ri P1», «Di P1» …, Spalten N, E, m, Ori), f-Vektor, σ-Vektor und P (Diagonale oder als Matrix) nebeneinander.

### Schritt 5: Normalgleichungen
```
N = Aᵀ · P · A        (4 × 4, symmetrisch)
n = Aᵀ · P · f        (4 × 1)
Qxx = N⁻¹             (4 × 4)
x = Qxx · n           (4 × 1)  = [xN, xE, xm, xOri]
```
P wird nicht als volle Matrix multipliziert, sondern zeilenweise gewichtet (gleiches Ergebnis). Die Inverse wird selbst
gerechnet (Gauss-Jordan mit Pivotsuche). Ist N singulär: Fehlermeldung «Geometrie ungeeignet / Punkte kollinear».

*Anzeige:* N, n, Qxx und x als Matrizen.

### Schritt 6: Volle Unbekannte
```
X = X0 + x      →  N = N0 + xN,  E = E0 + xE,  m = m0 + xm,  Ori = Ori0 + xOri
```
*Anzeige:* Tabelle mit Näherung / Zuschlag x / ausgeglichener Wert.

### Schritt 7: Verbesserungen auf zwei Arten und Schlussprobe
(a) Mit Matrix: `v = A · x − f`

(b) Aus der Beobachtungsgleichung, mit den ausgeglichenen (vollen) Unbekannten:
```
v_r,i = wrap( atan2(E_i − E, N_i − N)·ρ mod 400 − (Hz_i + Ori) )
v_d,i = √((N_i − N)² + (E_i − E)²) − m · dProj_i
```
Schlussprobe: `max |v − v_BGL| ≤ Toleranz` (Vorgabe 10⁻⁶ in m bzw. gon).

*Anzeige:* Tabelle mit v (A·x − f), v aus BGL, Differenz und v in mgon bzw. mm; Ergebnis der Schlussprobe.

### Schritt 8: Iteration
- Schlussprobe erfüllt → weiter mit Schritt 9.
- Nicht erfüllt → X0 := X (N, E, m, Ori), zurück zu Schritt 3 (dProj bleibt gleich).
- Abbruch nach der maximalen Anzahl Iterationen mit einer Warnung.

*Anzeige:* Anzahl Iterationen und die Differenz pro Iteration. Die Schritte 3–7 sind für jede Iteration einzeln wählbar.

### Schritt 9: Ausgeglichene Beobachtungen
Mit den Verbesserungen aus Schritt 7 (a) der letzten Iteration:

| Typ | gemessen | v | ausgeglichen |
| --- | --- | --- | --- |
| Richtung | Hz_i + Ori | v_r,i | Hz_i + Ori + v_r,i |
| Distanz | m · dProj_i | v_d,i | m · dProj_i + v_d,i |

*Anzeige:* Tabelle gemessen / v / ausgeglichen.

### Schritt 10: Modelltest und Genauigkeit
```
n = 2·k,   u = 4,   f = n − u
vᵀPv = Σ p_i · v_i²
s0   = √(vᵀPv / f)
F    = (s0 / σ0)²
Grenze = χ²(0.95; f) / f          (selbst berechnen, kein fertiges CHIINV in JavaScript)
Test: F ≤ Grenze → «bestanden», sonst «NICHT bestanden»

s_N = s0·√q_NN [mm]    s_E = s0·√q_EE [mm]    s_m = s0·√q_mm [ppm]    s_Ori = s0·√q_OriOri [mgon]
```
(q = Diagonale von Qxx; Umrechnung ×1000 für mm bzw. mgon, ×10⁶ für ppm.)

*Anzeige:* Hauptergebnis oben auf der Seite, Details im Abschnitt «Modelltest und Genauigkeit».

### Schritt 11: Ausreisser markieren
Für jede Beobachtung i wird die normierte Verbesserung berechnet:
```
vNormiert_i = |v_i| / σ_i
```
Ist `vNormiert_i` grösser als die Ausreissergrenze (Vorgabe 3), wird die Beobachtung in der Verbesserungstabelle farbig markiert.
Das ist nur ein **Hinweis** (einfache Faustregel, kein statistischer Test). Besonders nützlich, wenn der Modelltest nicht bestanden ist.

*Anzeige:* Zusätzliche Spalte «|v|/σ» in der Verbesserungstabelle, auffällige Zeilen hervorgehoben.

### Darstellung der Matrizen
- Jede Matrix wird als Tabelle mit Klammern links und rechts dargestellt (wie auf Papier).
- Zeilen und Spalten sind beschriftet (Spalten: N, E, m, Ori; Zeilen: Ri/Di plus Punktname).
- Neben der Matrix stehen Name und Grösse, z. B. «A (10 × 4)».
- Zahlen mit fester Anzahl Nachkommastellen (Rechnung intern ohne Rundung); sehr grosse oder kleine Werte in Exponentialschreibweise.
- Verwandte Matrizen stehen nebeneinander, z. B. A · x − f = v.

### Eingebaute Kontrollen
Die App prüft sich selbst, ohne externe Vergleichswerte:
- Schlussprobe (Schritt 7): v aus Matrix und v aus Beobachtungsgleichung müssen übereinstimmen.
- N ist symmetrisch; Eintrag (Ori, Ori) = Summe der Richtungsgewichte.
- Richtungszeilen: Spalte m = 0, Spalte Ori = −1. Distanzzeilen: Spalte Ori = 0, (∂s/∂N)² + (∂s/∂E)² = 1.
- Modelltest (Schritt 10).

## Entschiedene Fragen
- **σ-Werte:** werden selbst eingegeben. Startwerte: σ Distanz 1 mm + 1.5 ppm (PDF), σ Richtung 0.0003 gon (Platzhalter), σ0 = 1. Alle änderbar.
- **Iteration:** die App iteriert automatisch bis zur Schlussprobe.
- **Toleranz der Schlussprobe:** einstellbar, Vorgabe 10⁻⁶ (m bzw. gon).
- **Massstab:** wird immer mitgerechnet (4 Unbekannte).
- **Höhen- und Projektionsreduktion:** nur H und N des Anschlusspunkts (wie im Vorgehen beschrieben).
- **Station:** keine Höhe, nur E und N.
- **Winkeleinheit:** nur gon.
- **Ausreisser:** werden markiert (Schritt 11).
- **Export:** über die Druckfunktion des Browsers («Drucken» / «Als PDF speichern»), ohne Bibliothek.
- **Stationen:** nur eine Station pro Berechnung.
- **Umsetzung in kleinen Schritten:** (1) Eingabemaske, (2) Distanzreduktion und Näherungswerte, (3) A, f, P, (4) Normalgleichungen und Lösung, (5) Verbesserungen und Iteration, (6) Modelltest und Genauigkeit, (7) Ausreisser-Markierung, (8) Matrix-Darstellung und Druckansicht.

## Offene Fragen
- Keine. (Entschieden: σ Richtung startet mit dem Platzhalter 0.0003 gon, änderbar. Ausreisser-Markierung ab |v|/σ > 3, einstellbar.)

## Nicht im Umfang
- 3D-Ausgleichung (Höhe wird nur für die Distanzreduktion gebraucht, nicht ausgeglichen)
- mehrere Stationen oder Netzausgleichung
- Beobachtungen in zwei Lagen einzeln (Lagen werden vorher gemittelt)
- Option «ohne Massstab»
- Winkeleinheiten ausser gon
- Import aus Instrumentenprotokollen (Leica, Trimble)
- Konfidenzellipse und statistische Ausreissertests (nur einfache Markierung)
- Distanzabhängige Gewichtung der Richtungen
- Export als CSV oder Text (nur Druckfunktion)
- Login, Benutzerkonten
- Online-Synchronisation, Server, Datenbank
- Externe Bibliotheken (Matrix-, Chart- oder PDF-Bibliotheken)
