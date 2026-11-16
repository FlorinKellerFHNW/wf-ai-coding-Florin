# Projektname
Basketball-Statsheet

> **SPEC.md – Ihr Projektsteckbrief.** Diese Datei beschreibt, *was* Ihre App können soll.
> Sie wächst über alle vier Kurstage und ist Ihr wichtigster Kontext für die KI.
> Ersetzen Sie die Platzhalter in *kursiv*. Ein Beispiel finden Sie ganz unten.

## Idee
Die App dient dazu, um Statistiken während eines Basketballspiels des eigenen Teams zu erfassen und auszuwerten.

## Für wen
Die App richtet sich an Basketballcoaches.

## User Stories
*Format: Als … möchte ich …, damit …*

- Als Coach möchte ich Statistiken erfassen, damit ich einen Überblick über die Leistung der einzelnen Spieler habe.
- Als Coach möchte ich beim erfassen der Statistiken eine Spielernummer auswählen können, dann geht ein fenster auf, in dem ich die Statistik erfassen kann, sodass die App möglichst wenig Platz auf dem Bildschirm einnimmt.
-Als Coach möchte ich, dass die erfassten Spielernummern automatisch sortiert werden, damit ich die Spieler schneller finde.
- Als Spieler möchte ich nach einem Spiel in einem Bericht sehen, wie viele Punkte, Rebounds, Assists, Fouls, Blocks und Steals ich hatte, damit ich meine Leistung verbessern kann.
- Als Coach möchte ich die einzelnen Viertel analysieren können, damit ich die Leistung meines Teams besser verstehen kann.
- Als Coach möchte ich vor dem Spiel die Spieler auswählen können, damit ich die Statistiken für die richtigen Spieler erfassen kann.
- Als Coach benötige ich nach dem Spiel einen gesamtbericht mit den Statistiken aller Spieler, damit ich die Leistung des Teams bewerten kann.

## Datenmodell
*Welche Dinge (Objekte) gibt es, und welche Eigenschaften mit welchem Typ haben sie?*
```
// Objekt: Statistik · Zweck: Zahlen eines Spielers in einem Viertel festhalten
{
  spieler: "Nr. 30",
  viertel: 1, 
  punkte: 0,
  rebounds: 0,
  assists: 0,
  fouls: 0,
  blocks: 0,
  steals: 0
}
```

## Datenkarte
| Frage | Meine App |
| --- | --- |
| Welche Daten gibt es? | Spieler (Name und Rückennummer), Statistiken (Punkte, Rebounds, Assists, Fouls, Blocks, Steals) pro Spieler und Viertel |
| Welche Eingaben braucht es? | Spieler hinzufügen, Klick auf einen Knopf (z. B. +2 Punkte, Rebound, Foul), Viertel wechseln, Zähler mit «−1» korrigieren |
| Welche Entscheidungen werden getroffen? | Zu welchem Spieler und welchem Viertel gehört der Klick? Sind Punkte 1, 2 oder 3 wert? Jede Statistik soll auch wieder korrigiert werden können |
| Was wird wiederholt? | Für jeden Spieler und jedes Viertel werden die Statistiken durchgegangen und zusammengezählt. Die Spielerliste wird Zeile für Zeile angezeigt. |
| Was ist der Zustand? | Liste der Spieler, Liste der Statistiken, aktuelles Viertel (1–4). Alles wird in localStorage gespeichert. |
| Welche Ausgabe entsteht? | Spielerliste mit den Summen pro Spieler, Auswertung pro Viertel, Bericht pro Spieler nach dem Spiel als HTML-Datei (interaktiv). |

## Offene Fragen
- Export als PDF: Ohne Bibliothek geht das über die Druckfunktion des Browsers («Als PDF speichern»). Umgesetzt mit dem Knopf «Spielbericht als PDF speichern / drucken».

## Nicht im Umfang
- mehrere Spiele
- Login
- mehrere Teams
- Gegnerstatistiken
- Online-Synchronisation

---

<details>
<summary>Beispiel: SPEC.md v0 «Giess-Planer»</summary>

```
# Giess-Planer

## Idee
Erinnert mich, wann welche Zimmerpflanze Wasser braucht.

## Für wen
Mich und meine WG

## User Stories
- Als Nutzer:in möchte ich Pflanzen erfassen, damit ich den Überblick habe.
- Als Nutzer:in möchte ich sehen, welche Pflanze heute Wasser braucht.
- Als Nutzer:in möchte ich eine Pflanze als gegossen markieren,
  damit der nächste Termin neu berechnet wird.

## Datenmodell
// Objekt: Pflanze · Zweck: Giess-Erinnerung
{
  name: "Monstera",
  intervall_tage: 7,
  zuletzt_gegossen: "2026-11-01"
}
```
</details>
