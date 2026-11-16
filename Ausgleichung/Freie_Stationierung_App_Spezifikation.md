---
modul: "3030"
modulname: "3D-Datenauswertung und Photogrammetrie"
thema: "Spezifikation HTML-App: Freie Stationierung (vermittelnde Ausgleichung, Distanzen + Richtungen + Massstab)"
typ: spezifikation
tags:
  - modul
  - ausgleichungsrechnung
  - freie-stationierung
  - html-app
status: entwurf
---

# Spezifikation: HTML-App «Freie Stationierung (Ausgleichung)»

**Quellen:** `U_FS_Anleitung.pdf` (F. Rüfenacht, 14.10.2025, Modul 3030), `3030_U04_Florin_Keller.xlsx` (Blätter «5 FP», «8 FP», «Übung»), Obsidian-Vault: *3030_U_Freie_Stationierung_Excel_Schritt_fuer_Schritt* (Modul 3030, Geodätische Statistik).
Die Excel-Formeln sind die verbindliche Referenz. Die App muss die Referenzwerte in Kapitel 9 reproduzieren.

---

## 1. Zweck

Single-File-App (`index.html`, reines HTML/CSS/JavaScript, **keine externen Bibliotheken, offline lauffähig**), die eine **freie Stationierung** (Tachymeter-Standpunkt aus Messungen zu bekannten Anschlusspunkten) nach der **vermittelnden Ausgleichung** berechnet.

Unbekannte (4): **N, E** der Station, **Massstab m**, **Orientierung Ori**.
Beobachtungen pro Anschlusspunkt (2): **Richtung (Hz)** und **Distanz (SD, schräg)**.
Alle Zwischenschritte werden wie im Excel angezeigt (Abschnitte 3–10), damit die Rechnung nachvollziehbar und prüfbar ist.

---

## 2. Eingaben

### 2.1 Pro Anschlusspunkt (Tabelle, 3 bis ca. 20 Zeilen, Zeilen hinzufügen/löschen)

| Feld | Bedeutung | Einheit | Herkunft |
|---|---|---|---|
| `Pt` | Punktname | Text | **gegeben** |
| `E` | Ost-Koordinate Soll (LV95) | m | **gegeben** (Koordinatenliste) |
| `N` | Nord-Koordinate Soll (LV95) | m | **gegeben** |
| `H` | Höhe des Anschlusspunkts | m | **gegeben** |
| `SD` | Schrägdistanz Station → Punkt | m | **gemessen** (Protokoll) |
| `Hz` | Horizontalrichtung | gon | **gemessen** (Protokoll, Lagen gemittelt) |
| `V` | Zenitwinkel | gon | **gemessen** (Protokoll) |

### 2.2 Näherung der Station (Ergebnis der Feld-Stationierung im Instrument)

| Feld | Excel | Einheit |
|---|---|---|
| `E_FS` Näherung | `O3` | m |
| `N_FS` Näherung | `O4` | m |

### 2.3 Konstanten / Modellparameter (Eingabefelder mit Vorgabewerten, änderbar)

| Parameter | Excel | Vorgabe | Einheit |
|---|---|---|---|
| Erdradius `R` | `O2` | 6 378 816 | m |
| `σ0` (a priori) | `O5` | 1 | – |
| `σ_Richtung` | `O6` | **0.003** (Blatt «5 FP») bzw. **0.0003** (Blatt «8 FP») | gon |
| `σ_Distanz konstant` | `O7` | **0.003** («5 FP») bzw. **0.001** («8 FP») | m |
| `σ_Distanz ppm` | `O8` | 1.5 | ppm |
| `N-Ursprung LV95` | `O9` | 1 200 000 | m |
| Massstab-Näherung | `O11` | 1 | – |
| Konvergenzgrenze | PDF Kap. 11.2 | 1·10⁻⁶ | m bzw. gon |
| max. Iterationen | – | 20 | – |

