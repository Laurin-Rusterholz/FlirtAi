# 💕 Date-Einladung für Cati

Eine kleine, voll handyoptimierte (mobile-first) Date-Einladungs-Seite.
Reines HTML/CSS/JS — kein Build-Schritt, keine Abhängigkeiten.

## Ablauf

1. **Frage-Seite** — „Cati, gehst du mit mir auf ein Date?“ mit **Ja** und **Nein**.
   Der **Nein**-Button flüchtet bei Annäherung/Berührung an eine zufällige Stelle
   (auf dem Handy praktisch nicht zu treffen), der **Ja**-Button wächst dabei.
   **Ja** → Konfetti & Herzen, weiter zur Termin-Seite.
2. **Termin-Seite** — „Wann kannst du?“ mit mobilem Datums- & Uhrzeit-Picker und
   praktischen Schnellauswahl-Chips.
3. **Danke-Seite** — „Ich freue mich auf dich!“ mit Herzregen.

Sobald Cati den Termin bestätigt, wird automatisch eine **Aufgabe** in der
ai-sync / Quantus-App angelegt (mit dem gewählten Datum & Uhrzeit).

## ai-sync anbinden

Die Seite ruft beim Bestätigen die Netlify-Function `date-invite` der ai-sync-Seite
auf (siehe `ai-sync`-Repo, `netlify/functions/date-invite.mjs`). Da beide Seiten auf
**unterschiedlichen** Netlify-Domains liegen, muss die Seite die ai-sync-URL kennen.

Die URL lässt sich auf drei Wegen setzen (in dieser Reihenfolge):

1. **Query-Parameter** (einmal aufrufen, wird im Browser gemerkt):
   `https://<diese-seite>/?api=https://<deine-ai-sync>.netlify.app`
2. **localStorage**-Eintrag `aiSyncBase`
3. Die Konstante **`AI_SYNC_BASE`** oben in `public/app.js`

Ist nichts gesetzt, funktioniert die Seite trotzdem vollständig — es wird dann nur
keine Aufgabe verschickt. Eine Sicherungskopie der letzten Auswahl liegt unter
`localStorage["lastDateInvite"]`.

> Optionaler Schutz: Setzt man in der ai-sync-Seite die Env-Variable
> `DATE_INVITE_TOKEN`, verlangt die Function einen `Authorization`-Header — für eine
> private Liebeserklärung in der Regel nicht nötig.

## Lokal ansehen

Einfach `public/index.html` im Browser öffnen, oder:

```bash
npx serve public
```

## Deployen

Auf Netlify als statische Seite (`publish = "public"`, kein Build) — z. B. das Repo
verbinden oder den `public/`-Ordner per Drag & Drop hochladen.
