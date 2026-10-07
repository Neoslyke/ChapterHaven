const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'list_formatted.txt');
const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/).filter(l => l.trim().length > 0);

const entries = lines.map((l, index) => {
  const parts = l.split('|').map(p => p.trim());
  const title = parts[0] || '';
  const alt = parts[1] || '';
  const chapter = parts[2] || '0';
  return {
    lineNum: index + 1,
    raw: l,
    title,
    alt,
    chapter,
    clean: title.toLowerCase().replace(/[^a-z0-9]/g, '')
  };
});

// 1. Exact duplicates (case-insensitive)
const exactMap = new Map();
const exactDupes = [];

for (const e of entries) {
  const key = e.title.toLowerCase();
  if (exactMap.has(key)) {
    exactDupes.push({
      first: exactMap.get(key),
      second: e
    });
  } else {
    exactMap.set(key, e);
  }
}

// 2. Normalized duplicates (ignoring spaces, punctuation, e.g. "A-rank" vs "A Rank" or "Disciple's" vs "Disciples")
const cleanMap = new Map();
const punctuationDupes = [];

for (const e of entries) {
  if (!e.clean) continue;
  if (cleanMap.has(e.clean)) {
    const prev = cleanMap.get(e.clean);
    if (prev.title.toLowerCase() !== e.title.toLowerCase()) {
      punctuationDupes.push({
        first: prev,
        second: e
      });
    }
  } else {
    cleanMap.set(e.clean, e);
  }
}

// 3. Title vs Alternative Title cross-matches
const altDupes = [];
for (let i = 0; i < entries.length; i++) {
  for (let j = 0; j < entries.length; j++) {
    if (i === j) continue;
    const a = entries[i];
    const b = entries[j];
    if (a.alt && b.title.toLowerCase() === a.alt.toLowerCase()) {
      altDupes.push({
        entryWithAlt: a,
        entryWithTitle: b
      });
    }
  }
}

// 4. Fuzzy / high similarity matches (Levenshtein ratio or one is prefix/suffix of another)
function similarity(s1, s2) {
  if (s1 === s2) return 1.0;
  if (s1.length === 0 || s2.length === 0) return 0.0;
  
  // Longer / shorter
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  
  // Substring check (e.g. "Season 2" suffix)
  if (longer.includes(shorter) && shorter.length >= 8) {
    return 0.90;
  }

  // Edit distance
  const costs = [];
  for (let i = 0; i <= s1.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= s2.length; j++) {
      if (i === 0) {
        costs[j] = j;
      } else {
        if (j > 0) {
          let newValue = costs[j - 1];
          if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
            newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
          }
          costs[j - 1] = lastValue;
          lastValue = newValue;
        }
      }
    }
    if (i > 0) costs[s2.length] = lastValue;
  }
  return (longer.length - costs[s2.length]) / longer.length;
}

const fuzzyDupes = [];
for (let i = 0; i < entries.length; i++) {
  for (let j = i + 1; j < entries.length; j++) {
    const a = entries[i];
    const b = entries[j];
    
    // Skip if already in exact or punctuation
    if (a.clean === b.clean) continue;

    // Remove common prefixes like "the " for comparison
    const tA = a.title.toLowerCase().replace(/^the\s+/, '');
    const tB = b.title.toLowerCase().replace(/^the\s+/, '');

    const sim = similarity(tA, tB);
    if (sim >= 0.88 && Math.abs(tA.length - tB.length) <= 10) {
      fuzzyDupes.push({ a, b, sim: (sim * 100).toFixed(0) });
    }
  }
}

console.log('====================================================');
console.log(`TOTAL ENTRIES ANALYZED: ${entries.length}`);
console.log('====================================================');

console.log(`\n1. EXACT DUPLICATES: ${exactDupes.length}`);
exactDupes.forEach(d => {
  console.log(`  - Line ${d.first.lineNum}: "${d.first.title}" (Ch. ${d.first.chapter})`);
  console.log(`    Line ${d.second.lineNum}: "${d.second.title}" (Ch. ${d.second.chapter})`);
});

console.log(`\n2. PUNCTUATION / SPACING DUPLICATES: ${punctuationDupes.length}`);
punctuationDupes.forEach(d => {
  console.log(`  - Line ${d.first.lineNum}: "${d.first.title}" (Ch. ${d.first.chapter})`);
  console.log(`    Line ${d.second.lineNum}: "${d.second.title}" (Ch. ${d.second.chapter})`);
});

console.log(`\n3. TITLE vs ALT TITLE DUPLICATES: ${altDupes.length}`);
altDupes.forEach(d => {
  console.log(`  - Line ${d.entryWithAlt.lineNum}: Title "${d.entryWithAlt.title}", Alt: "${d.entryWithAlt.alt}"`);
  console.log(`    Line ${d.entryWithTitle.lineNum}: Title "${d.entryWithTitle.title}"`);
});

console.log(`\n4. CLOSE / FUZZY / SUBTITLE DUPLICATES: ${fuzzyDupes.length}`);
fuzzyDupes.forEach(d => {
  console.log(`  - (${d.sim}% match)`);
  console.log(`    Line ${d.a.lineNum}: "${d.a.title}" (Ch. ${d.a.chapter})`);
  console.log(`    Line ${d.b.lineNum}: "${d.b.title}" (Ch. ${d.b.chapter})`);
});