> **Achtung Inkonsistenz in den Unterlagen:** Die PDF-Anleitung nennt $\sigma_d = 1\,\text{mm} + 1.5\,\text{ppm}$ (Leica MS60). Blatt «8 FP» verwendet 1 mm / 0.3 mgon, Blatt «5 FP» aber 3 mm / 3 mgon. Die App darf **keine** Werte fest verdrahten, sondern muss sie als Eingabe führen. Vorgabe im UI: 1 mm / 1.5 ppm / 0.3 mgon (= PDF/«8 FP»), plus Schaltfläche «Beispiel 5 FP laden», die 3 mm / 3 mgon setzt.

### 2.3.1 Optionen

- Checkbox **«Massstab berechnen»** (Vorgabe: an) → u = 4. Wenn aus (optional, in Excel nicht vorhanden, Referenzwerte fehlen): Spalte m entfällt, $m=1$ fix, u = 3.

### 2.4 Validierung

- Mindestens **3 Anschlusspunkte** (n = 6 Beobachtungen, f = 2). Bei 2 Punkten ist f = 0 → s0 nicht berechenbar → Fehlermeldung.
- Alle Zahlfelder numerisch (Punkt oder Komma als Dezimaltrennzeichen akzeptieren), keine leeren Felder.
- Hz in [0, 400), V in (0, 200), SD > 0.
- Station darf nicht auf einem Anschlusspunkt liegen ($s>0$).
- Einfügen aus Zwischenablage (Tab-getrennt aus Excel, Spalten `Pt E N H SD Hz V`) muss unterstützt werden.

---

## 3. Konventionen (wichtig, hier passieren die typischen Fehler)

1. **Winkel in gon**, intern für Trigonometrie nach rad: $\text{rad}=\text{gon}\cdot\frac{\pi}{200}$; zurück: $\text{gon}=\text{rad}\cdot\frac{200}{\pi}$. Abkürzung $\rho=\frac{200}{\pi}$.
2. **Azimut** (Richtung von Station zu Punkt, von Nord im Uhrzeigersinn):
   $\text{Az}=\text{atan2}(\Delta E,\;\Delta N)\cdot\rho \bmod 400$, mit $\Delta E=E_{Pt}-E_{FS}$, $\Delta N=N_{Pt}-N_{FS}$.
   **JavaScript:** `Math.atan2(dE, dN)` (Reihenfolge *y, x*). **Excel `ATAN2(x;y)` hat die umgekehrte Reihenfolge**, in der Excel-Datei steht `ATAN2(ΔN, ΔE)`. Nicht verwechseln.
3. **Wrap-Funktion** auf [−200, +200) gon (für Winkeldifferenzen):
   $\text{wrap}(a)=\big((a+200)\bmod 400\big)-200$. In JS muss `mod` für negative Zahlen korrekt sein: `((a % 400) + 400) % 400`.
4. Rechnung durchgehend in **m und gon**. $\sigma_{Richtung}$ wird in gon eingegeben (0.0003, nicht 0.3).
5. Spaltenreihenfolge der Unbekannten: **[N, E, m, Ori]** (N zuerst).
6. Vorzeichenkonvention: $v = A\,x - f$ mit $f$ = Messung − Näherung.
7. Anzeige: Verbesserungen in **mgon bzw. mm** (= Wert · 1000).

---

## 4. Ablauf der Berechnung

Alle Schritte für i = 1…k Punkte (k = Anzahl Punkte, n = 2k Beobachtungen).

### Schritt 1: Eingaben einlesen
Siehe Kapitel 2.

### Schritt 2: Distanzreduktion (Excel Spalten J, K, L; PDF Kap. 3)

Schrägdistanz → Horizontaldistanz → Höhe 0 → Projektionsebene:

$$dH_i = SD_i\cdot\sin\!\Big(V_i\cdot\frac{\pi}{200}\Big)$$

$$d0_i = dH_i\cdot\frac{R}{R+H_i}$$

$$dProj_i = d0_i\cdot\Big(1+\frac{(N_i-N_{Ursprung})^2}{2R^2}\Big)$$

Hinweise:
- $H_i$ = Höhe des Anschlusspunkts (Station hat keine Höhe in den Eingaben), $N_i$ = Nord-Koordinate des Anschlusspunkts. So rechnet das Excel; so übernehmen.
- Die Projektionsverzerrung ist nach dieser Vorgabe eine Funktion der Nord-Koordinate gegenüber 1 200 000 (Bern). Das entspricht Excel und Vault-Notiz (Notebook rechnet ebenfalls mit Nord).
- Die SD gelten als bereits atmosphärisch korrigiert (kein ppm-Zuschlag).

