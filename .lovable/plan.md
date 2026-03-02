

# Fix: Drag-and-drop-bugg, ny 20-punktsmall, och rensning av person till NULL

## Tre problem att fixa

### 1. Drag-and-drop fungerar opaalitligt
**Orsak:** InlineTempoCard har en 300ms debounce som kan skicka gammal data (inklusive order_index) UNDER eller EFTER en drag-operation, vilket skriver over den nya ordningen.

**Fix:**
- Lagg till en `isDragging`-prop till InlineTempoCard
- Nar `isDragging` ar true, avbryt alla pendande debounce-sparningar och blockera nya
- SessionView skickar `isDragging={activeId !== null}` till alla kort

**Filer:** `src/components/InlineTempoCard.tsx`, `src/pages/SessionView.tsx`

### 2. Kan inte rensa person_id (eller andra falt) till NULL
**Orsak:** SQL-funktionen `update_tempo_item_with_token` anvander `CASE WHEN p_person_id IS NOT NULL THEN ... ELSE person_id END`. Det gar aldrig att satta ett falt till NULL -- NULL tolkas som "andra inte".

**Fix:** Anvand en speciell text-sentinel i JS-lagret. For text-falt (page, note) skicka tom strang `''` for att rensa till NULL. For person_id, anvand en nil-UUID `00000000-0000-0000-0000-000000000000`. Uppdatera SQL-funktionen att kanna igen dessa sentinels.

**Filer:** Ny databasmigrering, `src/lib/secure-api.ts`

### 3. Ny standardmall med exakt 20 tempon

```text
 1. Porthos visa          s.52   "Valkomna"
 2. Theodor               s.76   "Presentera foratt + spec"
 3. Sang
 4. Sang
 5. Sang
 6. Sang                         "Presentera Huvudratt + Spec"
 7. Sang
 8. Sang
 9. Sang
10. Sang
11. Sang                         "Efteratt + spec"
12. Sang
13. Sang
14. Sang
15. Punchen kommer        s.80
16. Punschsang
17. Sista punschen        s.88
18. En liten bla forgatmigej s.90 "Tacka personalen"
19. Sang
20. Sang
```

**Fil:** `src/lib/secure-api.ts`

---

## Realtidssynk -- bevaras som den ar
Inga andringar i `useSession.ts` eller realtidslogiken. Broadcast + postgres_changes forblir identiskt. Fixarna ovan forhindrar bara att debounce-sparningar skickar gammal data under drag.

---

## Tekniska detaljer

### Databasmigrering: Uppdatera `update_tempo_item_with_token`
Ny logik for att rensa falt till NULL:
- `p_person_id = '00000000-0000-0000-0000-000000000000'` --> satt till NULL
- `p_page = ''` --> satt till NULL
- `p_note = ''` --> satt till NULL
- `p_video_count = -1` --> satt till NULL
- `p_live_count = -1` --> satt till NULL
- `NULL` --> behall befintligt varde (ingen andring)

### InlineTempoCard: Ny `isDragging`-prop
```typescript
interface InlineTempoCardProps {
  // ... existing props
  isDragging?: boolean; // NEW: when true, cancel and block debounce saves
}
```

I komponenten: `useEffect` som nar `isDragging` blir true avbryter paaende timeout, och `debouncedSave` returnerar omedelbart om `isDragging` ar true.

### secure-api.ts: Sentinel-hantering
`updateTempoItemWithToken` uppdateras sa att:
- `person_id: null` i updates --> skickar sentinel-UUID till RPC
- `page: null` --> skickar tom strang
- Samma for note, video_count, live_count

### SessionView: Skicka isDragging
Lagg till `isDragging={activeId !== null}` pa varje InlineTempoCard.

---

## Filer som andras
1. **Ny databasmigrering** -- Uppdaterad `update_tempo_item_with_token` med sentinel-stod
2. **`src/lib/secure-api.ts`** -- Ny 20-punktsmall + sentinel-logik i updateTempoItemWithToken
3. **`src/components/InlineTempoCard.tsx`** -- Ny `isDragging`-prop som blockerar debounce
4. **`src/pages/SessionView.tsx`** -- Skicka `isDragging` till InlineTempoCard

