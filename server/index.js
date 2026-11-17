const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { db, countWords, extractWikiLinks, extractTasks } = require('./db');

const PORT = process.env.PORT || 4321;
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon'
};

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(payload));
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
      if (body.length > 5 * 1024 * 1024) {
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (e) {
        reject(new Error('Invalid JSON payload'));
      }
    });
    req.on('error', reject);
  });
}

function hydrateNote(row, allNotes = null) {
  if (!row) return null;
  let tags = [];
  try {
    tags = JSON.parse(row.tags || '[]');
  } catch {
    tags = [];
  }
  const outgoingLinks = extractWikiLinks(row.content);
  const tasks = extractTasks(row.content, row.id, row.title, row.folder);

  let backlinks = [];
  if (allNotes) {
    const targetLower = row.title.trim().toLowerCase();
    for (const other of allNotes) {
      if (other.id === row.id) continue;
      const otherLinks = extractWikiLinks(other.content).map(x => x.toLowerCase());
      if (otherLinks.includes(targetLower)) {
        backlinks.push({
          id: other.id,
          title: other.title,
          icon: other.icon,
          folder: other.folder
        });
      }
    }
  }

  return {
    id: row.id,
    title: row.title,
    icon: row.icon || 'DOC',
    folder: row.folder || 'Inbox',
    content: row.content || '',
    tags,
    pinned: Boolean(row.pinned),
    favorite: Boolean(row.favorite),
    archived: Boolean(row.archived),
    color: row.color || '#6366f1',
    wordCount: row.word_count || countWords(row.content),
    outgoingLinks,
    backlinks,
    tasks,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function getAllRawNotes(includeArchived = false) {
  if (includeArchived) {
    return db.prepare('SELECT * FROM notes ORDER BY pinned DESC, updated_at DESC').all();
  }
  return db.prepare('SELECT * FROM notes WHERE archived = 0 ORDER BY pinned DESC, updated_at DESC').all();
}

function buildKnowledgeGraph() {
  const rows = getAllRawNotes(false);
  const hydrated = rows.map(r => hydrateNote(r, rows));
  const titleMap = new Map();
  hydrated.forEach(n => {
    titleMap.set(n.title.trim().toLowerCase(), n);
  });

  const nodes = hydrated.map(n => ({
    id: n.id,
    title: n.title,
    icon: n.icon,
    folder: n.folder,
    color: n.color,
    wordCount: n.wordCount,
    tags: n.tags,
    degree: n.outgoingLinks.length + n.backlinks.length
  }));

  const edges = [];
  const edgeSet = new Set();

  for (const source of hydrated) {
    for (const linkTitle of source.outgoingLinks) {
      const target = titleMap.get(linkTitle.trim().toLowerCase());
      if (target && target.id !== source.id) {
        const key = [source.id, target.id].sort().join('::');
        if (!edgeSet.has(key)) {
          edgeSet.add(key);
          edges.push({
            source: source.id,
            target: target.id,
            directedSource: source.id,
            directedTarget: target.id
          });
        }
      }
    }
  }

  return { nodes, edges };
}

function buildStats() {
  const rows = getAllRawNotes(false);
  const hydrated = rows.map(r => hydrateNote(r, rows));
  const graph = buildKnowledgeGraph();

  let totalWords = 0;
  let totalTasks = 0;
  let completedTasks = 0;
  const tagCounts = {};
  const folderCounts = {};

  for (const n of hydrated) {
    totalWords += n.wordCount;
    folderCounts[n.folder] = (folderCounts[n.folder] || 0) + 1;
    for (const t of n.tags) {
      tagCounts[t] = (tagCounts[t] || 0) + 1;
    }
    for (const task of n.tasks) {
      totalTasks++;
      if (task.completed) completedTasks++;
    }
  }

  const focusSessions = db.prepare('SELECT * FROM focus_sessions ORDER BY completed_at DESC LIMIT 30').all();
  const totalFocusRow = db.prepare('SELECT COALESCE(SUM(duration_minutes), 0) as totalMinutes, COUNT(*) as sessionCount FROM focus_sessions').get();

  return {
    noteCount: hydrated.length,
    totalWords,
    linkCount: graph.edges.length,
    totalTasks,
    completedTasks,
    tagCounts,
    folderCounts,
    focus: {
      totalMinutes: totalFocusRow.totalMinutes || 0,
      sessionCount: totalFocusRow.sessionCount || 0,
      recentSessions: focusSessions
    }
  };
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    return res.end();
  }

  const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = urlObj.pathname;

  try {
    // API: Get all notes + filter
    if (pathname === '/api/notes' && req.method === 'GET') {
      const q = (urlObj.searchParams.get('q') || '').trim().toLowerCase();
      const folder = urlObj.searchParams.get('folder') || '';
      const tag = urlObj.searchParams.get('tag') || '';
      const favorite = urlObj.searchParams.get('favorite') === 'true';

      const allRows = getAllRawNotes(false);
      let notes = allRows.map(r => hydrateNote(r, allRows));

      if (folder && folder !== 'ALL') {
        notes = notes.filter(n => n.folder.toLowerCase() === folder.toLowerCase());
      }
      if (tag) {
        notes = notes.filter(n => n.tags.map(t => t.toLowerCase()).includes(tag.toLowerCase()));
      }
      if (favorite) {
        notes = notes.filter(n => n.favorite);
      }
      if (q) {
        notes = notes.filter(n =>
          n.title.toLowerCase().includes(q) ||
          n.content.toLowerCase().includes(q) ||
          n.folder.toLowerCase().includes(q) ||
          n.tags.some(t => t.toLowerCase().includes(q))
        );
      }

      return sendJson(res, 200, { notes });
    }

    // API: Create new note
    if (pathname === '/api/notes' && req.method === 'POST') {
      const body = await parseBody(req);
      const id = body.id || `note-${crypto.randomUUID().slice(0, 8)}`;
      const title = (body.title || 'Untitled Note').trim();
      const icon = body.icon || 'DOC';
      const folder = (body.folder || 'Inbox').trim();
      const content = body.content !== undefined ? body.content : `# ${title}\n\nBắt đầu ghi chú ý tưởng của bạn tại đây...`;
      const tags = Array.isArray(body.tags) ? body.tags : [];
      const pinned = body.pinned ? 1 : 0;
      const favorite = body.favorite ? 1 : 0;
      const color = body.color || '#6366f1';
      const now = new Date().toISOString();

      db.prepare(`
        INSERT INTO notes (id, title, icon, folder, content, tags, pinned, favorite, archived, color, word_count, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)
      `).run(id, title, icon, folder, content, JSON.stringify(tags), pinned, favorite, color, countWords(content), now, now);

      const allRows = getAllRawNotes(false);
      const created = db.prepare('SELECT * FROM notes WHERE id = ?').get(id);
      return sendJson(res, 201, { note: hydrateNote(created, allRows) });
    }

    // API: Single note operations
    const noteMatch = pathname.match(/^\/api\/notes\/([^/]+)$/);
    if (noteMatch) {
      const noteId = decodeURIComponent(noteMatch[1]);

      if (req.method === 'GET') {
        const row = db.prepare('SELECT * FROM notes WHERE id = ?').get(noteId);
        if (!row) return sendJson(res, 404, { error: 'Note not found' });
        const allRows = getAllRawNotes(false);
        return sendJson(res, 200, { note: hydrateNote(row, allRows) });
      }

      if (req.method === 'PUT' || req.method === 'PATCH') {
        const existing = db.prepare('SELECT * FROM notes WHERE id = ?').get(noteId);
        if (!existing) return sendJson(res, 404, { error: 'Note not found' });

        const body = await parseBody(req);
        const title = body.title !== undefined ? body.title.trim() : existing.title;
        const icon = body.icon !== undefined ? body.icon : existing.icon;
        const folder = body.folder !== undefined ? body.folder.trim() : existing.folder;
        const content = body.content !== undefined ? body.content : existing.content;
        const tags = body.tags !== undefined ? JSON.stringify(body.tags) : existing.tags;
        const pinned = body.pinned !== undefined ? (body.pinned ? 1 : 0) : existing.pinned;
        const favorite = body.favorite !== undefined ? (body.favorite ? 1 : 0) : existing.favorite;
        const archived = body.archived !== undefined ? (body.archived ? 1 : 0) : existing.archived;
        const color = body.color !== undefined ? body.color : existing.color;
        const now = new Date().toISOString();

        db.prepare(`
          UPDATE notes
          SET title = ?, icon = ?, folder = ?, content = ?, tags = ?, pinned = ?, favorite = ?, archived = ?, color = ?, word_count = ?, updated_at = ?
          WHERE id = ?
        `).run(title, icon, folder, content, tags, pinned, favorite, archived, color, countWords(content), now, noteId);

        const updated = db.prepare('SELECT * FROM notes WHERE id = ?').get(noteId);
        const allRows = getAllRawNotes(false);
        return sendJson(res, 200, { note: hydrateNote(updated, allRows) });
      }

      if (req.method === 'DELETE') {
        db.prepare('DELETE FROM notes WHERE id = ?').run(noteId);
        return sendJson(res, 200, { deleted: true, id: noteId });
      }
    }

    // API: Toggle task checkbox inside a note
    if (pathname === '/api/tasks/toggle' && req.method === 'POST') {
      const body = await parseBody(req);
      const { noteId, lineIndex } = body;
      const existing = db.prepare('SELECT * FROM notes WHERE id = ?').get(noteId);
      if (!existing) return sendJson(res, 404, { error: 'Note not found' });

      const lines = (existing.content || '').split('\n');
      if (lineIndex >= 0 && lineIndex < lines.length) {
        lines[lineIndex] = lines[lineIndex].replace(/^(\s*[-*]\s+\[)([ xX])(\]\s+.+)$/, (_, prefix, state, suffix) => {
          const nextState = state.toLowerCase() === 'x' ? ' ' : 'x';
          return `${prefix}${nextState}${suffix}`;
        });
        const newContent = lines.join('\n');
        const now = new Date().toISOString();
        db.prepare('UPDATE notes SET content = ?, updated_at = ? WHERE id = ?').run(newContent, now, noteId);
      }

      const updated = db.prepare('SELECT * FROM notes WHERE id = ?').get(noteId);
      const allRows = getAllRawNotes(false);
      return sendJson(res, 200, { note: hydrateNote(updated, allRows) });
    }

    // API: Knowledge Graph
    if (pathname === '/api/graph' && req.method === 'GET') {
      return sendJson(res, 200, buildKnowledgeGraph());
    }

    // API: Dashboard Stats & Tasks
    if (pathname === '/api/stats' && req.method === 'GET') {
      return sendJson(res, 200, buildStats());
    }

    // API: Record Focus Session (Pomodoro)
    if (pathname === '/api/focus' && req.method === 'POST') {
      const body = await parseBody(req);
      const id = `focus-${crypto.randomUUID().slice(0, 8)}`;
      const noteId = body.noteId || null;
      const noteTitle = body.noteTitle || 'Deep Work Session';
      const durationMinutes = Number(body.durationMinutes) || 25;
      const completedAt = new Date().toISOString();

      db.prepare(`
        INSERT INTO focus_sessions (id, note_id, note_title, duration_minutes, completed_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(id, noteId, noteTitle, durationMinutes, completedAt);

      return sendJson(res, 201, { session: { id, noteId, noteTitle, durationMinutes, completedAt }, stats: buildStats() });
    }

    // API: Export entire vault as JSON
    if (pathname === '/api/export' && req.method === 'GET') {
      const allRows = getAllRawNotes(true);
      const notes = allRows.map(r => hydrateNote(r, allRows));
      return sendJson(res, 200, {
        vault: 'MindVault Second Brain',
        exportedAt: new Date().toISOString(),
        notes
      });
    }

    // Static files serving
    let filePath = pathname === '/' ? path.join(PUBLIC_DIR, 'index.html') : path.join(PUBLIC_DIR, pathname);
    if (!filePath.startsWith(PUBLIC_DIR)) {
      res.writeHead(403);
      return res.end('Forbidden');
    }

    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': contentType });
      fs.createReadStream(filePath).pipe(res);
    } else {
      // Fallback to SPA index.html
      const indexFile = path.join(PUBLIC_DIR, 'index.html');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      fs.createReadStream(indexFile).pipe(res);
    }
  } catch (err) {
    console.error('[MindVault Server Error]:', err);
    sendJson(res, 500, { error: err.message || 'Internal Server Error' });
  }
});

server.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🧠 MindVault Full-Stack Server is running!`);
  console.log(`🔗 Local URL: http://localhost:${PORT}`);
  console.log(`💾 SQLite DB: data/mindvault.sqlite (WAL Mode Enabled)`);
  console.log(`======================================================\n`);
});
