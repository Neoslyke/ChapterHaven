// ChapterHaven - Frontend Application
(function () {
  'use strict';

  // Determine base API path relative to current URL path
  const currentPath = window.location.pathname.replace(/\/+$/, '');
  const API_BASE = currentPath.endsWith('/chapterhaven')
    ? `${currentPath}/api`
    : '/chapterhaven/api';

  // State
  let allEntries = [];
  let currentFilterType = 'all';
  let activeSearchQuery = '';

  // DOM Elements
  const searchInput = document.getElementById('searchInput');
  const btnClearSearch = document.getElementById('btnClearSearch');
  const statsCount = document.getElementById('statsCount');
  const filterChips = document.querySelectorAll('.filter-chip');

  const favoritesSection = document.getElementById('favoritesSection');
  const favoritesList = document.getElementById('favoritesList');
  const favCountBadge = document.getElementById('favCountBadge');

  const mainSection = document.getElementById('mainSection');
  const mainList = document.getElementById('mainList');
  const mainCountBadge = document.getElementById('mainCountBadge');

  const emptyState = document.getElementById('emptyState');
  const emptyTitle = document.getElementById('emptyTitle');
  const emptyMessage = document.getElementById('emptyMessage');
  const btnEmptyAdd = document.getElementById('btnEmptyAdd');

  // Modals
  const entryModal = document.getElementById('entryModal');
  const modalTitle = document.getElementById('modalTitle');
  const entryForm = document.getElementById('entryForm');
  const entryId = document.getElementById('entryId');
  const inputTitle = document.getElementById('inputTitle');
  const inputAltTitles = document.getElementById('inputAltTitles');
  const inputChapter = document.getElementById('inputChapter');
  const inputType = document.getElementById('inputType');
  const inputStatus = document.getElementById('inputStatus');
  const inputIsFavorite = document.getElementById('inputIsFavorite');
  const inputUrl = document.getElementById('inputUrl');
  const inputNotes = document.getElementById('inputNotes');
  const btnDeleteEntry = document.getElementById('btnDeleteEntry');
  const btnCloseEntryModal = document.getElementById('btnCloseEntryModal');
  const btnCancelEntry = document.getElementById('btnCancelEntry');
  const btnOpenAddModal = document.getElementById('btnOpenAddModal');

  // Import / Export Modal
  const importExportModal = document.getElementById('importExportModal');
  const btnOpenImportExport = document.getElementById('btnOpenImportExport');
  const btnCloseImportModal = document.getElementById('btnCloseImportModal');
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');
  const pasteTextInput = document.getElementById('pasteTextInput');
  const pasteCountIndicator = document.getElementById('pasteCountIndicator');
  const btnRunPasteImport = document.getElementById('btnRunPasteImport');
  const fileInput = document.getElementById('fileInput');
  const fileNameDisplay = document.getElementById('fileNameDisplay');
  const btnRunFileImport = document.getElementById('btnRunFileImport');
  const btnExportJSON = document.getElementById('btnExportJSON');
  const btnExportCSV = document.getElementById('btnExportCSV');
  const importStatusArea = document.getElementById('importStatusArea');

  const toastEl = document.getElementById('toast');

  // --- Utility Functions ---

  function showToast(message, duration = 3000) {
    toastEl.textContent = message;
    toastEl.style.display = 'block';
    if (toastEl._timer) clearTimeout(toastEl._timer);
    toastEl._timer = setTimeout(() => {
      toastEl.style.display = 'none';
    }, duration);
  }

  function escapeHTML(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function highlightMatches(text, query) {
    if (!query || !text) return escapeHTML(text);
    const escaped = escapeHTML(text);
    const escapedQuery = escapeHTML(query).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedQuery})`, 'gi');
    return escaped.replace(regex, '<mark class="search-highlight">$1</mark>');
  }

  // Natural case-insensitive alphabetical comparator
  function alphabetSort(a, b) {
    return (a.title || '').localeCompare(b.title || '', undefined, {
      sensitivity: 'base',
      numeric: true
    });
  }

  // --- API Client ---

  async function apiRequest(endpoint, options = {}) {
    try {
      const res = await fetch(`${API_BASE}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        ...options
      });

      if (res.status === 401) {
        showToast('Authentication failed. Please refresh and log in.');
        throw new Error('Unauthorized');
      }

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Request failed (${res.status})`);
      }

      return await res.json();
    } catch (err) {
      console.error('API Error:', err);
      throw err;
    }
  }

  // --- Fetch & Render ---

  async function loadEntries() {
    try {
      statsCount.textContent = 'Loading titles...';
      const data = await apiRequest('/entries');
      allEntries = data || [];
      render();
    } catch (err) {
      statsCount.textContent = 'Error loading titles';
      showToast('Error loading titles from server.');
    }
  }

  function render() {
    const startTime = performance.now();
    const query = activeSearchQuery.trim().toLowerCase();

    // 1. Filter entries
    const filtered = allEntries.filter(entry => {
      // Type filter
      if (currentFilterType !== 'all' && entry.type !== currentFilterType) {
        return false;
      }

      // Query search
      if (!query) return true;

      const titleMatch = (entry.title || '').toLowerCase().includes(query);
      const altMatch = (entry.alt_titles || '').toLowerCase().includes(query);
      return titleMatch || altMatch;
    });

    // 2. Separate into Favourites and Non-Favourites
    const favorites = [];
    const nonFavorites = [];

    for (const item of filtered) {
      if (item.is_favorite === 1 || item.is_favorite === true) {
        favorites.push(item);
      } else {
        nonFavorites.push(item);
      }
    }

    // 3. Sort each category strictly alphabetically A -> Z
    favorites.sort(alphabetSort);
    nonFavorites.sort(alphabetSort);

    // Update Counts
    favCountBadge.textContent = favorites.length;
    mainCountBadge.textContent = nonFavorites.length;

    const renderTime = (performance.now() - startTime).toFixed(1);
    const totalCount = allEntries.length;

    if (query) {
      statsCount.textContent = `Found ${filtered.length} of ${totalCount} titles (${renderTime} ms)`;
      btnClearSearch.style.display = 'block';
    } else {
      statsCount.textContent = `Tracking ${totalCount} titles (${favorites.length} favourites)`;
      btnClearSearch.style.display = 'none';
    }

    // 4. Render HTML lists
    if (favorites.length === 0) {
      favoritesSection.style.display = 'none';
    } else {
      favoritesSection.style.display = 'flex';
      favoritesList.innerHTML = favorites.map(item => createEntryCardHTML(item, query)).join('');
    }

    if (nonFavorites.length === 0) {
      if (favorites.length === 0) {
        mainSection.style.display = 'none';
        emptyState.style.display = 'block';
        if (query) {
          emptyTitle.textContent = `No results for "${activeSearchQuery}"`;
          emptyMessage.textContent = 'Try checking for typos or searching by an alternative title.';
        } else {
          emptyTitle.textContent = 'No titles tracked yet';
          emptyMessage.textContent = 'Click "+ Add Title" or use "Import" to add your collection.';
        }
      } else {
        mainSection.style.display = 'none';
        emptyState.style.display = 'none';
      }
    } else {
      mainSection.style.display = 'flex';
      emptyState.style.display = 'none';
      mainList.innerHTML = nonFavorites.map(item => createEntryCardHTML(item, query)).join('');
    }

    attachCardEventListeners();
  }

  function getTagClass(type) {
    const t = (type || '').toLowerCase();
    if (t === 'manhwa') return 'tag-manhwa';
    if (t === 'manga') return 'tag-manga';
    if (t === 'manhua') return 'tag-manhua';
    return 'tag-other';
  }

  function createEntryCardHTML(entry, query) {
    const isFav = entry.is_favorite === 1 || entry.is_favorite === true;
    const starIcon = isFav ? '★' : '☆';
    const starClass = isFav ? 'star-btn is-favorite' : 'star-btn';
    const starTitle = isFav ? 'Click to unpin from favourites' : 'Click to pin to favourites';
    const tagClass = getTagClass(entry.type);

    const titleHTML = highlightMatches(entry.title, query);
    const altTitlesHTML = entry.alt_titles
      ? `<span class="entry-alt-titles" title="${escapeHTML(entry.alt_titles)}">${highlightMatches(entry.alt_titles, query)}</span>`
      : '';

    const urlBtn = entry.url
      ? `<a href="${escapeHTML(entry.url)}" target="_blank" rel="noopener noreferrer" class="external-link-btn" title="Open reading link">↗</a>`
      : '';

    const chapterNum = parseFloat(entry.chapter) || 0;

    return `
      <div class="entry-card" data-id="${entry.id}">
        <button class="${starClass}" data-action="toggle-fav" title="${starTitle}">
          ${starIcon}
        </button>
        <div class="entry-body" data-action="edit">
          <div class="entry-title-row">
            <span class="entry-title">${titleHTML}</span>
            <span class="entry-type-tag ${tagClass}">${escapeHTML(entry.type || 'Manga')}</span>
          </div>
          ${altTitlesHTML}
        </div>
        <div class="entry-controls">
          <div class="chapter-stepper">
            <button class="step-btn" data-action="chapter-dec" title="Previous chapter (-1)">&minus;</button>
            <span class="chapter-display" data-action="chapter-prompt" title="Click to set chapter">Ch. ${chapterNum}</span>
            <button class="step-btn" data-action="chapter-inc" title="Next chapter (+1)">+</button>
          </div>
          ${urlBtn}
        </div>
      </div>
    `;
  }

  function attachCardEventListeners() {
    const cards = document.querySelectorAll('.entry-card');
    cards.forEach(card => {
      const id = card.getAttribute('data-id');
      const entry = allEntries.find(e => String(e.id) === String(id));
      if (!entry) return;

      card.addEventListener('click', async (e) => {
        const actionTarget = e.target.closest('[data-action]');
        if (!actionTarget) return;

        const action = actionTarget.getAttribute('data-action');

        if (action === 'toggle-fav') {
          e.stopPropagation();
          await handleToggleFavorite(id);
        } else if (action === 'chapter-inc') {
          e.stopPropagation();
          await handleChapterDelta(id, 1);
        } else if (action === 'chapter-dec') {
          e.stopPropagation();
          await handleChapterDelta(id, -1);
        } else if (action === 'chapter-prompt') {
          e.stopPropagation();
          handleChapterPrompt(entry);
        } else if (action === 'edit') {
          e.stopPropagation();
          openEditModal(entry);
        }
      });
    });
  }

  // --- Actions ---

  async function handleToggleFavorite(id) {
    try {
      const updated = await apiRequest(`/entries/${id}/favorite`, { method: 'POST' });
      const index = allEntries.findIndex(e => String(e.id) === String(id));
      if (index !== -1) {
        allEntries[index] = updated;
      }
      render();
      showToast(updated.is_favorite ? '⭐ Added to favourites' : 'Removed from favourites');
    } catch (err) {
      showToast('Failed to update favourite.');
    }
  }

  async function handleChapterDelta(id, delta) {
    try {
      const updated = await apiRequest(`/entries/${id}/chapter`, {
        method: 'POST',
        body: JSON.stringify({ delta })
      });
      const index = allEntries.findIndex(e => String(e.id) === String(id));
      if (index !== -1) {
        allEntries[index] = updated;
      }
      render();
    } catch (err) {
      showToast('Failed to update chapter.');
    }
  }

  async function handleChapterPrompt(entry) {
    const newVal = prompt(`Set current chapter for "${entry.title}":`, entry.chapter);
    if (newVal === null) return;
    const num = parseFloat(newVal);
    if (isNaN(num) || num < 0) {
      alert('Please enter a valid positive number for the chapter.');
      return;
    }
    try {
      const updated = await apiRequest(`/entries/${entry.id}/chapter`, {
        method: 'POST',
        body: JSON.stringify({ chapter: num })
      });
      const index = allEntries.findIndex(e => String(e.id) === String(entry.id));
      if (index !== -1) {
        allEntries[index] = updated;
      }
      render();
      showToast(`Updated to Chapter ${num}`);
    } catch (err) {
      showToast('Failed to update chapter.');
    }
  }

  // --- Add / Edit Modal ---

  function openAddModal() {
    modalTitle.textContent = 'Add New Title';
    entryId.value = '';
    entryForm.reset();
    inputChapter.value = 0;
    inputType.value = 'Manhwa';
    inputStatus.value = 'Reading';
    inputIsFavorite.checked = false;
    btnDeleteEntry.style.display = 'none';
    entryModal.style.display = 'flex';
    inputTitle.focus();
  }

  function openEditModal(entry) {
    modalTitle.textContent = 'Edit Title';
    entryId.value = entry.id;
    inputTitle.value = entry.title || '';
    inputAltTitles.value = entry.alt_titles || '';
    inputChapter.value = entry.chapter ?? 0;
    inputType.value = entry.type || 'Manga';
    inputStatus.value = entry.status || 'Reading';
    inputIsFavorite.checked = entry.is_favorite === 1 || entry.is_favorite === true;
    inputUrl.value = entry.url || '';
    inputNotes.value = entry.notes || '';
    btnDeleteEntry.style.display = 'block';
    entryModal.style.display = 'flex';
    inputTitle.focus();
  }

  function closeEntryModal() {
    entryModal.style.display = 'none';
    entryForm.reset();
  }

  entryForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = entryId.value;
    const payload = {
      title: inputTitle.value.trim(),
      alt_titles: inputAltTitles.value.trim(),
      chapter: parseFloat(inputChapter.value) || 0,
      type: inputType.value,
      status: inputStatus.value,
      is_favorite: inputIsFavorite.checked ? 1 : 0,
      url: inputUrl.value.trim(),
      notes: inputNotes.value.trim()
    };

    if (!payload.title) {
      alert('Title is required.');
      return;
    }

    try {
      if (id) {
        // Update existing
        const updated = await apiRequest(`/entries/${id}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
        const index = allEntries.findIndex(item => String(item.id) === String(id));
        if (index !== -1) allEntries[index] = updated;
        showToast(`Updated "${updated.title}"`);
      } else {
        // Create new
        const created = await apiRequest('/entries', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        allEntries.push(created);
        showToast(`Added "${created.title}"`);
      }
      closeEntryModal();
      render();
    } catch (err) {
      alert(`Save failed: ${err.message}`);
    }
  });

  btnDeleteEntry.addEventListener('click', async () => {
    const id = entryId.value;
    const title = inputTitle.value;
    if (!id) return;

    if (confirm(`Are you sure you want to delete "${title}"? This cannot be undone.`)) {
      try {
        await apiRequest(`/entries/${id}`, { method: 'DELETE' });
        allEntries = allEntries.filter(e => String(e.id) !== String(id));
        closeEntryModal();
        render();
        showToast(`Deleted "${title}"`);
      } catch (err) {
        alert(`Delete failed: ${err.message}`);
      }
    }
  });

  // --- Bulk Import / Export ---

  function openImportExportModal() {
    importStatusArea.style.display = 'none';
    importExportModal.style.display = 'flex';
  }

  function closeImportExportModal() {
    importExportModal.style.display = 'none';
  }

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      const target = document.getElementById(btn.getAttribute('data-tab'));
      if (target) target.classList.add('active');
    });
  });

  // Quick Text Paste Detection
  pasteTextInput.addEventListener('input', () => {
    const lines = pasteTextInput.value
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0);
    pasteCountIndicator.textContent = `${lines.length} lines detected`;
  });

  btnRunPasteImport.addEventListener('click', async () => {
    const lines = pasteTextInput.value
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0);

    if (lines.length === 0) {
      alert('Please paste at least one title.');
      return;
    }

    const items = lines.map(line => {
      // Check if user separated using pipes: Title | Alt Titles | Chapter
      if (line.includes('|')) {
        const parts = line.split('|').map(p => p.trim());
        return {
          title: parts[0] || '',
          alt_titles: parts[1] || '',
          chapter: parseFloat(parts[2]) || 0
        };
      }
      // Simple title per line
      return { title: line, chapter: 0 };
    }).filter(i => i.title.length > 0);

    await executeBulkImport(items);
  });

  // File Upload Handling
  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      fileNameDisplay.textContent = `${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
      btnRunFileImport.disabled = false;
    } else {
      fileNameDisplay.textContent = 'Choose a .json or .csv file';
      btnRunFileImport.disabled = true;
    }
  });

  btnRunFileImport.addEventListener('click', async () => {
    const file = fileInput.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target.result;
        let items = [];

        if (file.name.endsWith('.json')) {
          items = JSON.parse(content);
          if (!Array.isArray(items)) {
            throw new Error('JSON file must be an array of objects.');
          }
        } else if (file.name.endsWith('.csv')) {
          items = parseCSV(content);
        } else {
          throw new Error('Unsupported file format. Please upload .json or .csv.');
        }

        await executeBulkImport(items);
      } catch (err) {
        showImportStatus(`Import failed: ${err.message}`, false);
      }
    };
    reader.readAsText(file);
  });

  function parseCSV(text) {
    const lines = text.split(/\r\n|\n/).filter(l => l.trim().length > 0);
    if (lines.length === 0) return [];

    const headers = lines[0].split(',').map(h => h.replace(/^["']|["']$/g, '').trim().toLowerCase());
    const items = [];

    for (let i = 1; i < lines.length; i++) {
      // Regex CSV splitter taking quoted commas into account
      const rawValues = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || lines[i].split(',');
      const obj = {};
      headers.forEach((h, idx) => {
        let val = (rawValues[idx] || '').trim().replace(/^"|"$/g, '').replace(/""/g, '"');
        obj[h] = val;
      });
      if (obj.title) items.push(obj);
    }
    return items;
  }

  async function executeBulkImport(items) {
    if (!items || items.length === 0) {
      alert('No valid items found to import.');
      return;
    }

    showImportStatus(`Importing ${items.length} titles into database...`, null);
    try {
      const res = await apiRequest('/entries/bulk', {
        method: 'POST',
        body: JSON.stringify({ items })
      });

      showImportStatus(`✅ Successfully imported ${res.count} titles!`, true);
      pasteTextInput.value = '';
      pasteCountIndicator.textContent = '0 lines detected';
      fileInput.value = '';
      fileNameDisplay.textContent = 'Choose a .json or .csv file';
      btnRunFileImport.disabled = true;

      // Reload all entries from server
      await loadEntries();
      setTimeout(() => {
        closeImportExportModal();
      }, 1500);
    } catch (err) {
      showImportStatus(`❌ Bulk import error: ${err.message}`, false);
    }
  }

  function showImportStatus(msg, isSuccess) {
    importStatusArea.style.display = 'block';
    importStatusArea.className = 'import-status-area';
    if (isSuccess === true) importStatusArea.classList.add('status-success');
    else if (isSuccess === false) importStatusArea.classList.add('status-error');
    importStatusArea.textContent = msg;
  }

  // Export Buttons
  btnExportJSON.addEventListener('click', () => {
    window.location.href = `${API_BASE}/export/json`;
  });

  btnExportCSV.addEventListener('click', () => {
    window.location.href = `${API_BASE}/export/csv`;
  });

  // --- Live Search & Filter Events ---

  // Ultra-fast live search with immediate input handling
  searchInput.addEventListener('input', (e) => {
    activeSearchQuery = e.target.value;
    render();
  });

  btnClearSearch.addEventListener('click', () => {
    searchInput.value = '';
    activeSearchQuery = '';
    searchInput.focus();
    render();
  });

  filterChips.forEach(chip => {
    chip.addEventListener('click', () => {
      filterChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      currentFilterType = chip.getAttribute('data-type');
      render();
    });
  });

  // --- Modal Triggers ---

  btnOpenAddModal.addEventListener('click', openAddModal);
  btnEmptyAdd.addEventListener('click', openAddModal);
  btnCloseEntryModal.addEventListener('click', closeEntryModal);
  btnCancelEntry.addEventListener('click', closeEntryModal);

  btnOpenImportExport.addEventListener('click', openImportExportModal);
  btnCloseImportModal.addEventListener('click', closeImportExportModal);

  // Close modals on backdrop click
  window.addEventListener('click', (e) => {
    if (e.target === entryModal) closeEntryModal();
    if (e.target === importExportModal) closeImportExportModal();
  });

  // Keyboard Shortcuts
  window.addEventListener('keydown', (e) => {
    const isInputFocused = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName);

    if (e.key === 'Escape') {
      if (entryModal.style.display === 'flex') closeEntryModal();
      else if (importExportModal.style.display === 'flex') closeImportExportModal();
      else if (searchInput.value) {
        searchInput.value = '';
        activeSearchQuery = '';
        render();
      }
    } else if (e.key === '/' && !isInputFocused) {
      e.preventDefault();
      searchInput.focus();
      searchInput.select();
    } else if ((e.key === 'n' || e.key === 'N') && !isInputFocused) {
      e.preventDefault();
      openAddModal();
    }
  });

  // Initial Load
  loadEntries();
})();