### Schritt 3: Näherungswerte (Excel Blatt-Bereich «4) Näherungswerte»)

Für jeden Punkt:

$$\Delta E_i=E_i-E_{FS},\quad \Delta N_i=N_i-N_{FS},\quad s_i=\sqrt{\Delta E_i^2+\Delta N_i^2}$$

$$Az_i=\text{atan2}(\Delta E_i,\Delta N_i)\cdot\rho \bmod 400$$

$$Ori_i=\text{wrap}(Az_i-Hz_i)$$

Näherungen der Unbekannten:

| Unbekannte | Näherung |
|---|---|
| $N_0$ | $N_{FS}$ (Eingabe) |
| $E_0$ | $E_{FS}$ (Eingabe) |
| $m_0$ | 1 |
| $Ori_0$ | arithmetisches Mittel der $Ori_i$ (Excel `O10`) |

> **Robustheit (Abweichung vom Excel, gleiches Ergebnis ohne Sprung):** Das Mittel der gewrappten $Ori_i$ versagt, wenn die Werte um ±200 gon streuen (z. B. 199.99 und −199.99). Besser: $Ori_0 = Ori_1+\frac{1}{k}\sum_i \text{wrap}(Ori_i-Ori_1)$, danach wrap. Bei den Testdaten (alle um 0) identisch zum Excel.

### Schritt 4: A-Matrix, f-Vektor, Gewichte (Excel «5) A-Matrix und f-Vektor»)

Zeilenreihenfolge: **zuerst alle k Richtungen** (Punkt 1…k), **dann alle k Distanzen** (Punkt 1…k). Matrix A: n × 4, Spalten [N, E, m, Ori].

**Richtungszeile** für Punkt i:

$$A_{r,i}=\Big[\;\frac{\Delta E_i}{s_i^2}\rho,\;\; -\frac{\Delta N_i}{s_i^2}\rho,\;\; 0,\;\; -1\;\Big]$$

$$f_{r,i}=\text{wrap}\big(Hz_i+Ori_0-Az_i\big)$$

(Im N-Koeffizienten steht $\Delta E$ und umgekehrt: $\frac{\partial Az}{\partial N_{FS}}=+\frac{\Delta E}{s^2}$, weil $\Delta N=N_{Pt}-N_{FS}$.)

**Distanzzeile** für Punkt i:

$$A_{d,i}=\Big[\;-\frac{\Delta N_i}{s_i},\;\; -\frac{\Delta E_i}{s_i},\;\; -dProj_i,\;\; 0\;\Big]$$

$$f_{d,i}=m_0\cdot dProj_i-s_i$$

**Standardabweichungen und Gewichte** (PDF Kap. 7 und 8):

$$\sigma_{r,i}=\sigma_{Richtung},\qquad \sigma_{d,i}=\sigma_{d,const}+\sigma_{ppm}\cdot10^{-6}\cdot SD_i\ \ (\text{Schrägdistanz!})$$

$$p_i=\Big(\frac{\sigma_0}{\sigma_i}\Big)^2$$

P ist eine **Diagonalmatrix** (n × n). Nicht als volle Matrix multiplizieren, sondern zeilenweise gewichten (effizienter, gleiches Ergebnis).

### Schritt 5: Normalgleichungssystem (PDF Kap. 9)

$$N=A^TPA\ (4\times4),\qquad n=A^TPf\ (4\times1),\qquad Q_{xx}=N^{-1},\qquad x=Q_{xx}\,n$$

4×4-Inverse selbst implementieren (Gauss-Jordan mit Pivotsuche). Prüfung: N symmetrisch; bei Singularität (Pivot ≈ 0) Fehlermeldung «Geometrie ungeeignet / Punkte kollinear».

### Schritt 6: Volle Unbekannte (PDF Kap. 10)

$$X = X_0 + x$$

d. h. $N=N_0+x_N,\; E=E_0+x_E,\; m=m_0+x_m,\; Ori=Ori_0+x_{Ori}$. Das Ergebnis $x$ ist nur der **Zuschlag** zur Näherung.

