const fs = require('fs');
const path = require('path');

const inputPath = path.join(__dirname, '..', 'list.txt');
const rawContent = fs.readFileSync(inputPath, 'utf8');
const lines = rawContent.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);

function parseMangaLine(rawLine) {
  let line = rawLine.trim();
  if (!line) return null;

  let status = 'Reading';
  // Check for status markers like "Complete" or "- End"
  if (/\b(?:complete|completed)\b/i.test(line)) {
    status = 'Completed';
    line = line.replace(/\b(?:complete|completed)\b/gi, '').trim();
  } else if (/-\s*end\b/i.test(line)) {
    status = 'Completed';
    line = line.replace(/-\s*end\b/gi, '').trim();
  }

  // Extract trailing chapter number (e.g. 14, 3.5, 22.2)
  let chapter = 0;
  const numMatch = line.match(/\s+([0-9]+(?:\.[0-9]+)?)$/);
  if (numMatch) {
    chapter = parseFloat(numMatch[1]) || 0;
    line = line.slice(0, numMatch.index).trim();
  }

  // Check for alternative name separated by /
  let title = line;
  let altTitles = '';

  if (line.includes('/')) {
    const parts = line.split('/').map(p => p.trim()).filter(Boolean);
    title = parts[0] || '';
    altTitles = parts.slice(1).join(', ');
  }

  // Classify type based on keywords
  let type = 'Manga';
  const lower = (title + ' ' + altTitles).toLowerCase();
  if (
    lower.includes('isekai') || 
    lower.includes(' no ') || 
    lower.includes(' wa ') || 
    lower.includes(' ni ') || 
    lower.includes(' kara ') || 
    lower.includes(' de ') ||
    lower.includes('kenja') ||
    lower.includes('eiyuuden') ||
    lower.includes('saikyou') ||
    lower.includes('boukensha') ||
    lower.includes('hero party') ||
    lower.includes('shoukougun')
  ) {
    type = 'Manga';
  } else if (
    lower.includes('cultivat') || 
    lower.includes('martial') || 
    lower.includes('heavens') || 
    lower.includes('realm') || 
    lower.includes('zhu zai') || 
    lower.includes('god king') || 
    lower.includes('immortal') ||
    lower.includes('shendi') ||
    lower.includes('demon sovereign')
  ) {
    type = 'Manhua';
  } else if (
    lower.includes('leveling') || 
    lower.includes('ranker') || 
    lower.includes('murim') || 
    lower.includes('villainess') || 
    lower.includes('reincarnat') || 
    lower.includes('regression') || 
    lower.includes('player') || 
    lower.includes('returner') || 
    lower.includes('hunter') ||
    lower.includes('duke') ||
    lower.includes('mount hua') ||
    lower.includes('wudang') ||
    lower.includes('shaman') ||
    lower.includes('chaebol') ||
    lower.includes('gangster') ||
    lower.includes('prince') ||
    lower.includes('noble') ||
    lower.includes('tower') ||
    lower.includes('dungeon')
  ) {
    type = 'Manhwa';
  }

  return {
    title,
    alt_titles: altTitles,
    chapter,
    is_favorite: 0,
    type,
    status
  };
}

const entries = lines.map(parseMangaLine).filter(Boolean);

console.log(`Parsed ${entries.length} out of ${lines.length} lines.`);

// Write JSON import file
const jsonOutputPath = path.join(__dirname, '..', 'list_import.json');
fs.writeFileSync(jsonOutputPath, JSON.stringify(entries, null, 2), 'utf8');
console.log(`Wrote JSON import file: ${jsonOutputPath}`);

// Write formatted text file (Title | Alt Titles | Chapter)
const txtOutputPath = path.join(__dirname, '..', 'list_formatted.txt');
const formattedLines = entries.map(e => `${e.title} | ${e.alt_titles} | ${e.chapter}`);
fs.writeFileSync(txtOutputPath, formattedLines.join('\n'), 'utf8');
console.log(`Wrote formatted text file: ${txtOutputPath}`);

// Write CSV file
const csvOutputPath = path.join(__dirname, '..', 'list_import.csv');
const csvHeaders = ['title', 'alt_titles', 'chapter', 'is_favorite', 'type', 'status', 'url', 'notes'];
const csvRows = [csvHeaders.join(',')];
for (const e of entries) {
  const row = [
    `"${(e.title || '').replace(/"/g, '""')}"`,
    `"${(e.alt_titles || '').replace(/"/g, '""')}"`,
    e.chapter,
    0,
    `"${e.type}"`,
    `"${e.status}"`,
    '""',
    '""'
  ];
  csvRows.push(row.join(','));
}
fs.writeFileSync(csvOutputPath, csvRows.join('\r\n'), 'utf8');
console.log(`Wrote CSV import file: ${csvOutputPath}`);
