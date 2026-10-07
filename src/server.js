require('dotenv').config();
const express = require('express');
const path = require('path');
const db = require('./db');
const { basicAuthMiddleware } = require('./auth');

const app = express();
const PORT = process.env.PORT || 3000;
const BASE_PATH = (process.env.BASE_PATH || '/chapterhaven').replace(/\/+$/, ''); // e.g. "/chapterhaven"

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint (accessible without auth if needed for container monitoring)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Redirect root to BASE_PATH
if (BASE_PATH && BASE_PATH !== '') {
  app.get('/', (req, res) => {
    res.redirect(`${BASE_PATH}/`);
  });
}

// Router for subpath /chapterhaven
const router = express.Router();

// Apply HTTP Basic Auth to everything under /chapterhaven
router.use(basicAuthMiddleware);

// Serve static assets
const publicPath = path.join(__dirname, '..', 'public');
router.use(express.static(publicPath));

// API Routes
// 1. Get all entries
router.get('/api/entries', (req, res) => {
  try {
    const entries = db.getAllEntries();
    res.json(entries);
  } catch (err) {
    console.error('Error fetching entries:', err);
    res.status(500).json({ error: 'Failed to fetch entries' });
  }
});

// 2. Get single entry
router.get('/api/entries/:id', (req, res) => {
  try {
    const entry = db.getEntryById(req.params.id);
    if (!entry) return res.status(404).json({ error: 'Entry not found' });
    res.json(entry);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch entry' });
  }
});

// 3. Create new entry
router.post('/api/entries', (req, res) => {
  try {
    const { title, alt_titles, chapter, is_favorite, type, status, url, notes } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Title is required' });
    }
    const created = db.createEntry({ title, alt_titles, chapter, is_favorite, type, status, url, notes });
    res.status(201).json(created);
  } catch (err) {
    console.error('Error creating entry:', err);
    res.status(500).json({ error: 'Failed to create entry' });
  }
});

// 4. Update entry
router.put('/api/entries/:id', (req, res) => {
  try {
    const updated = db.updateEntry(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'Entry not found' });
    res.json(updated);
  } catch (err) {
    console.error('Error updating entry:', err);
    res.status(500).json({ error: 'Failed to update entry' });
  }
});

// 5. Delete entry
router.delete('/api/entries/:id', (req, res) => {
  try {
    const deleted = db.deleteEntry(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Entry not found' });
    res.json({ success: true, message: 'Entry deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete entry' });
  }
});

// 6. Toggle favorite
router.post('/api/entries/:id/favorite', (req, res) => {
  try {
    const updated = db.toggleFavorite(req.params.id);
    if (!updated) return res.status(404).json({ error: 'Entry not found' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to toggle favorite' });
  }
});

// 7. Update chapter (increment/decrement/direct set)
router.post('/api/entries/:id/chapter', (req, res) => {
  try {
    const { chapter, delta } = req.body;
    const existing = db.getEntryById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Entry not found' });

    let newChapter;
    if (delta !== undefined) {
      newChapter = Math.max(0, parseFloat(existing.chapter || 0) + parseFloat(delta));
    } else if (chapter !== undefined) {
      newChapter = Math.max(0, parseFloat(chapter) || 0);
    } else {
      return res.status(400).json({ error: 'Must provide chapter or delta' });
    }

    // Round to 2 decimal places to avoid floating point issues (e.g. 10.5)
    newChapter = Math.round(newChapter * 100) / 100;

    const updated = db.updateChapter(req.params.id, newChapter);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update chapter' });
  }
});

// 8. Bulk import entries
router.post('/api/entries/bulk', (req, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Items array is required' });
    }
    const result = db.bulkCreateEntries(items);
    res.json({ success: true, count: result.count, message: `Imported ${result.count} entries.` });
  } catch (err) {
    console.error('Error during bulk import:', err);
    res.status(500).json({ error: 'Failed to bulk import entries: ' + err.message });
  }
});

// 9. Export all entries as JSON
router.get('/api/export/json', (req, res) => {
  try {
    const entries = db.getAllEntries();
    res.setHeader('Content-Disposition', 'attachment; filename="chapterhaven_export.json"');
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(entries, null, 2));
  } catch (err) {
    res.status(500).json({ error: 'Failed to export entries' });
  }
});

// 10. Export all entries as CSV
router.get('/api/export/csv', (req, res) => {
  try {
    const entries = db.getAllEntries();
    const headers = ['title', 'alt_titles', 'chapter', 'is_favorite', 'type', 'status', 'url', 'notes'];
    const rows = [headers.join(',')];

    for (const e of entries) {
      const row = headers.map(h => {
        let val = e[h] ?? '';
        val = String(val).replace(/"/g, '""');
        return `"${val}"`;
      });
      rows.push(row.join(','));
    }

    res.setHeader('Content-Disposition', 'attachment; filename="chapterhaven_export.csv"');
    res.setHeader('Content-Type', 'text/csv');
    res.send(rows.join('\r\n'));
  } catch (err) {
    res.status(500).json({ error: 'Failed to export CSV' });
  }
});

// Serve frontend for subpath (fallback for client-side routing)
router.use((req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

// Mount router under BASE_PATH
if (BASE_PATH && BASE_PATH !== '') {
  app.use((req, res, next) => {
    // Redirect /chapterhaven to /chapterhaven/
    if (req.originalUrl.split('?')[0] === BASE_PATH) {
      const query = req.originalUrl.includes('?') ? '?' + req.originalUrl.split('?')[1] : '';
      return res.redirect(301, `${BASE_PATH}/${query}`);
    }
    next();
  });
  app.use(BASE_PATH, router);
} else {
  app.use('/', router);
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`=========================================`);
  console.log(`🚀 ChapterHaven running on http://0.0.0.0:${PORT}${BASE_PATH}/`);
  console.log(`🔒 HTTP Basic Auth: ${process.env.AUTH_ENABLED === 'false' ? 'DISABLED' : 'ENABLED'}`);
  console.log(`👤 Auth User: ${process.env.AUTH_USER || 'admin'}`);
  console.log(`=========================================`);
});