### Schritt 7: Verbesserungen auf zwei Arten + Schlussprobe (PDF Kap. 11)

**(a) Matrix:** $v = A\,x - f$

**(b) Aus der Beobachtungsgleichung** mit den ausgeglichenen Unbekannten $(N,E,m,Ori)$ (Excel Spalte «v aus BGL»):

$$v_{r,i}=\text{wrap}\Big(\text{atan2}(E_i-E,\;N_i-N)\cdot\rho \bmod 400\;-\;(Hz_i+Ori)\Big)$$

$$v_{d,i}=\sqrt{(N_i-N)^2+(E_i-E)^2}-m\cdot dProj_i$$

**Schlussprobe:** $\max|v-v_{BGL}|\le 10^{-6}$ (m bzw. gon; PDF: $10^{-6}$ m). Excel zeigt die Differenz zusätzlich ×1000 (µm-Bereich als mm|mgon).

### Schritt 8: Iteration (PDF Kap. 11.2; im Excel **nicht** umgesetzt, nur geprüft)

Wenn die Schlussprobe nicht erfüllt ist: neue Näherungen $X_0 := X$ (**N, E, m, Ori**), alles ab Schritt 3 neu rechnen (Näherungs-$s_i$, $Az_i$, A, f; $dProj_i$ und $Ori_i$ bleiben gleich, aber $Ori_0$ wird jetzt der ausgeglichene Wert, nicht neu gemittelt). Abbruch bei erfüllter Bedingung oder nach max. Iterationen (dann Warnung). Anzahl Iterationen und Differenz pro Iteration anzeigen.
Bei den Beispieldaten genügt **1 Iteration** (Differenz 1.4·10⁻⁷ bzw. 4.4·10⁻⁷).

### Schritt 9: Ausgeglichene Beobachtungen (PDF Kap. 12; Excel «9)»)

| Typ | gemessen (Spalte B) | v | ausgeglichen |
|---|---|---|---|
| Richtung | $Hz_i+Ori$ (mit ausgeglichener Ori) | $v_{r,i}$ aus (a) | $Hz_i+Ori+v_{r,i}$ |
| Distanz | $m\cdot dProj_i$ | $v_{d,i}$ aus (a) | $m\cdot dProj_i+v_{d,i}$ |

(Die ausgeglichene Richtung ist damit ein ausgeglichenes **Azimut** = Hz + Ori + v. So macht es das Excel.)

### Schritt 10: Modelltest und Genauigkeit (Excel «10)»)

$$n=2k,\quad u=4,\quad f=n-u$$

$$v^TPv=\sum_i p_i v_i^2,\qquad s_0=\sqrt{\frac{v^TPv}{f}},\qquad F=\Big(\frac{s_0}{\sigma_0}\Big)^2$$

$$\text{Grenze}=\frac{\chi^2_{0.95}(f)}{f}\quad(\text{Excel: }\texttt{CHIINV(0.05,f)/f})$$

Test: $F\le\text{Grenze}$ → «bestanden», sonst «NICHT bestanden».

Genauigkeit der Unbekannten (a posteriori, mit $s_0$):

$$s_N=s_0\sqrt{q_{NN}}\ [\text{mm}],\quad s_E=s_0\sqrt{q_{EE}}\ [\text{mm}],\quad s_m=s_0\sqrt{q_{mm}}\ [\text{ppm}],\quad s_{Ori}=s_0\sqrt{q_{OriOri}}\ [\text{mgon}]$$

(Umrechnung: ×1000 für mm bzw. mgon, ×10⁶ für ppm; $q_{ii}$ = Diagonale von $Q_{xx}$.)

**χ²-Quantil in JS:** `CHIINV` gibt es nicht. Implementieren über regularisierte unvollständige Gammafunktion $P(f/2,\,x/2)$ und Bisektion/Newton auf $P=0.95$. Alternative: Tabelle für f = 1…50 hinterlegen (Werte für f = 1…12 siehe Kapitel 9.3). Die Implementierung muss für f = 6 den Wert 2.0985979 und für f = 12 den Wert 1.7521725 liefern.

---

## 5. Ausgabe (was die App anzeigen muss)

