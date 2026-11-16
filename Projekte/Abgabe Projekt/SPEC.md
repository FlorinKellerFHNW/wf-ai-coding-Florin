# Projektname
Projekt

> **SPEC.md – Ihr Projektsteckbrief.** Diese Datei beschreibt, *was* Ihre App können soll.
> Sie wächst über alle vier Kurstage und ist Ihr wichtigster Kontext für die KI.
> Ersetzen Sie die Platzhalter in *kursiv*. Ein Beispiel finden Sie ganz unten.

## Idee


## Für wen


## User Stories
*Format: Als … möchte ich …, damit …*



## Datenmodell
*Welche Dinge (Objekte) gibt es, und welche Eigenschaften mit welchem Typ haben sie?*
```
// Objekt: xxx · Zweck: xxx
{

}
```

## Datenkarte
| Frage | Meine App |
| --- | --- |


## Offene Fragen
- 
- 

## Nicht im Umfang
- 
- 

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
