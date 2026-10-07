const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const dbDir = path.resolve(process.env.DATA_DIR || path.join(__dirname, '..', 'data'));
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = process.env.DATABASE_PATH || path.join(dbDir, 'chapterhaven.db');
const db = new DatabaseSync(dbPath);

// Enable WAL mode for high read/write performance
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    alt_titles TEXT DEFAULT '',
    chapter REAL DEFAULT 0,
    is_favorite INTEGER DEFAULT 0,
    type TEXT DEFAULT 'Manga',
    status TEXT DEFAULT 'Reading',
    url TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_entries_title ON entries(title);
  CREATE INDEX IF NOT EXISTS idx_entries_fav ON entries(is_favorite);
  CREATE INDEX IF NOT EXISTS idx_entries_updated ON entries(updated_at);
`);

const queries = {
  getAll: db.prepare(`
    SELECT * FROM entries 
    ORDER BY is_favorite DESC, title COLLATE NOCASE ASC
  `),

  getById: db.prepare(`SELECT * FROM entries WHERE id = ?`),

  insert: db.prepare(`
    INSERT INTO entries (title, alt_titles, chapter, is_favorite, type, status, url, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `),

  update: db.prepare(`
    UPDATE entries 
    SET title = ?, alt_titles = ?, chapter = ?, is_favorite = ?, type = ?, status = ?, url = ?, notes = ?, updated_at = ?
    WHERE id = ?
  `),

  delete: db.prepare(`DELETE FROM entries WHERE id = ?`),

  toggleFav: db.prepare(`
    UPDATE entries 
    SET is_favorite = CASE WHEN is_favorite = 1 THEN 0 ELSE 1 END,
        updated_at = ?
    WHERE id = ?
  `),

  updateChapter: db.prepare(`
    UPDATE entries 
    SET chapter = ?, updated_at = ?
    WHERE id = ?
  `)
};

function getAllEntries() {
  return queries.getAll.all();
}

function getEntryById(id) {
  return queries.getById.get(Number(id));
}

function createEntry(data) {
  const now = new Date().toISOString();
  const title = (data.title || '').trim();
  const altTitles = (data.alt_titles || '').trim();
  const chapter = parseFloat(data.chapter) || 0;
  const isFavorite = data.is_favorite ? 1 : 0;
  const type = data.type || 'Manga';
  const status = data.status || 'Reading';
  const url = (data.url || '').trim();
  const notes = (data.notes || '').trim();

  const result = queries.insert.run(
    title,
    altTitles,
    chapter,
    isFavorite,
    type,
    status,
    url,
    notes,
    now,
    now
  );
  return getEntryById(result.lastInsertRowid);
}

function updateEntry(id, data) {
  const existing = getEntryById(id);
  if (!existing) return null;

  const now = new Date().toISOString();
  const title = data.title !== undefined ? String(data.title).trim() : existing.title;
  const altTitles = data.alt_titles !== undefined ? String(data.alt_titles).trim() : existing.alt_titles;
  const chapter = data.chapter !== undefined ? (parseFloat(data.chapter) || 0) : existing.chapter;
  const isFavorite = data.is_favorite !== undefined ? (data.is_favorite ? 1 : 0) : existing.is_favorite;
  const type = data.type !== undefined ? data.type : existing.type;
  const status = data.status !== undefined ? data.status : existing.status;
  const url = data.url !== undefined ? String(data.url).trim() : existing.url;
  const notes = data.notes !== undefined ? String(data.notes).trim() : existing.notes;

  queries.update.run(
    title,
    altTitles,
    chapter,
    isFavorite,
    type,
    status,
    url,
    notes,
    now,
    Number(id)
  );

  return getEntryById(id);
}

function updateChapter(id, chapterVal) {
  const now = new Date().toISOString();
  const chapter = parseFloat(chapterVal) || 0;
  queries.updateChapter.run(chapter, now, Number(id));
  return getEntryById(id);
}

function toggleFavorite(id) {
  const now = new Date().toISOString();
  queries.toggleFav.run(now, Number(id));
  return getEntryById(id);
}

function deleteEntry(id) {
  const existing = getEntryById(id);
  if (!existing) return false;
  queries.delete.run(Number(id));
  return true;
}

function bulkCreateEntries(items) {
  const now = new Date().toISOString();
  db.exec('BEGIN TRANSACTION;');
  try {
    let count = 0;
    for (const item of items) {
      if (!item || !item.title) continue;
      const title = String(item.title).trim();
      if (!title) continue;
      const altTitles = String(item.alt_titles || item.alternative_titles || item.alternate_names || '').trim();
      const chapter = parseFloat(item.chapter) || 0;
      const isFavorite = item.is_favorite ? 1 : 0;
      const type = item.type || 'Manga';
      const status = item.status || 'Reading';
      const url = String(item.url || '').trim();
      const notes = String(item.notes || '').trim();

      queries.insert.run(
        title,
        altTitles,
        chapter,
        isFavorite,
        type,
        status,
        url,
        notes,
        now,
        now
      );
      count++;
    }
    db.exec('COMMIT;');
    return { success: true, count };
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }
}

module.exports = {
  db,
  getAllEntries,
  getEntryById,
  createEntry,
  updateEntry,
  updateChapter,
  toggleFavorite,
  deleteEntry,
  bulkCreateEntries
};