**Hauptergebnis (oben, hervorgehoben):**

| Grösse | Anzeige |
|---|---|
| N ausgeglichen | m, 4 Nachkommastellen (intern volle Genauigkeit) ± s_N [mm] |
| E ausgeglichen | m, 4 Nachkommastellen ± s_E [mm] |
| Massstab m | 9 Nachkommastellen, zusätzlich in ppm ((m−1)·10⁶) ± s_m [ppm] |
| Orientierung Ori | gon, 6 Nachkommastellen ± s_Ori [mgon] |
| s0, F, Grenze, Modelltest | «bestanden» grün / «NICHT bestanden» rot |
| Iterationen, max. \|v − v_BGL\| | |

**Detail-Tabellen (aufklappbar, Reihenfolge wie Excel):**
1. Eingabedaten
2. Distanzreduktion: dH, d0, dProj je Punkt
3. Näherungswerte: ΔE, ΔN, s, Azimut, Ori_i; Ori_0
4. A-Matrix, f-Vektor, σ, p
5. N-Matrix, n-Vektor, Qxx, x-Vektor
6. Volle Unbekannte: Näherung / x / ausgeglichen
7. Verbesserungen: v (A·x−f), v aus BGL, Differenz, v in mgon|mm
8. Ausgeglichene Beobachtungen: gemessen / v / ausgeglichen
9. Modelltest und Genauigkeiten

Je Iteration die Tabellen 3–7 verfügbar machen (Dropdown «Iteration»).

**Export:** Ergebnis als CSV und als Text zum Kopieren (Hauptergebnis + Verbesserungen). Optional Druckansicht.

---

## 6. UI-Anforderungen

- Ein Bildschirm: links Eingaben, rechts/unten Ergebnis. Schaltflächen: **Berechnen**, **Beispiel 5 FP laden**, **Beispiel 8 FP laden**, **Zurücksetzen**.
- Neuberechnung auf Knopfdruck (und optional live). Fehlermeldungen in Klartext (Deutsch).
- Zahlenformat: Dezimalpunkt, Ausgabe mit fester Nachkommastellenzahl pro Grösse, **Rechnung immer in vollen Gleitkommazahlen** (`Number`, Float64). Keine Rundung in Zwischenschritten.
- Kopfzeile je Tabelle mit Einheit. Verbesserungen mit |v|/σ-Hinweis optional markieren (siehe Kapitel 10).
- Deutsche Beschriftungen. Keine Cookies/Tracking, keine Netzwerkzugriffe.

## 7. Technische Struktur (Vorschlag)

Funktionen (rein, ohne DOM, damit testbar):

```js
reduceDistance(pt, R, Norg)            // -> {dH, d0, dProj}
wrap(a)                                // -> [-200, 200)
az(dE, dN)                             // Math.atan2(dE, dN) * 200/Math.PI mod 400
approx(points, E_FS, N_FS)             // -> {rows[], ori0}
buildSystem(points, X0, params)        // -> {A, f, p, sigma}
solveNormal(A, f, p)                   // -> {N, n, Q, x}
residualsBGL(points, X, params)        // -> v_BGL
adjust(points, E_FS, N_FS, params)     // Iterationsschleife, liefert alle Zwischenresultate je Iteration
chi2inv95(f)                           // Quantil 0.95 der Chi-Quadrat-Verteilung
```

Die Schleife in `adjust` läuft, bis `max|v − v_BGL| ≤ tol` oder `maxIter` erreicht ist.
Im Code zusätzlich ein Selbsttest-Button «Testdaten prüfen», der die Referenzwerte aus Kapitel 9 mit Toleranz vergleicht und Pass/Fail anzeigt.

---

## 8. Was ist gegeben, was musst du eingeben, was kommt heraus

