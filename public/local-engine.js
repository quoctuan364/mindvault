/* ============================================================================
 * MindVault — Client-Side Fallback Engine (100% REST API Parity for GitHub Pages)
 * Persisted via localStorage with in-memory fallback for headless tests.
 * ============================================================================ */

(function (globalScope) {
  'use strict';

  const NOTES_KEY = 'mindvault_v2_notes';
  const FOCUS_KEY = 'mindvault_v2_focus';
  const memoryStore = new Map();

  function getStore(key) {
    try {
      if (typeof localStorage !== 'undefined') {
        return localStorage.getItem(key);
      }
    } catch {
      // Fallback below
    }
    return memoryStore.get(key) || null;
  }

  function setStore(key, value) {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(key, value);
        return;
      }
    } catch {
      // Fallback below
    }
    memoryStore.set(key, value);
  }

  function countWords(text) {
    if (!text || !text.trim()) return 0;
    return text.trim().split(/\s+/).length;
  }

  function extractWikiLinks(content) {
    if (!content) return [];
    const regex = /\[\[([^\]]+)\]\]/g;
    const links = new Set();
    let match;
    while ((match = regex.exec(content)) !== null) {
      const target = match[1].trim();
      if (target) links.add(target);
    }
    return Array.from(links);
  }

  function extractTasks(content, noteId, noteTitle, folder) {
    if (!content) return [];
    const lines = content.split('\n');
    const tasks = [];
    lines.forEach((line, index) => {
      const match = line.match(/^(\s*)[-*]\s+\[([ xX])\]\s+(.+)$/);
      if (match) {
        tasks.push({
          noteId,
          noteTitle,
          folder,
          lineIndex: index,
          completed: match[2].toLowerCase() === 'x',
          text: match[3].trim()
        });
      }
    });
    return tasks;
  }

  function createSeedNotes() {
    const now = Date.now();
    const iso = (daysAgo = 0) => new Date(now - daysAgo * 86400000).toISOString();

    return [
      {
        id: 'note-welcome-hub',
        title: 'MindVault Architecture Hub',
        icon: 'CORE',
        folder: 'Second Brain',
        color: '#10b981',
        pinned: true,
        favorite: true,
        archived: false,
        tags: ['architecture', 'second-brain', 'zettelkasten', 'system-design'],
        createdAt: iso(6),
        updatedAt: iso(0),
        content: `# MindVault Architecture Hub

Hệ thống quản trị tri thức cá nhân (**Second Brain & Zettelkasten**) hỗ trợ chạy **Hybrid**: vừa chạy **Node.js + SQLite WAL** trên máy, vừa chạy trực tiếp **Live Demo trên GitHub Pages**.

> *"Your mind is for having ideas, not holding them."* — David Allen

---

## Liên kết Tri thức (Bi-directional Wiki-Links)
Trong MindVault, mọi ghi chú đều kết nối thành mạng lưới đồ thị tri thức (**Knowledge Graph**). Dùng cú pháp \`[[Tên Ghi Chú]]\` để tạo liên kết hai chiều:

- Khám phá hệ thống bảo mật AI tại [[LLM Security Gateway Design]]
- Xem lộ trình nghiên cứu mô hình tại [[RAG & Vector Database Deep Dive]]
- Quản lý quy trình làm việc cá nhân với [[Deep Work & Pomodoro Protocol]]
- Theo dõi kế hoạch dự án tại [[2026 Portfolio & Open Source Roadmap]]
- Thiết kế kiến trúc hệ thống tại [[Zero-Dependency Full-Stack Architecture]]

---

## Nhiệm vụ trọng tâm tuần này
- [x] Khởi tạo cơ sở dữ liệu SQLite (WAL mode) + Client-Side Fallback Engine
- [x] Xây dựng công cụ Interactive Force-Directed Knowledge Graph 2D
- [x] Tích hợp trình soạn thảo Markdown Live Preview & Backlinks tự động
- [ ] Hoàn thiện tài liệu API cho [[LLM Security Gateway Design]]
- [ ] Tối ưu hóa thuật toán HNSW Indexing trong [[RAG & Vector Database Deep Dive]]

---

## Bảng tổng hợp Tech Stack
| Tầng kiến trúc | Công nghệ sử dụng | Đặc tả kỹ thuật |
| :--- | :--- | :--- |
| **Backend Core** | Node.js Native HTTP | RESTful API tốc độ cao, Zero-overhead |
| **Database** | SQLite (\`node:sqlite\`) | Lưu trữ ACID, WAL Mode + Browser Local Fallback |
| **Graph Engine** | HTML5 Canvas Physics | Lực đẩy Coulomb + Lò xo Hooke thời gian thực |
| **Editor** | Split-Pane Markdown | Hỗ trợ Wiki-link \`[[...]]\`, Code, Table, Checklist |
`
      },
      {
        id: 'note-llm-security',
        title: 'LLM Security Gateway Design',
        icon: 'SEC',
        folder: 'AI & Security',
        color: '#06b6d4',
        pinned: true,
        favorite: true,
        archived: false,
        tags: ['security', 'llm', 'ai-safety', 'prompt-injection'],
        createdAt: iso(5),
        updatedAt: iso(1),
        content: `# LLM Security Gateway Design

Ghi chú nghiên cứu chuyên sâu về lớp phòng thủ bảo mật cho các hệ thống Large Language Model (tương ứng với dự án \`llm-security-gateway\` và \`sentinel-ai\`). Được liên kết trực tiếp từ [[MindVault Architecture Hub]].

---

## 1. Mô hình Đe dọa (Threat Model)
Các ứng dụng tích hợp LLM và [[RAG & Vector Database Deep Dive]] thường đối mặt với 4 nhóm tấn công chính:
1. **Direct Prompt Injection**: Vượt rào cản hệ thống (Jailbreak).
2. **Indirect Prompt Injection**: Nhiễm độc dữ liệu từ tài liệu ngoài đưa vào ngữ cảnh RAG.
3. **PII & Secret Leakage**: Rò rỉ API Key, thông tin nhạy cảm của người dùng trong câu trả lời.
4. **Denial of Wallet (DoW)**: Tấn công làm cạn kiệt ngân sách token.

---

## 2. Kiến trúc Pipeline Phòng thủ Đa tầng

\`\`\`python
class SentinelGateway:
    def inspect_request(self, prompt: str, user_id: str):
        sanitized = self.pii_scrubber.redact(prompt)
        risk_score = self.vector_firewall.compute_threat(sanitized)
        if risk_score > 0.82:
            raise PromptInjectionDetected("Blocked high-risk semantic pattern")
        return {"allowed": True, "sanitized_prompt": sanitized}
\`\`\`

---

## 3. Checklist Triển khai
- [x] Xây dựng bộ lọc PII (Email, Phone, JWT Token)
- [x] Cài đặt Rate Limiter theo Token Bucket
- [ ] Kết nối cảnh báo bất thường sang [[2026 Portfolio & Open Source Roadmap]]
- [ ] Kiểm thử tấn công giả lập (Red Teaming) với adversarial prompts
`
      },
      {
        id: 'note-rag-vector',
        title: 'RAG & Vector Database Deep Dive',
        icon: 'RAG',
        folder: 'AI & Security',
        color: '#f59e0b',
        pinned: false,
        favorite: true,
        archived: false,
        tags: ['rag', 'embeddings', 'vector-db', 'ai'],
        createdAt: iso(4),
        updatedAt: iso(1),
        content: `# RAG & Vector Database Deep Dive

Tài liệu kỹ thuật phục vụ cho hệ thống gợi ý và đọc sách thông minh (\`bookverse-ai\`) cùng hệ sinh thái [[MindVault Architecture Hub]].

---

## Công thức Hybrid Search (Dense + Sparse)
Để khắc phục nhược điểm của tìm kiếm ngữ nghĩa thuần túy khi gặp từ khóa chuyên ngành, hệ thống kết hợp **BM25** và **Cosine Similarity** thông qua thuật toán **Reciprocal Rank Fusion (RRF)**:

\`\`\`
RRF_Score(d) = SUM [ 1 / (k + rank_dense(d)) ] + SUM [ 1 / (k + rank_sparse(d)) ]
\`\`\`

---

## Liên kết Kiến trúc
- Mọi ngữ cảnh truy xuất từ Vector DB trước khi đưa vào LLM đều phải đi qua [[LLM Security Gateway Design]] để chống **Indirect Prompt Injection**.
- Toàn bộ chỉ mục ghi chú cá nhân cũng áp dụng triết lý của [[Zero-Dependency Full-Stack Architecture]].

---

## Hạng mục Tối ưu hóa
- [x] Triển khai Semantic Chunking theo cấu trúc Markdown Header
- [x] Thêm bước Reranking với Cross-Encoder
- [ ] Đo đạc độ trễ truy vấn P99 trên tập vector thực tế
`
      },
      {
        id: 'note-zero-dep',
        title: 'Zero-Dependency Full-Stack Architecture',
        icon: 'SYS',
        folder: 'Engineering',
        color: '#38bdf8',
        pinned: false,
        favorite: false,
        archived: false,
        tags: ['nodejs', 'sqlite', 'system-design', 'performance'],
        createdAt: iso(3),
        updatedAt: iso(2),
        content: `# Zero-Dependency Full-Stack Architecture

Ghi chú này giải thích thiết kế cốt lõi đằng sau [[MindVault Architecture Hub]].

---

## 1. Sức mạnh từ Native Runtime (Node.js v22+ / v24+)
Kể từ khi Node.js tích hợp sẵn \`node:sqlite\`, ứng dụng Full-Stack có thể chạy mà không cần cài đặt \`node_modules\` nặng hàng trăm MB:

- **Khởi động tức thì:** Không tốn thời gian phân giải cây phụ thuộc.
- **Bảo mật chuỗi cung ứng:** Loại bỏ nguy cơ tấn công Supply Chain qua gói bên thứ 3 (liên quan tới [[LLM Security Gateway Design]]).
- **Chạy kép Hybrid:** Khi triển khai tĩnh trên GitHub Pages, tầng giao diện tự động chuyển sang \`localStorage\` mà giữ nguyên toàn bộ trải nghiệm.

---

## 2. Các thành phần Kỹ thuật
- [x] Native REST Router hỗ trợ CRUD, Filter, Search, Graph Topology
- [x] Đồ thị tương tác vật lý 2D tự viết trên HTML5 Canvas
- [ ] Viết bài blog kỹ thuật chia sẻ lên [[2026 Portfolio & Open Source Roadmap]]
`
      },
      {
        id: 'note-deep-work',
        title: 'Deep Work & Pomodoro Protocol',
        icon: 'FLOW',
        folder: 'Productivity',
        color: '#14b8a6',
        pinned: false,
        favorite: false,
        archived: false,
        tags: ['productivity', 'deep-work', 'pomodoro', 'habits'],
        createdAt: iso(2),
        updatedAt: iso(1),
        content: `# Deep Work & Pomodoro Protocol

Quy trình tối ưu hóa sự tập trung cao độ khi lập trình và nghiên cứu tại [[MindVault Architecture Hub]].

---

## Nguyên tắc Pomodoro 25/5
1. **Xác định rõ 1 mục tiêu duy nhất** trước khi bấm đồng hồ Focus ở thanh công cụ phía trên.
2. **Đóng tab gây xao nhãng:** Chỉ mở trình soạn thảo code và ghi chú kỹ thuật liên quan (ví dụ [[RAG & Vector Database Deep Dive]]).
3. **Ghi nhận lại tiến độ:** Sau mỗi phiên Pomodoro, đánh dấu hoàn thành các checkbox trong bài.

---

## Thói quen Hàng ngày
- [x] Dành 25 phút đầu ngày rà soát [[2026 Portfolio & Open Source Roadmap]]
- [x] Viết ít nhất 1 ghi chú kỹ thuật mới theo chuẩn Zettelkasten
- [ ] Thực hiện 4 phiên Deep Focus không ngắt quãng trong ngày hôm nay
`
      },
      {
        id: 'note-roadmap-2026',
        title: '2026 Portfolio & Open Source Roadmap',
        icon: 'PLAN',
        folder: 'Projects',
        color: '#34d399',
        pinned: true,
        favorite: true,
        archived: false,
        tags: ['roadmap', 'github', 'portfolio', 'career'],
        createdAt: iso(1),
        updatedAt: iso(0),
        content: `# 2026 Portfolio & Open Source Roadmap

Kế hoạch xây dựng hệ sinh thái dự án mã nguồn mở chất lượng cao trên trang GitHub cá nhân **github.com/quoctuan364**.

---

## Danh mục Dự án Chủ lực
1. **MindVault** ([[MindVault Architecture Hub]]) — Full-Stack Second Brain & Knowledge Graph với [[Zero-Dependency Full-Stack Architecture]].
2. **Sentinel AI & LLM Security Gateway** ([[LLM Security Gateway Design]]) — Hệ thống tường lửa bảo vệ mô hình ngôn ngữ lớn.
3. **BookVerse AI** ([[RAG & Vector Database Deep Dive]]) — Nền tảng đọc sách thông minh tích hợp RAG.
4. **Productivity Discipline** ([[Deep Work & Pomodoro Protocol]]) — Hệ thống theo dõi hiệu suất làm việc chuyên sâu.

---

## Mục tiêu Chuẩn hóa
- [x] Thiết kế giao diện Obsidian Dark & Editorial Light cho MindVault v2.0
- [x] Bổ sung tính năng Xuất/Nhập toàn bộ kho tri thức (JSON Backup & Restore)
- [x] Hỗ trợ Live Demo trực tiếp trên GitHub Pages không cần server
- [ ] Hoàn thiện video demo dự án gắn vào hồ sơ GitHub
`
      }
    ];
  }

  function createSeedFocus() {
    const now = Date.now();
    return [
      {
        id: 'focus-seed-1',
        note_id: 'note-welcome-hub',
        note_title: 'MindVault Architecture Hub',
        duration_minutes: 25,
        completed_at: new Date(now - 3600 * 1000 * 5).toISOString()
      },
      {
        id: 'focus-seed-2',
        note_id: 'note-llm-security',
        note_title: 'LLM Security Gateway Design',
        duration_minutes: 25,
        completed_at: new Date(now - 3600 * 1000 * 2).toISOString()
      }
    ];
  }

  function loadRawNotes() {
    const raw = getStore(NOTES_KEY);
    if (!raw) {
      const seed = createSeedNotes();
      setStore(NOTES_KEY, JSON.stringify(seed));
      return seed;
    }
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : createSeedNotes();
    } catch {
      return createSeedNotes();
    }
  }

  function saveRawNotes(notes) {
    setStore(NOTES_KEY, JSON.stringify(notes));
  }

  function loadFocusSessions() {
    const raw = getStore(FOCUS_KEY);
    if (!raw) {
      const seed = createSeedFocus();
      setStore(FOCUS_KEY, JSON.stringify(seed));
      return seed;
    }
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function saveFocusSessions(list) {
    setStore(FOCUS_KEY, JSON.stringify(list));
  }

  function hydrateNote(row, allNotes) {
    const tags = Array.isArray(row.tags) ? row.tags : [];
    const outgoingLinks = extractWikiLinks(row.content);
    const tasks = extractTasks(row.content, row.id, row.title, row.folder);
    const backlinks = [];

    if (allNotes) {
      const targetLower = row.title.trim().toLowerCase();
      for (const other of allNotes) {
        if (other.id === row.id || other.archived) continue;
        const otherLinks = extractWikiLinks(other.content).map(x => x.toLowerCase());
        if (otherLinks.includes(targetLower)) {
          backlinks.push({
            id: other.id,
            title: other.title,
            icon: other.icon || 'DOC',
            folder: other.folder || 'Inbox'
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
      color: row.color || '#10b981',
      wordCount: countWords(row.content),
      outgoingLinks,
      backlinks,
      tasks,
      createdAt: row.createdAt || row.created_at || new Date().toISOString(),
      updatedAt: row.updatedAt || row.updated_at || new Date().toISOString()
    };
  }

  function sortNotes(notes) {
    return [...notes].sort((a, b) => {
      if (Boolean(b.pinned) !== Boolean(a.pinned)) return b.pinned ? 1 : -1;
      return String(b.updatedAt || '').localeCompare(String(a.updatedAt || ''));
    });
  }

  function buildGraph() {
    const active = sortNotes(loadRawNotes().filter(n => !n.archived));
    const hydrated = active.map(r => hydrateNote(r, active));
    const titleMap = new Map();
    hydrated.forEach(n => titleMap.set(n.title.trim().toLowerCase(), n));

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
    const active = loadRawNotes().filter(n => !n.archived);
    const hydrated = active.map(r => hydrateNote(r, active));
    const graph = buildGraph();
    const sessions = loadFocusSessions();

    let totalWords = 0;
    let totalTasks = 0;
    let completedTasks = 0;
    const tagCounts = {};
    const folderCounts = {};

    for (const n of hydrated) {
      totalWords += n.wordCount;
      folderCounts[n.folder] = (folderCounts[n.folder] || 0) + 1;
      for (const t of n.tags) tagCounts[t] = (tagCounts[t] || 0) + 1;
      for (const task of n.tasks) {
        totalTasks++;
        if (task.completed) completedTasks++;
      }
    }

    const totalMinutes = sessions.reduce((s, f) => s + (Number(f.duration_minutes) || 0), 0);
    return {
      noteCount: hydrated.length,
      totalWords,
      linkCount: graph.edges.length,
      totalTasks,
      completedTasks,
      tagCounts,
      folderCounts,
      focus: {
        totalMinutes,
        sessionCount: sessions.length,
        recentSessions: sessions.slice(0, 30)
      }
    };
  }

  function generateId(prefix = 'note') {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
    }
    return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
  }

  async function handle(url, options = {}) {
    const method = (options.method || 'GET').toUpperCase();
    const parsedUrl = new URL(url, 'http://localhost');
    const pathname = parsedUrl.pathname;
    const body = options.body ? JSON.parse(options.body) : {};

    if (pathname === '/api/notes' && method === 'GET') {
      const active = sortNotes(loadRawNotes().filter(n => !n.archived));
      const notes = active.map(r => hydrateNote(r, active));
      return { notes };
    }

    if (pathname === '/api/notes' && method === 'POST') {
      const notes = loadRawNotes();
      const now = new Date().toISOString();
      const newNote = {
        id: body.id || generateId('note'),
        title: (body.title || 'Untitled Note').trim(),
        icon: body.icon || 'DOC',
        folder: (body.folder || 'Inbox').trim(),
        content: body.content !== undefined ? body.content : `# ${body.title || 'Untitled Note'}\n\n`,
        tags: Array.isArray(body.tags) ? body.tags : [],
        pinned: Boolean(body.pinned),
        favorite: Boolean(body.favorite),
        archived: false,
        color: body.color || '#10b981',
        createdAt: now,
        updatedAt: now
      };
      notes.unshift(newNote);
      saveRawNotes(notes);
      return { note: hydrateNote(newNote, notes.filter(n => !n.archived)) };
    }

    const noteMatch = pathname.match(/^\/api\/notes\/([^/]+)$/);
    if (noteMatch) {
      const noteId = decodeURIComponent(noteMatch[1]);
      const notes = loadRawNotes();
      const idx = notes.findIndex(n => n.id === noteId);

      if (method === 'GET') {
        if (idx === -1) throw new Error('Note not found');
        return { note: hydrateNote(notes[idx], notes.filter(n => !n.archived)) };
      }

      if (method === 'PUT' || method === 'PATCH') {
        if (idx === -1) throw new Error('Note not found');
        const ex = notes[idx];
        const updated = {
          ...ex,
          title: body.title !== undefined ? body.title.trim() : ex.title,
          icon: body.icon !== undefined ? body.icon : ex.icon,
          folder: body.folder !== undefined ? body.folder.trim() : ex.folder,
          content: body.content !== undefined ? body.content : ex.content,
          tags: Array.isArray(body.tags) ? body.tags : ex.tags,
          pinned: body.pinned !== undefined ? Boolean(body.pinned) : ex.pinned,
          favorite: body.favorite !== undefined ? Boolean(body.favorite) : ex.favorite,
          archived: body.archived !== undefined ? Boolean(body.archived) : ex.archived,
          color: body.color !== undefined ? body.color : ex.color,
          updatedAt: new Date().toISOString()
        };
        notes[idx] = updated;
        saveRawNotes(notes);
        return { note: hydrateNote(updated, notes.filter(n => !n.archived)) };
      }

      if (method === 'DELETE') {
        saveRawNotes(notes.filter(n => n.id !== noteId));
        return { deleted: true, id: noteId };
      }
    }

    if (pathname === '/api/tasks/toggle' && method === 'POST') {
      const notes = loadRawNotes();
      const idx = notes.findIndex(n => n.id === body.noteId);
      if (idx === -1) throw new Error('Note not found');
      const lines = (notes[idx].content || '').split('\n');
      const li = Number(body.lineIndex);
      if (li >= 0 && li < lines.length) {
        lines[li] = lines[li].replace(/^(\s*[-*]\s+\[)([ xX])(\]\s+.+)$/, (_, prefix, state, suffix) => {
          return `${prefix}${state.toLowerCase() === 'x' ? ' ' : 'x'}${suffix}`;
        });
        notes[idx].content = lines.join('\n');
        notes[idx].updatedAt = new Date().toISOString();
        saveRawNotes(notes);
      }
      return { note: hydrateNote(notes[idx], notes.filter(n => !n.archived)) };
    }

    if (pathname === '/api/graph' && method === 'GET') {
      return buildGraph();
    }

    if (pathname === '/api/stats' && method === 'GET') {
      return buildStats();
    }

    if (pathname === '/api/focus' && method === 'POST') {
      const sessions = loadFocusSessions();
      const session = {
        id: generateId('focus'),
        note_id: body.noteId || null,
        note_title: body.noteTitle || 'Deep Work Session',
        duration_minutes: Number(body.durationMinutes) || 25,
        completed_at: new Date().toISOString()
      };
      sessions.unshift(session);
      saveFocusSessions(sessions);
      return { session, stats: buildStats() };
    }

    if (pathname === '/api/export' && method === 'GET') {
      const all = sortNotes(loadRawNotes());
      const notes = all.map(r => hydrateNote(r, all));
      return {
        vault: 'MindVault Second Brain',
        exportedAt: new Date().toISOString(),
        notes
      };
    }

    if (pathname === '/api/import' && method === 'POST') {
      if (!Array.isArray(body.notes)) {
        throw new Error('Invalid import payload: expected { notes: [...] }');
      }
      const existing = loadRawNotes();
      const byId = new Map(existing.map(n => [n.id, n]));
      let imported = 0;
      const now = new Date().toISOString();

      for (const item of body.notes) {
        if (!item || typeof item.title !== 'string') continue;
        const id = (item.id && String(item.id).trim()) || generateId('note');
        byId.set(id, {
          id,
          title: item.title.trim() || 'Untitled Note',
          icon: item.icon || 'DOC',
          folder: (item.folder || 'Inbox').trim(),
          content: String(item.content || ''),
          tags: Array.isArray(item.tags) ? item.tags : [],
          pinned: Boolean(item.pinned),
          favorite: Boolean(item.favorite),
          archived: Boolean(item.archived),
          color: item.color || '#10b981',
          createdAt: item.createdAt || now,
          updatedAt: item.updatedAt || now
        });
        imported++;
      }
      saveRawNotes(Array.from(byId.values()));
      return { imported };
    }

    throw new Error(`Unsupported local route: ${method} ${pathname}`);
  }

  function resetDemo() {
    const notes = createSeedNotes();
    const focus = createSeedFocus();
    saveRawNotes(notes);
    saveFocusSessions(focus);
    return { notesCount: notes.length };
  }

  const api = { handle, resetDemo };
  if (globalScope) {
    globalScope.MindVaultLocalEngine = api;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
