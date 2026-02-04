
# Plan: Uppdatera Dela-funktionen till PIN-baserad delning

## Sammanfattning
Dela-knappen ska visa enkel information: appens länk och sessionens PIN-kod. Det gamla delningskodsystemet (KTH-XXXX) tas bort helt.

---

## Vad som ändras

### 1. Spara PIN-koden lokalt vid upplåsning
När användaren matar in rätt PIN sparas den i localStorage tillsammans med edit_token, så att den kan visas senare vid delning.

**Fil:** `src/lib/session-utils.ts`
- Lägg till ny funktion `saveSessionPin(sessionId, pin)` för att spara PIN
- Lägg till ny funktion `getSessionPin(sessionId)` för att hämta sparad PIN
- Uppdatera `saveEditToken` så att den kan ta emot och spara PIN

### 2. Uppdatera upplåsningsflödet
När PIN verifieras och är korrekt, spara den lokalt.

**Fil:** `src/components/MySessionsList.tsx`
- I `handlePinSubmit`: Spara PIN-koden tillsammans med edit_token

**Fil:** `src/lib/secure-api.ts`
- I `createSession`: Spara PIN direkt vid skapande (skaparen har ju redan angett den)

### 3. Helt nytt utseende för ShareDialog

**Fil:** `src/components/ShareDialog.tsx`
- Ta bort gamla `shareCode` och `shareUrl` props
- Lägg till `sessionPin` prop
- Nytt innehåll:
  - Rubrik: "Dela sittningen"
  - Appens länk: `https://toastmasterkth.lovable.app/`
  - PIN-kod för aktuell session
  - En knapp som kopierar båda till urklipp

### 4. Uppdatera SessionView
Skicka rätt data till ShareDialog.

**Fil:** `src/pages/SessionView.tsx`
- Hämta sparad PIN via `getSessionPin(session.id)`
- Skicka `sessionPin` istället för `shareCode` till ShareDialog

---

## Tekniska detaljer

### Ny localStorage-struktur
```typescript
// Befintlig struktur (edit tokens)
sittning_edit_tokens: { [sessionId]: editToken }

// Ny struktur (sparade PINs)
sittning_session_pins: { [sessionId]: pinCode }
```

### Nytt ShareDialog-gränssnitt
```
┌─────────────────────────────────────┐
│         Dela sittningen             │
├─────────────────────────────────────┤
│                                     │
│  Öppna appen:                       │
│  ┌─────────────────────────────┐   │
│  │ toastmasterkth.lovable.app  │ 📋│
│  └─────────────────────────────┘   │
│                                     │
│  Ange PIN-kod:                      │
│  ┌─────────────────────────────┐   │
│  │         1 2 3 4             │ 📋│
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │     Kopiera länk + PIN      │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │        Dela via...          │   │
│  └─────────────────────────────┘   │
│                                     │
└─────────────────────────────────────┘
```

### Kopiera-text format
```
Öppna appen: https://toastmasterkth.lovable.app/
PIN-kod: 1234
```

---

## Filer som ändras
1. `src/lib/session-utils.ts` - Ny funktion för att spara/hämta PIN
2. `src/components/MySessionsList.tsx` - Spara PIN vid upplåsning
3. `src/lib/secure-api.ts` - Spara PIN vid skapande
4. `src/components/ShareDialog.tsx` - Helt ny design
5. `src/pages/SessionView.tsx` - Skicka PIN till ShareDialog

---

## Viktigt
- Gamla delningskoder (`share_code`) finns kvar i databasen för bakåtkompatibilitet
- `/join/:code`-routen kan behållas men används inte längre aktivt
- PIN-koden sparas endast lokalt för användare som redan har verifierat den