| Kategorie | Inhalt |
|---|---|
| **Selbst eingeben (Messung)** | SD, Hz, V je Anschlusspunkt (aus Stationsprotokoll) |
| **Selbst eingeben (Näherung)** | E und N der Station aus der Feld-Stationierung |
| **Gegeben (Datenbank/Koordinatenliste)** | E, N, H der Anschlusspunkte |
| **Gegeben (Konstanten)** | R = 6 378 816 m, N-Ursprung 1 200 000 m, σ0 = 1, Massstab-Näherung 1 |
| **Gegeben (Instrumentenmodell, anpassbar)** | σ_Richtung, σ_Distanz konstant, σ_Distanz ppm |
| **Berechnet** | dProj, Näherungs-Azimute/-Distanzen, Ori-Näherung, A, f, P, N, n, Qxx, x |
| **Ergebnis** | N, E, m, Ori (ausgeglichen) mit Genauigkeiten; v; ausgeglichene Beobachtungen; s0, F, Modelltest |

---

## 9. Testdaten und Referenzwerte

Alle Referenzwerte wurden aus dem Excel gelesen und mit einer unabhängigen Python-Rechnung (Matrizenrechnung, gleiche Formeln) **bis auf die 9. Nachkommastelle reproduziert**.

### 9.1 Gemeinsame Konstanten

R = 6 378 816, N-Ursprung = 1 200 000, σ0 = 1, $E_{FS}$ = 2649113.522, $N_{FS}$ = 1178804.43, Massstab-Näherung = 1.

### 9.2 Messdaten (Blatt «8 FP»; Blatt «5 FP» = die ersten 5 Zeilen)

| Pt | E | N | H | SD | Hz | V |
|---|---|---|---|---|---|---|
| HST1 | 2649124.715 | 1178821.293 | 698 | 20.398 | 37.3137 | 91.9816 |
| HZP107 | 2649162.997 | 1178783.962 | 697.438 | 53.583 | 124.967 | 97.6236 |
| HZP101 | 2649137.446 | 1178699.689 | 688.704 | 107.657 | 185.7055 | 103.9849 |
| HZP102 | 2649119.386 | 1178735.626 | 692.349 | 69.224 | 194.5858 | 104.4077 |
| HZP103 | 2649093.081 | 1178683.844 | 686.417 | 122.784 | 210.6901 | 105.5677 |
| HZP104 | 2649105.136 | 1178824.986 | 699.531 | 22.333 | 375.3425 | 93.1608 |
| HZP105 | 2649115.193 | 1178826.105 | 700.195 | 21.956 | 4.9044 | 91.1068 |
| HZP106 | 2649101.21 | 1178793.021 | 693.605 | 16.891 | 252.4332 | 106.9186 |

Distanzreduktion dProj [m] (Kontrolle Schritt 2):

| Pt | dH | d0 | dProj |
|---|---|---|---|
| HST1 | 20.236415922 | 20.234201801 | 20.234313326 |
| HZP107 | 53.545672798 | 53.539818936 | 53.540115075 |
| HZP101 | 107.446163848 | 107.434564420 | 107.435163391 |
| HZP102 | 69.058149414 | 69.050654739 | 69.051038414 |
| HZP103 | 122.314726151 | 122.301565421 | 122.302248294 |
| HZP104 | 22.204249269 | 22.201814514 | 22.201936842 |
| HZP105 | 21.742118740 | 21.739732396 | 21.739852165 |
| HZP106 | 16.791350740 | 16.789525119 | 16.789617906 |

### 9.3 Testfall A: «5 FP» (Punkte HST1 … HZP103)

Parameter: σ_Richtung = **0.003 gon**, σ_Distanz = **0.003 m + 1.5 ppm**.

| Zwischenwert | Referenz |
|---|---|
| Ori-Näherung | −0.000638471 gon |
| Gewichte Richtung | 111 111.111 |
| Gewichte Distanz | 108 878.874 / 105 388.436 / 100 050.119 / 103 801.222 / 98 629.282 |
| n, u, f | 10, 4, 6 |
| Zuschläge x [N, E, m, Ori] | 1.503090030e-03 m, −1.888266726e-03 m, 5.216089963e-05, 9.494207686e-04 gon |
| **N ausgeglichen** | **1178804.431503090 m** |
| **E ausgeglichen** | **2649113.520111733 m** |
| **m** | **1.000052161** |
| **Ori** | **0.000310950 gon** |
| Iterationen | 1 (max \|v−v_BGL\| = 1.4·10⁻⁷) |
| vᵀPv | 7.036948 |
| s0 | 1.082970 |
| F | 1.172825 |
| Grenze χ²(0.95; 6)/6 | 2.098598 |
| Modelltest | **bestanden** |
| s_N / s_E / s_m / s_Ori | 2.0438 mm / 1.2663 mm / 24.508 ppm / 1.8774 mgon |

