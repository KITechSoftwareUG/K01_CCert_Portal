

# Offene Punkte aus der Feedback-Liste

Nach Abgleich mit dem aktuellen Code ergeben sich folgende noch nicht umgesetzte oder fehlerhafte Punkte. Jeder Punkt ist ein eigenstaendiger Prompt, den du einzeln absenden kannst.

---

## 1. Kontakt-Notizen: Absaetze ermoeglichen

**Problem:** Im Kontakt-Notizenfeld (`ContactManagement.tsx`, Zeile 295) wird die CSS-Klasse `truncate` verwendet, die mehrzeilige Texte abschneidet. Absaetze (Zeilenumbrueche) werden nicht dargestellt.

**Prompt:**
> "Im Ansprechpartner-Bereich (ContactManagement) werden Notizen mit `truncate` abgeschnitten. Bitte die Anzeige so aendern, dass mehrzeilige Notizen mit Absaetzen korrekt dargestellt werden (whitespace-pre-wrap), aehnlich wie das Bemerkungsfeld beim Kunden."

---

## 2. Aufgeklappte Kunden beim Zurueckspringen beibehalten

**Problem:** Der State fuer `expandedGroups` und `expandedClients` in `Clients.tsx` wird bei Navigation zurueckgesetzt, da er nur als lokaler `useState` existiert.

**Prompt:**
> "Wenn ich von einer Kundendetailseite zurueck zur Kundenliste navigiere, sollen die zuvor aufgeklappten Laender, Gruppen und Kunden weiterhin aufgeklappt sein. Bitte den Expand-State persistent machen (z.B. ueber URL-Parameter, sessionStorage oder einen globalen State)."

---

## 3. Nach Kundenanlage direkt zum neuen Kunden navigieren

**Problem:** Nach dem Erstellen eines Kunden im `NewClientDialog` wird der Dialog geschlossen, aber nicht zum neu angelegten Kunden navigiert.

**Prompt:**
> "Nach dem erfolgreichen Anlegen eines neuen Kunden im Dialog soll automatisch zur Detailseite des neu angelegten Kunden navigiert werden. Das gleiche gilt beim Bearbeiten: nach dem Speichern soll der Nutzer beim bearbeiteten Kunden bleiben bzw. dorthin zurueckgeleitet werden."

---

## 4. Den aktuell bearbeiteten/aufgeklappten Kunden visuell hervorheben

**Problem:** In der Kundenliste gibt es keine visuelle Hervorhebung des aktuell ausgewaehlten/aufgeklappten Kunden.

**Prompt:**
> "In der Kundenübersicht soll der Kunde, der gerade aufgeklappt ist, deutlicher visuell hervorgehoben werden (z.B. durch eine farbliche Hinterlegung oder einen linken Akzentbalken), damit man sofort erkennt, welchen Kunden man gerade betrachtet."

---

## 5. Laenderliste in ClientDetail.tsx aktualisieren

**Problem:** Die Laenderliste in `ClientDetail.tsx` (Zeile 67-80) enthaelt falsche Laender (Schweiz, Belgien, Frankreich, Polen, Tschechien, Spanien, UK) und es fehlen die korrekten (Rumaenien, Ungarn, Slowenien, Finnland, Litauen, Schweden).

**Prompt:**
> "Die Laenderliste im Client-Detail-Bearbeitungsmodus (ClientDetail.tsx) ist veraltet und stimmt nicht mit der korrekten Laenderliste ueberein. Bitte synchronisiere sie mit der Liste aus NewClientDialog.tsx: Deutschland, Oesterreich, Rumaenien, Italien, Ungarn, Slowenien, Finnland, Litauen, Niederlande, Schweden, Andere."

---

## 6. Terminologie "Kunde seit" ueberarbeiten

**Problem:** Die Anzeige "Kunde seit Januar 2026" ist inhaltlich irrefuehrend, da es sich um das Anlagedatum im System handelt, nicht um die tatsaechliche Kundenbeziehung.

**Prompt:**
> "Bitte die Terminologie 'Kunde seit' auf der Kundendetailseite ueberarbeiten. Entweder in 'Angelegt am' oder 'Im System seit' aendern, da es das Datum der Anlage im Portal widerspiegelt und nicht den tatsaechlichen Beginn der Kundenbeziehung."

---

## 7. Placeholder-E-Mail bei Kundenanlage vermeiden

