
# Ta bort de 2 sista tempopunkterna (19 och 20)

Mallen ska ha exakt 18 tempon istället för 20. De två sista "Sång"-raderna (order_index 19 och 20) tas bort.

## Ändring

**Fil:** `src/lib/secure-api.ts` (rad 144-145)

Ta bort dessa två rader:
- `{ order_index: 19, title: 'Sång', ... }`
- `{ order_index: 20, title: 'Sång', ... }`

Ingen annan fil behöver ändras -- numreringen i UI:t är dynamisk (1 till N).