Verbesserungen v [mgon für Richtungen, mm für Distanzen], Reihenfolge Ri(HST1…HZP103), Di(HST1…HZP103):
`−1.2793, 5.7822, −2.5562, −0.4054, −1.5413 | 4.0876, 1.1211, −0.3648, 0.4530, −1.2151`

### 9.4 Testfall B: «8 FP» (alle 8 Punkte)

Parameter: σ_Richtung = **0.0003 gon**, σ_Distanz = **0.001 m + 1.5 ppm**.

| Zwischenwert | Referenz |
|---|---|
| Ori-Näherung | −0.002768303 gon |
| Gewicht Richtung | 11 111 111.111 |
| n, u, f | 16, 4, 12 |
| Zuschläge x [N, E, m, Ori] | −2.157279796e-03 m, −1.030624711e-03 m, 1.665864135e-05, 5.892607121e-04 gon |
| **N ausgeglichen** | **1178804.427842720 m** |
| **E ausgeglichen** | **2649113.520969375 m** |
| **m** | **1.000016659** |
| **Ori** | **−0.002179043 gon** |
| Iterationen | 1 (max \|v−v_BGL\| = 4.4·10⁻⁷) |
| vᵀPv | 1720.621337 |
| s0 | 11.974352 |
| F | 143.385111 |
| Grenze χ²(0.95; 12)/12 | 1.752172 |
| Modelltest | **NICHT bestanden** (das ist das erwartete Ergebnis, kein Programmfehler) |
| s_N / s_E / s_m / s_Ori | 1.0982 mm / 0.7414 mm / 73.043 ppm / 1.3161 mgon |

Verbesserungen v [mgon | mm], Reihenfolge Ri(8 Punkte), Di(8 Punkte):
`−7.4040, 4.6404, −0.0538, 2.5858, 1.7073, 5.3820, −1.4662, −5.3915 | 7.3814, 0.8301, −0.3101, −0.8155, −0.3386, 0.0702, 1.3319, −6.6909`

Der durchgefallene Modelltest ist plausibel: Verbesserungen bis 7.4 mgon bzw. 7.4 mm stehen σ_Richtung = 0.3 mgon und σ_d ≈ 1 mm gegenüber (zu optimistisches stochastisches Modell, kurze Distanzen, Zentrierung/Zielung).

### 9.5 χ²-Grenzen $\frac{\chi^2_{0.95}(f)}{f}$ zum Testen von `chi2inv95`

| f | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Grenze | 3.841459 | 2.995732 | 2.604909 | 2.371932 | 2.214100 | 2.098598 | 2.009591 | 1.938414 | 1.879886 | 1.830704 | 1.788649 | 1.752172 |

### 9.6 Weitere Kontrollen für die Implementierung

1. Richtungszeilen: Spalte m = 0, Spalte Ori = −1. Distanzzeilen: Spalte Ori = 0, Spalte m = $-dProj$.
2. Distanzzeilen: $(\partial s/\partial N)^2+(\partial s/\partial E)^2=1$.
3. N-Matrix symmetrisch; Eintrag (Ori, Ori) = $\sum p_{r}$ = k · p_r (5 FP: 555 555.5556; 8 FP: 88 888 888.889).
4. Diagonale von $Q_{xx}$ (5 FP): N 3.562e-06, E 1.367e-06, m 5.121e-10, Ori 3.005e-06.
5. Spalte «Differenz» (v − v_BGL)·1000 ≤ 0.0004 (5 FP) bzw. 0.00044 (8 FP).

---

## 10. Stolperfallen, Abweichungen, offene Punkte