**Problem:** In `NewClientDialog.tsx` Zeile 186 wird eine Placeholder-E-Mail generiert (`name@placeholder.local`), wenn keine E-Mail angegeben wird. Dies fuehrt zu Datenverschmutzung.

**Prompt:**
> "Beim Anlegen eines Kunden ohne E-Mail-Eingabe wird aktuell eine Placeholder-E-Mail generiert (`...@placeholder.local`). Bitte entferne diese Logik und erlaube stattdessen NULL-Werte fuer das E-Mail-Feld. Falls die Datenbank-Spalte `email` aktuell NOT NULL ist, muss das Schema entsprechend angepasst werden."

---

## 8. Zertifizierer-Eingabemaske: Fokus-Problem beheben

**Problem:** Bei der Eingabe in der Zertifizierer-Verwaltung muss man vor jedem Buchstaben mit der Maus an die Stelle klicken - das deutet auf ein Re-Rendering-Problem hin, bei dem der Fokus verloren geht.

**Prompt:**
> "Die Eingabemaske bei 'Zertifizierer hinzufuegen' hat ein Fokus-Problem: Vor dem Schreiben jedes Buchstabens muss man erneut mit der Maus in das Feld klicken. Bitte untersuche die Komponente auf der Seite CertificationBodies auf Re-Rendering-Probleme, die den Input-Fokus zuruecksetzen."

---

## 9. Inaktive Kunden: Falsche Anzahl in der Anzeige

**Problem:** Es werden mehr inaktive Kunden angezeigt als tatsaechlich als inaktiv markiert sind. Moeglicherweise werden Kunden mit `is_active = null` als inaktiv gezaehlt.

**Prompt:**
> "In der Kundenübersicht werden bei Filter 'Nur inaktive Kunden' mehr Eintraege angezeigt als tatsaechlich inaktiv markiert sind. Bitte pruefe die Filterlogik: `client.is_active === false` sollte strikt nur explizit als inaktiv markierte Kunden anzeigen, nicht solche mit NULL-Wert."

---

## 10. Datenqualitaet im Dashboard: Alle unvollstaendigen Zertifikate anzeigen

**Problem:** Die Datenqualitaets-Scrollliste zeigt moeglicherweise nicht alle unvollstaendigen Zertifikate an.

**Prompt:**
> "Im Dashboard-Bereich 'Datenqualitaet' sollen alle unvollstaendigen Zertifikate in der Scrollliste dargestellt werden, nicht nur eine begrenzte Anzahl. Bitte pruefe, ob es ein Limit gibt, und stelle sicher, dass die komplette Liste scrollbar angezeigt wird."

---

## Bereits umgesetzte Punkte (keine Aktion noetig)

Die folgenden Punkte aus der Feedbackliste sind im Code bereits korrekt implementiert:

- Pflichtfelder mit rotem Sternchen
- Berater als Pflichtfeld
- E-Mail, Telefon, Ansprechpartner optional
- Rumaenien und Ungarn in der Laenderliste (NewClientDialog)
- Auditoren-Format "Nachname, Vorname"
- Audit-Historie (letzte 10 Audits)
- Kalender-Monatsübersicht mit Monatsnamen
- Anklickbare Kalendertage
- Datumsformat dd.MM.yyyy
- Aktiv/Inaktiv-Status bei Kundenanlage
- Filter aktiv/inaktiv/alle in Kundenübersicht
- Internes Audit als Audittyp
- Audit-Listenansicht
- Bemerkungsfeld (Notes) fuer Kunden
- Unternehmensgruppen loeschen und umbenennen
- Kundensortierung nach Laenderkennung
- Gruppen aufloesen (Kunden verschieben)
- Outlook-Synchronisation (Einbahnstrasse)

---

## Technische Details

| Datei | Aenderung |
|---|---|
| `src/components/ContactManagement.tsx` | `truncate` durch `whitespace-pre-wrap` ersetzen (Zeile 295) |
| `src/pages/Clients.tsx` | Expand-State in sessionStorage persistieren |
| `src/components/NewClientDialog.tsx` | Nach Erstellung `navigate(/clients/{id})` aufrufen; Placeholder-E-Mail entfernen |
| `src/pages/ClientDetail.tsx` | Laenderliste synchronisieren; "Kunde seit" umbenennen |
| `src/pages/CertificationBodies.tsx` | Fokus-Verlust im Eingabeformular debuggen |
| `src/pages/Dashboard.tsx` | Datenqualitaet-Limit pruefen |
| DB-Schema | `clients.email` auf nullable setzen falls noetig |

