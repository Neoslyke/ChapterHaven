const titles = [];
const genres = ['Reincarnation', 'Return', 'Leveling', 'Regression', 'Swordmaster', 'Cultivator', 'Dungeon', 'Villainess', 'Hero', 'Necromancer'];
const types = ['Manhwa', 'Manga', 'Manhua'];

for (let i = 1; i <= 1000; i++) {
  const g = genres[i % genres.length];
  titles.push({
    title: `${g} of the Heavenly ${i % 50 === 0 ? 'Demon' : 'Master ' + i}`,
    alt_titles: `Alternate ${g} Title, Korea ${i}, Chinese ${i}`,
    chapter: Math.round((i * 2.5) % 300),
    is_favorite: i % 15 === 0 ? 1 : 0,
    type: types[i % 3]
  });
}

const start = performance.now();
const query = 'reincarnation';
const filtered = titles.filter(e => 
  (e.title || '').toLowerCase().includes(query) || 
  (e.alt_titles || '').toLowerCase().includes(query)
);

const favs = [];
const nonFavs = [];

for (const item of filtered) {
  if (item.is_favorite) favs.push(item);
  else nonFavs.push(item);
}

favs.sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base', numeric: true }));
nonFavs.sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base', numeric: true }));

const duration = (performance.now() - start).toFixed(2);

console.log(`Total database entries: ${titles.length}`);
console.log(`Query: "${query}"`);
console.log(`Matching results: ${filtered.length}`);
console.log(`- Favorites section (sorted A-Z): ${favs.length}`);
console.log(`- All Titles section (sorted A-Z): ${nonFavs.length}`);
console.log(`⚡ Instant search & sort execution time: ${duration} ms`);