**Beim Implementieren zwingend beachten (aus Excel und Vault-Notiz):**
- `ATAN2`-Argumentreihenfolge (Excel `(x;y)`, JS `Math.atan2(y, x)`); hier immer Azimut = atan2(ΔE, ΔN).
- Ori_i **wrappen**, sonst Sprung 0/400 (Vault: naives Mittel lieferte ~160 gon).
- `f` für Richtungen ebenfalls wrappen.
- Gewichte der Distanz aus der **Schrägdistanz** SD, nicht aus dProj.
- Spalte «N» der A-Matrix enthält bei Richtungen $\Delta E$ (und umgekehrt).
- Texteingaben zu Zahlen parsen (sonst Vergleich «Zahl ≤ Text» → fälschlich «bestanden»).
- Einheiten: Richtungen in gon, v-Anzeige ×1000 → mgon bzw. mm.

**Unterschiede / Lücken in den Unterlagen (bewusst entschieden, bitte prüfen):**
1. Das Excel **iteriert nicht**, es prüft nur einmal. Die App iteriert automatisch (PDF Kap. 11.2 verlangt es).
2. σ-Annahmen sind in PDF, «5 FP» und «8 FP» **nicht identisch** (siehe 2.3). Die App führt sie als Eingabe.
3. Die Schlussprobe-Toleranz ist im PDF mit $10^{-6}$ m angegeben, gilt aber auch für Richtungen (gon). Die App wendet $10^{-6}$ in den jeweiligen Einheiten (m bzw. gon) an. Die Vault-Notiz verwendet im Notebook 0.01 (mgon/mm) = $10^{-5}$ m/gon, deutlich lockerer. Tolerant einstellbar machen.
4. Die Höhenreduktion nutzt nur $H$ des Anschlusspunkts, die Projektionsreduktion nur dessen N (nicht Mittelwert mit der Station). Für kurze Distanzen vernachlässigbar, entspricht aber der Vorgabe.
5. Blatt «Übung» im Excel ist nur eine unausgefüllte Vorlage (A-Matrix leer), nicht als Referenz verwendbar.
6. Das Excel gleicht pro Station genau **einen** Standpunkt aus (keine Mehrfach-Stationen, keine Beobachtungen in 2 Lagen einzeln, Lagen sind vorher gemittelt).
7. «Massstab ausschalten» (u = 3) ist eine Zusatzoption aus der Vault-Notiz (Variante 2), im Excel nicht umgesetzt, daher ohne Referenzwerte.

**Optionale Erweiterungen (nicht Teil des Mindestumfangs):**
- Normierte Verbesserungen $|v_i|/\sigma_i$ zur Ausreisserhinweis-Markierung (nach nicht bestandenem Modelltest).
- Konfidenzellipse der Station aus $Q_{xx}$ (Teilmatrix N/E), siehe Modul 3030, Folien «Genauigkeit» (Übung U1).
- Variante ohne Massstab (u = 3) mit Vergleich.
- Eingabe-Import aus Leica-/Trimble-Protokoll (CSV).
- Gewichtung der Richtungen distanzabhängig (PDF Kap. 7 erwähnt das als mögliche Weiterentwicklung).

---

## 11. Verknüpfungen (Vault)

- [[3030_U_Freie_Stationierung_Excel_Schritt_fuer_Schritt]] — Excel-Anleitung, Kontrollwerte, Stolperfallen (Modul 3030)
- [[3030_GSA_V02_Folien_Vermittelnde_Ausgleichung_Teil1]] — BGL/VGL, Normalgleichungen
- [[3030_GSA_V04_Folien_Lagenetze]] — Beobachtungstypen im Lagenetz
- [[3030_GSA_V07_1_Folien_Genauigkeit]] — Qxx, Konfidenzellipse (Übung U1 zur freien Station)
- [[3030_GSA_V07_2_Folien_Zuverlaessigkeit]] — Ausreissertests
- [[3030_Niemeier_Kap4_Grundlagen_Ausgleichungsrechnung]] — Näherungswerte, Iteration, Globaltest
- [[3070 - Aufgabenstellung Feldkurs Vermessung]] — freie Station AP20 (Modul 3070)
- [[3070 - TPS Stationsprotokoll]] — Quelle von SD, Hz, V
- [[1040_Skript_Messtechnik]] — Totalstation, Distanzreduktion
- [[2030 - Übersicht Statistik II]] — χ²-Test
- [[2020 - Übersicht Mathematik II]] — Matrizenrechnung, Taylor
