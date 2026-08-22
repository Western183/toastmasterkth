// Built-in songbook catalogue — Kungliga Maskinsektionens songbook (2024).
// Stored locally in the app; no external fetch at runtime.

export interface SongbookSong {
  title: string;
  page: number;
  category: string;
}

export const songbook: SongbookSong[] = [
  // Högtidliga visor
  { title: 'Du gamla, du fria', page: 6, category: 'Högtidliga visor' },
  { title: 'Studentsången', page: 7, category: 'Högtidliga visor' },
  { title: 'Kungssången', page: 8, category: 'Högtidliga visor' },
  { title: 'Ska man inte va gla på sin födelsedag', page: 8, category: 'Högtidliga visor' },
  { title: 'Sveriges Flagga', page: 9, category: 'Högtidliga visor' },

  // Maskinsånger
  { title: 'Hela M', page: 11, category: 'Maskinsånger' },
  { title: 'Vi äro maskinare', page: 12, category: 'Maskinsånger' },
  { title: 'Häfvarvisan', page: 12, category: 'Maskinsånger' },
  { title: 'Minnena från KTH', page: 13, category: 'Maskinsånger' },
  { title: 'InnE I smÖrjIs', page: 14, category: 'Maskinsånger' },
  { title: 'Ta mig M, KTH', page: 15, category: 'Maskinsånger' },
  { title: 'En kväll i Smörjis', page: 16, category: 'Maskinsånger' },
  { title: 'Mellankör', page: 17, category: 'Maskinsånger' },
  { title: 'Efterkör', page: 18, category: 'Maskinsånger' },
  { title: 'Jag fick godkänt på min tenta', page: 19, category: 'Maskinsånger' },
  { title: 'Vi är från M', page: 20, category: 'Maskinsånger' },
  { title: 'Flytta till Stockholm', page: 21, category: 'Maskinsånger' },
  { title: 'Tjugotre', page: 23, category: 'Maskinsånger' },
  { title: 'De har kallat oss svin', page: 24, category: 'Maskinsånger' },
  { title: 'Klockan tre', page: 25, category: 'Maskinsånger' },
  { title: 'Ta mig till Ugglan', page: 26, category: 'Maskinsånger' },
  { title: 'Aldrig kommer jag ångra en dag', page: 27, category: 'Maskinsånger' },
  { title: 'Oh M!', page: 28, category: 'Maskinsånger' },

  // Visor till nubben
  { title: 'Helan', page: 30, category: 'Visor till nubben' },
  { title: 'Halvan', page: 30, category: 'Visor till nubben' },
  { title: 'Tersen (Halvan var bra)', page: 31, category: 'Visor till nubben' },
  { title: 'Qvarten (Vikingen)', page: 31, category: 'Visor till nubben' },
  { title: 'Qvinten (Mera brännvin)', page: 32, category: 'Visor till nubben' },
  { title: 'Sexten (Måsen)', page: 32, category: 'Visor till nubben' },
  { title: 'Septen (Gums visa)', page: 33, category: 'Visor till nubben' },
  { title: '(Repetitionen) Skinn å ben', page: 33, category: 'Visor till nubben' },
  { title: 'Ko-ko-ko-kosken-ko-ko-ko-korvaa', page: 34, category: 'Visor till nubben' },
  { title: 'Rännan (Långt ner i Småland)', page: 35, category: 'Visor till nubben' },
  { title: 'Fritt förklaras ordet', page: 36, category: 'Visor till nubben' },
  { title: 'Mitt lilla lån', page: 36, category: 'Visor till nubben' },
  { title: 'Smuttan (Träförädling)', page: 37, category: 'Visor till nubben' },
  { title: 'Lilla Manasse (Wenngarn)', page: 37, category: 'Visor till nubben' },
  { title: 'Till Spritbolaget', page: 38, category: 'Visor till nubben' },
  { title: 'När jag tar mig en sup', page: 38, category: 'Visor till nubben' },
  { title: 'Alla här vid borden', page: 39, category: 'Visor till nubben' },
  { title: 'Rosenbad', page: 39, category: 'Visor till nubben' },
  { title: 'Imbelupet', page: 40, category: 'Visor till nubben' },
  { title: 'Djävulen ska ut', page: 41, category: 'Visor till nubben' },
  { title: 'Hyfsvisa', page: 41, category: 'Visor till nubben' },
  { title: 'Brännvin är jäkla gott', page: 42, category: 'Visor till nubben' },
  { title: 'Grova snapsvisan', page: 42, category: 'Visor till nubben' },
  { title: 'Uti vår mage', page: 43, category: 'Visor till nubben' },

  // Visor till vinet
  { title: 'Lyft ditt välförsedda glas', page: 45, category: 'Visor till vinet' },
  { title: 'Detta glas som står på bordet', page: 46, category: 'Visor till vinet' },
  { title: 'Bordeaux, Bordeaux', page: 46, category: 'Visor till vinet' },
  { title: 'Så lunka vi', page: 47, category: 'Visor till vinet' },
  { title: 'Bort allt vad oro gör', page: 48, category: 'Visor till vinet' },
  { title: 'Så länge rösten är mild', page: 49, category: 'Visor till vinet' },
  { title: 'Vinet i glasen', page: 49, category: 'Visor till vinet' },
  { title: 'Deformationshärdning', page: 50, category: 'Visor till vinet' },

  // Gasquevisor
  { title: 'Porthos visa', page: 52, category: 'Gasquevisor' },
  { title: 'Hej på er bröder alla', page: 53, category: 'Gasquevisor' },
  { title: 'Kalmarevisan', page: 53, category: 'Gasquevisor' },
  { title: 'Vaskan', page: 55, category: 'Gasquevisor' },
  { title: 'O.D.E till ölet', page: 56, category: 'Gasquevisor' },
  { title: 'Öla Bröla', page: 57, category: 'Gasquevisor' },
  { title: 'Jasen', page: 58, category: 'Gasquevisor' },
  { title: 'Système International d’Unités', page: 58, category: 'Gasquevisor' },
  { title: 'Jag har aldrig vart på snusen', page: 59, category: 'Gasquevisor' },
  { title: 'KOMA', page: 60, category: 'Gasquevisor' },
  { title: 'Vänd på fickorna', page: 61, category: 'Gasquevisor' },
  { title: 'Jag var full en gång', page: 61, category: 'Gasquevisor' },
  { title: 'Nu skall du dricka långsamt', page: 62, category: 'Gasquevisor' },
  { title: 'Skitåkar-Anders', page: 63, category: 'Gasquevisor' },
  { title: 'Siljan', page: 63, category: 'Gasquevisor' },
  { title: 'Spritnoblessens dryckesmarsch', page: 64, category: 'Gasquevisor' },
  { title: 'Härjarevisan', page: 65, category: 'Gasquevisor' },
  { title: 'Osquar Mutters skål', page: 66, category: 'Gasquevisor' },
  { title: '10,2', page: 67, category: 'Gasquevisor' },
  { title: 'Kaffe', page: 67, category: 'Gasquevisor' },
  { title: 'Strejk på Pripps', page: 68, category: 'Gasquevisor' },
  { title: 'Siffervisan', page: 68, category: 'Gasquevisor' },
  { title: 'Det regnar i dalen', page: 69, category: 'Gasquevisor' },

  // Utrikiska visor
  { title: 'Jag ska festa', page: 72, category: 'Utrikiska visor' },
  { title: 'Himlatelefonen', page: 73, category: 'Utrikiska visor' },
  { title: 'Theodor', page: 75, category: 'Utrikiska visor' },
  { title: 'Skål kamrater', page: 75, category: 'Utrikiska visor' },
  { title: 'Hell and gore', page: 76, category: 'Utrikiska visor' },
  { title: 'Ein König', page: 76, category: 'Utrikiska visor' },
  { title: 'Finsk supvisa', page: 76, category: 'Utrikiska visor' },
  { title: 'Svåra ord', page: 77, category: 'Utrikiska visor' },
  { title: 'Øl, Øl Herlige Øl', page: 78, category: 'Utrikiska visor' },
  { title: 'Skånsk Språkvisa', page: 78, category: 'Utrikiska visor' },

  // Visor till punchen
  { title: 'Punschen kommer', page: 80, category: 'Visor till punchen' },
  { title: 'Punsch, punsch', page: 80, category: 'Visor till punchen' },
  { title: 'Civilingenjörens skål', page: 81, category: 'Visor till punchen' },
  { title: 'Studiemedelsrondo', page: 81, category: 'Visor till punchen' },
  { title: 'Det var en gång jag tänkt', page: 82, category: 'Visor till punchen' },
  { title: 'Punchen ska jag dricka', page: 83, category: 'Visor till punchen' },
  { title: 'När festen man vill liva', page: 84, category: 'Visor till punchen' },
  { title: 'FestU:s punschvisa', page: 84, category: 'Visor till punchen' },
  { title: 'Enkelriktat', page: 84, category: 'Visor till punchen' },
  { title: 'Djungelpunsch', page: 85, category: 'Visor till punchen' },
  { title: 'Punschen', page: 86, category: 'Visor till punchen' },
  { title: 'Härlig är punschen', page: 86, category: 'Visor till punchen' },
  { title: 'Punschen! Punschen!', page: 87, category: 'Visor till punchen' },
  { title: 'Tucks punschvisa', page: 87, category: 'Visor till punchen' },
  { title: 'Gudars punschvisa', page: 88, category: 'Visor till punchen' },
  { title: 'Sista punschvisan', page: 88, category: 'Visor till punchen' },

  // Serenader
  { title: 'En liten blå förgätmigej', page: 90, category: 'Serenader' },
  { title: 'Hjalmar', page: 90, category: 'Serenader' },

  // Klassiska visor
  { title: 'Vila vid denna källa', page: 92, category: 'Klassiska visor' },
  { title: 'Sjösala vals', page: 93, category: 'Klassiska visor' },
  { title: 'Längtan till landet', page: 94, category: 'Klassiska visor' },
  { title: 'Visa vid vindens ängar', page: 95, category: 'Klassiska visor' },
  { title: 'Somliga går med trasiga skor', page: 96, category: 'Klassiska visor' },
  { title: 'Stockholm i mitt hjärta', page: 97, category: 'Klassiska visor' },
  { title: 'Fritiof och Carmencita', page: 99, category: 'Klassiska visor' },
  { title: 'Sakta vi går genom stan', page: 101, category: 'Klassiska visor' },
];

// Compact category filters shown as chips (short label → full category name)
export const SONGBOOK_FILTERS: { label: string; category: string | null }[] = [
  { label: 'Alla', category: null },
  { label: 'Högtidliga', category: 'Högtidliga visor' },
  { label: 'Maskinsånger', category: 'Maskinsånger' },
  { label: 'Nubbe', category: 'Visor till nubben' },
  { label: 'Vin', category: 'Visor till vinet' },
  { label: 'Gasquevisor', category: 'Gasquevisor' },
  { label: 'Utrikiska', category: 'Utrikiska visor' },
  { label: 'Punsch', category: 'Visor till punchen' },
  { label: 'Serenader', category: 'Serenader' },
  { label: 'Klassiska', category: 'Klassiska visor' },
];

// Case-insensitive and diacritic-tolerant (å/ä/ö/é etc. match their base letters too)
function fold(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

export function searchSongbook(query: string, category: string | null = null): SongbookSong[] {
  const q = fold(query.trim());
  return songbook.filter((song) => {
    if (category && song.category !== category) return false;
    if (!q) return true;
    return fold(song.title).includes(q) || fold(song.category).includes(q);
  });
}
