/* ============================================================================
 * MindVault — Frontend Application & 2D Physics Knowledge Graph Engine
 * ============================================================================ */

const state = {
  notes: [],
  activeNoteId: null,
  activeView: 'editor', // 'editor' | 'graph' | 'tasks' | 'insights'
  filterFolder: 'ALL',
  filterTag: '',
  filterFavorite: false,
  searchQuery: '',
  taskFilter: 'all', // 'all' | 'pending' | 'done'
  graphData: { nodes: [], edges: [] },
  stats: null,
  saveTimer: null,
  pomo: {
    secondsLeft: 25 * 60,
    running: false,
    interval: null
  }
};

const EMOJI_LIST = [
  'CORE', 'DOC', 'SEC', 'RAG', 'SYS', 'PLAN', 'FLOW', 'ADR',
  'API', 'DB', 'LLM', 'ML', 'DEV', 'BUG', 'SPEC', 'NOTE'
];

const SMART_TEMPLATES = [
  {
    title: 'Zettelkasten Permanent Note',
    icon: 'CORE',
    folder: 'Second Brain',
    color: '#6366f1',
    tags: ['zettelkasten', 'atomic-note'],
    desc: 'Ghi chú nguyên tử kết nối tri thức hai chiều theo chuẩn Niklas Luhmann.',
    content: `# [Tên Khái Niệm Nguyên Tử]

> **Tóm tắt 1 câu (Core Idea):** Giải thích ngắn gọn ý tưởng cốt lõi bằng ngôn từ của chính bạn.

---

## Phân tích Chuyên sâu
- Luận điểm 1: ...
- Luận điểm 2: ...

## Mối liên hệ trong Mạng Tri thức
- Dựa trên nền tảng của: [[MindVault Architecture Hub]]
- Đối lập hoặc bổ sung cho: [[RAG & Vector Database Deep Dive]]

## Hành động tiếp theo
- [ ] Kiểm chứng ý tưởng này trong dự án thực tế
`
  },
  {
    title: 'Architecture Decision Record (ADR)',
    icon: 'ADR',
    folder: 'Engineering',
    color: '#f59e0b',
    tags: ['adr', 'system-design', 'architecture'],
    desc: 'Tài liệu ghi nhận quyết định kiến trúc phần mềm chuẩn kỹ sư hệ thống.',
    content: `# ADR: [Tên Quyết Định Kiến Trúc]

- **Trạng thái:** Đã phê duyệt (Accepted)
- **Liên kết hệ thống:** [[Zero-Dependency Full-Stack Architecture]]

---

## 1. Bối cảnh & Bài toán (Context)
Mô tả vấn đề kỹ thuật hoặc giới hạn hệ thống cần giải quyết.

## 2. Quyết định (Decision)
Chúng ta quyết định lựa chọn giải pháp **...** vì những ưu điểm vượt trội về hiệu năng và độ tin cậy.

## 3. Hệ quả & Đánh đổi (Consequences)
- **Tích cực:** Giảm độ trễ, dễ bảo trì.
- **Đánh đổi:** Cần kiểm soát chặt chẽ theo [[LLM Security Gateway Design]].

## Checklist Triển khai
- [ ] Viết Unit Test & Benchmark hiệu năng
- [ ] Cập nhật sơ đồ kiến trúc
`
  },
  {
    title: 'AI Paper / Model Research Note',
    icon: 'LLM',
    folder: 'AI & Security',
    color: '#ec4899',
    tags: ['ai-research', 'paper', 'llm'],
    desc: 'Mẫu tổng hợp bài báo khoa học AI/ML, kiến trúc mô hình và thực nghiệm.',
    content: `# Research: [Tên Bài Báo / Mô Hình AI]

## Đóng góp Chính (Key Contributions)
1. Kiến trúc mới giúp tối ưu hóa...
2. Cải thiện độ chính xác trên tập benchmark...

## Phương pháp & Công thức
\`\`\`python
def attention_block(query, key, value):
    # Mô tả thuật toán cốt lõi
    pass
\`\`\`

## Liên kết Hệ sinh thái
- Tích hợp vào pipeline: [[RAG & Vector Database Deep Dive]]
- Đánh giá an toàn qua: [[LLM Security Gateway Design]]

## Thực nghiệm cần chạy
- [ ] Tải weights và chạy thử nghiệm suy luận (Inference)
- [ ] Đo tốc độ tokens/sec
`
  },
  {
    title: 'Weekly Sprint & Deep Work Plan',
    icon: 'PLAN',
    folder: 'Productivity',
    color: '#10b981',
    tags: ['sprint', 'planning', 'deep-work'],
    desc: 'Kế hoạch mục tiêu tuần kết hợp phương pháp Pomodoro Deep Work.',
    content: `# Kế Hoạch Sprint & Deep Work Tuần Này

Kết nối cùng lộ trình [[2026 Portfolio & Open Source Roadmap]] và quy tắc [[Deep Work & Pomodoro Protocol]].

---

## 3 Mục tiêu Trọng tâm (Top 3 Outcomes)
- [ ] Hoàn thành tính năng cốt lõi cho dự án trên GitHub
- [ ] Viết 2 ghi chú kỹ thuật chất lượng cao vào [[MindVault Architecture Hub]]
- [ ] Đạt tối thiểu 10 phiên tập trung Pomodoro (250 phút Deep Work)

## Nhật ký Cải tiến
- Những điểm làm tốt: ...
- Những điểm cần tối ưu: ...
`
  }
];

/* ============================================================================
 * API HELPERS
 * ============================================================================ */
async function apiFetch(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Network error' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

async function loadAllData(selectFirst = false) {
  const [{ notes }, stats, graph] = await Promise.all([
    apiFetch('/api/notes'),
    apiFetch('/api/stats'),
    apiFetch('/api/graph')
  ]);

  state.notes = notes;
  state.stats = stats;
  state.graphData = graph;

  if (selectFirst && notes.length > 0 && !state.activeNoteId) {
    state.activeNoteId = notes[0].id;
  } else if (state.activeNoteId && !notes.some(n => n.id === state.activeNoteId)) {
    state.activeNoteId = notes[0] ? notes[0].id : null;
  }

  renderSidebar();
  renderActiveNote();
  if (state.activeView === 'graph') initOrUpdateGraph();
  if (state.activeView === 'tasks') renderTasksHub();
  if (state.activeView === 'insights') renderInsightsHub();
}

/* ============================================================================
 * CUSTOM MARKDOWN & WIKI-LINK PARSER
 * ============================================================================ */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function parseInlineMarkdown(text) {
  let out = escapeHtml(text);

  // Inline code
  out = out.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Wiki-links [[Note Title]]
  out = out.replace(/\[\[([^\]]+)\]\]/g, (_, target) => {
    const clean = target.trim();
    return `<a class="wiki-link" data-wikilink="${clean.replace(/"/g, '&quot;')}">[[${clean}]]</a>`;
  });

  // Bold & Italic
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/\*([^*]+)\*/g, '<em>$1</em>');

  // Standard links [text](url)
  out = out.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

  return out;
}

function renderMarkdown(mdText) {
  if (!mdText) return '<p style="color: var(--text-muted)">Chưa có nội dung...</p>';

  const lines = mdText.split('\n');
  let html = '';
  let inCodeBlock = false;
  let codeBuffer = [];
  let inList = false;
  let inTable = false;
  let tableRows = [];

  const flushList = () => {
    if (inList) {
      html += '</ul>';
      inList = false;
    }
  };

  const flushTable = () => {
    if (!inTable || tableRows.length === 0) return;
    html += '<table>';
    tableRows.forEach((row, rIdx) => {
      if (rIdx === 1 && row.every(c => /^[:-\s]+$/.test(c))) return;
      const tag = rIdx === 0 ? 'th' : 'td';
      html += '<tr>' + row.map(c => `<${tag}>${parseInlineMarkdown(c.trim())}</${tag}>`).join('') + '</tr>';
    });
    html += '</table>';
    inTable = false;
    tableRows = [];
  };

  lines.forEach((rawLine, lineIdx) => {
    const line = rawLine.replace(/\r$/, '');

    // Code block toggle
    if (line.trim().startsWith('```')) {
      flushList();
      flushTable();
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeBuffer = [];
      } else {
        html += `<pre><code>${escapeHtml(codeBuffer.join('\n'))}</code></pre>`;
        inCodeBlock = false;
      }
      return;
    }

    if (inCodeBlock) {
      codeBuffer.push(line);
      return;
    }

    // Table row detection
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      flushList();
      inTable = true;
      const cells = line.trim().slice(1, -1).split('|');
      tableRows.push(cells);
      return;
    } else if (inTable) {
      flushTable();
    }

    // Horizontal rule
    if (/^---+$/.test(line.trim())) {
      flushList();
      html += '<hr />';
      return;
    }

    // Headings
    const hMatch = line.match(/^(#{1,3})\s+(.+)$/);
    if (hMatch) {
      flushList();
      const level = hMatch[1].length;
      html += `<h${level}>${parseInlineMarkdown(hMatch[2])}</h${level}>`;
      return;
    }

    // Blockquote
    if (line.trim().startsWith('>')) {
      flushList();
      const quoteContent = line.replace(/^\s*>\s?/, '');
      html += `<blockquote>${parseInlineMarkdown(quoteContent)}</blockquote>`;
      return;
    }

    // Task checkbox item
    const taskMatch = line.match(/^(\s*)[-*]\s+\[([ xX])\]\s+(.+)$/);
    if (taskMatch) {
      if (!inList) {
        html += '<ul>';
        inList = true;
      }
      const checked = taskMatch[2].toLowerCase() === 'x';
      html += `<li class="md-task-item ${checked ? 'done' : ''}">
        <input type="checkbox" data-line="${lineIdx}" ${checked ? 'checked' : ''} />
        <span>${parseInlineMarkdown(taskMatch[3])}</span>
      </li>`;
      return;
    }

    // Bullet list
    const listMatch = line.match(/^(\s*)[-*]\s+(.+)$/);
    if (listMatch) {
      if (!inList) {
        html += '<ul>';
        inList = true;
      }
      html += `<li>${parseInlineMarkdown(listMatch[2])}</li>`;
      return;
    }

    // Numbered list
    const numMatch = line.match(/^\s*\d+\.\s+(.+)$/);
    if (numMatch) {
      if (!inList) {
        html += '<ul>';
        inList = true;
      }
      html += `<li>${parseInlineMarkdown(numMatch[1])}</li>`;
      return;
    }

    // Blank line
    if (!line.trim()) {
      flushList();
      return;
    }

    flushList();
    html += `<p>${parseInlineMarkdown(line)}</p>`;
  });

  flushList();
  flushTable();
  if (inCodeBlock) {
    html += `<pre><code>${escapeHtml(codeBuffer.join('\n'))}</code></pre>`;
  }

  return html;
}

/* ============================================================================
 * SIDEBAR & NOTE LIST RENDERING
 * ============================================================================ */
function getFilteredNotes() {
  return state.notes.filter(n => {
    if (state.filterFolder !== 'ALL' && n.folder.toLowerCase() !== state.filterFolder.toLowerCase()) {
      return false;
    }
    if (state.filterTag && !n.tags.map(t => t.toLowerCase()).includes(state.filterTag.toLowerCase())) {
      return false;
    }
    if (state.filterFavorite && !n.favorite) {
      return false;
    }
    if (state.searchQuery) {
      const q = state.searchQuery.toLowerCase();
      const match =
        n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q) ||
        n.folder.toLowerCase().includes(q) ||
        n.tags.some(t => t.toLowerCase().includes(q));
      if (!match) return false;
    }
    return true;
  });
}

function renderSidebar() {
  // Badges
  document.getElementById('navNoteCount').textContent = state.notes.length;
  document.getElementById('navLinkCount').textContent = state.graphData.edges.length;
  if (state.stats) {
    document.getElementById('navTaskCount').textContent = `${state.stats.completedTasks}/${state.stats.totalTasks}`;
  }

  // Folders
  const folderCounts = (state.stats && state.stats.folderCounts) || {};
  const folderListEl = document.getElementById('folderList');
  folderListEl.innerHTML = Object.entries(folderCounts)
    .map(([folder, count]) => {
      const isActive = state.filterFolder.toLowerCase() === folder.toLowerCase();
      return `<button class="filter-chip ${isActive ? 'active' : ''}" data-folder="${escapeHtml(folder)}">
        <span>/${escapeHtml(folder)}</span>
        <span style="opacity:0.6">${count}</span>
      </button>`;
    })
    .join('');

  // Tags
  const tagCounts = (state.stats && state.stats.tagCounts) || {};
  const tagListEl = document.getElementById('tagList');
  tagListEl.innerHTML = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([tag, count]) => {
      const isActive = state.filterTag.toLowerCase() === tag.toLowerCase();
      return `<button class="filter-chip ${isActive ? 'active' : ''}" data-tag="${escapeHtml(tag)}">
        <span>#${escapeHtml(tag)}</span>
        <span style="opacity:0.6">${count}</span>
      </button>`;
    })
    .join('');

  // Filtered Notes List
  const filtered = getFilteredNotes();
  const container = document.getElementById('notesListContainer');

  if (filtered.length === 0) {
    container.innerHTML = `<div style="padding: 20px 10px; text-align:center; color: var(--text-muted); font-size:12.5px;">
      Không tìm thấy tài liệu phù hợp.
    </div>`;
    return;
  }

  container.innerHTML = filtered
    .map(n => {
      const isActive = n.id === state.activeNoteId;
      const cleanExcerpt = n.content
        .replace(/^#+\s+.+$/gm, '')
        .replace(/[#*`>\[\]-]/g, '')
        .trim()
        .slice(0, 95);

      return `<div class="note-card ${isActive ? 'active' : ''}" data-noteid="${n.id}">
        <div class="note-card-top">
          <span class="note-card-icon">${escapeHtml(n.icon || 'DOC')}</span>
          <span class="note-card-title">${escapeHtml(n.title)}</span>
          <div class="note-card-badges">
            ${n.pinned ? '<span style="color:var(--accent-indigo);font-family:var(--font-mono);font-size:10px">[PIN]</span>' : ''}
            ${n.favorite ? '<span style="color:var(--accent-amber);font-family:var(--font-mono);font-size:10px">[*]</span>' : ''}
          </div>
        </div>
        <div class="note-card-excerpt">${escapeHtml(cleanExcerpt || 'Tài liệu trống...')}</div>
        <div class="note-card-meta">
          <span class="note-folder-pill">${escapeHtml(n.folder)}</span>
          <span>${n.outgoingLinks.length + n.backlinks.length} links · ${n.wordCount} từ</span>
        </div>
      </div>`;
    })
    .join('');
}

/* ============================================================================
 * ACTIVE NOTE EDITOR & PREVIEW RENDERING
 * ============================================================================ */
function getActiveNote() {
  return state.notes.find(n => n.id === state.activeNoteId) || null;
}

function renderActiveNote() {
  const note = getActiveNote();
  if (!note) return;

  document.getElementById('crumbFolder').textContent = note.folder;
  document.getElementById('crumbTitle').textContent = note.title;

  document.getElementById('btnPickIcon').textContent = note.icon || 'DOC';
  const titleInput = document.getElementById('noteTitleInput');
  if (document.activeElement !== titleInput) {
    titleInput.value = note.title;
  }

  const folderInput = document.getElementById('noteFolderInput');
  if (document.activeElement !== folderInput) {
    folderInput.value = note.folder;
  }

  document.getElementById('noteColorInput').value = note.color || '#6366f1';
  document.getElementById('btnTogglePin').classList.toggle('active', note.pinned);
  document.getElementById('btnToggleFav').classList.toggle('active', note.favorite);

  const contentInput = document.getElementById('noteContentInput');
  if (document.activeElement !== contentInput) {
    contentInput.value = note.content;
  }

  // Render tags of active note
  const tagsWrap = document.getElementById('activeNoteTags');
  tagsWrap.innerHTML = note.tags
    .map(
      t => `<span class="tag-pill">#${escapeHtml(t)} <button data-removetag="${escapeHtml(t)}" title="Xóa tag">×</button></span>`
    )
    .join('');

  updateLivePreviewAndConnections(note);
}

function updateLivePreviewAndConnections(note) {
  const previewEl = document.getElementById('markdownPreview');
  previewEl.innerHTML = renderMarkdown(note.content);

  // Outgoing links
  const outgoingEl = document.getElementById('outgoingLinksList');
  if (!note.outgoingLinks || note.outgoingLinks.length === 0) {
    outgoingEl.innerHTML = `<span style="color:var(--text-muted); font-size:12px;">Chưa có liên kết đi. Dùng <code>[[Tên bài]]</code> để thêm.</span>`;
  } else {
    outgoingEl.innerHTML = note.outgoingLinks
      .map(targetTitle => {
        const exists = state.notes.find(n => n.title.toLowerCase() === targetTitle.toLowerCase());
        return `<button class="conn-chip" data-wikilink="${escapeHtml(targetTitle)}">
          <span style="font-family:var(--font-mono);font-size:10px;color:var(--accent-indigo)">[${exists ? escapeHtml(exists.icon) : 'NEW'}]</span>
          <span>${escapeHtml(targetTitle)}</span>
        </button>`;
      })
      .join('');
  }

  // Backlinks
  const backlinksEl = document.getElementById('backlinksList');
  if (!note.backlinks || note.backlinks.length === 0) {
    backlinksEl.innerHTML = `<span style="color:var(--text-muted); font-size:12px;">Chưa có tài liệu nào trỏ tới bài này.</span>`;
  } else {
    backlinksEl.innerHTML = note.backlinks
      .map(
        b => `<button class="conn-chip" data-openNoteId="${b.id}">
          <span style="font-family:var(--font-mono);font-size:10px;color:var(--accent-emerald)">[${escapeHtml(b.icon || 'DOC')}]</span>
          <span>${escapeHtml(b.title)}</span>
        </button>`
      )
      .join('');
  }

  // Status bar metrics
  const words = note.content.trim() ? note.content.trim().split(/\s+/).length : 0;
  const readMin = Math.max(1, Math.ceil(words / 200));
  const doneTasks = (note.tasks || []).filter(t => t.completed).length;
  const totalTasks = (note.tasks || []).length;

  document.getElementById('statWords').textContent = `${words} từ`;
  document.getElementById('statReadTime').textContent = `~${readMin} phút đọc`;
  document.getElementById('statTasksInNote').textContent = `${doneTasks}/${totalTasks} nhiệm vụ hoàn thành`;
  document.getElementById('statUpdatedAt').textContent = `Lưu lúc ${new Date(note.updatedAt).toLocaleTimeString('vi-VN')}`;
}

function scheduleAutoSave(patch = {}) {
  const note = getActiveNote();
  if (!note) return;

  const saveInd = document.getElementById('saveStatus');
  saveInd.textContent = '● Đang đồng bộ...';
  saveInd.style.color = 'var(--accent-amber)';

  if (state.saveTimer) clearTimeout(state.saveTimer);
  state.saveTimer = setTimeout(async () => {
    const payload = {
      title: document.getElementById('noteTitleInput').value.trim() || 'Untitled Note',
      folder: document.getElementById('noteFolderInput').value.trim() || 'Inbox',
      color: document.getElementById('noteColorInput').value,
      content: document.getElementById('noteContentInput').value,
      ...patch
    };

    try {
      await apiFetch(`/api/notes/${note.id}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      await loadAllData(false);
      saveInd.textContent = '● Đã đồng bộ SQLite';
      saveInd.style.color = 'var(--accent-emerald)';
    } catch (e) {
      saveInd.textContent = '● Lỗi lưu!';
      saveInd.style.color = 'var(--accent-rose)';
    }
  }, 320);
}

/* ============================================================================
 * INTERACTIVE 2D FORCE-DIRECTED KNOWLEDGE GRAPH ENGINE
 * ============================================================================ */
const graphSim = {
  nodes: [],
  edges: [],
  animId: null,
  zoom: 1,
  panX: 0,
  panY: 0,
  draggingNode: null,
  isPanning: false,
  lastMouseX: 0,
  lastMouseY: 0,
  hoveredNode: null,
  repulsionBoost: 1
};

function initOrUpdateGraph() {
  const canvas = document.getElementById('knowledgeGraphCanvas');
  if (!canvas) return;
  const rect = canvas.parentElement.getBoundingClientRect();
  canvas.width = rect.width || 900;
  canvas.height = rect.height || 620;

  const cx = canvas.width / 2;
  const cy = canvas.height / 2;

  const oldMap = new Map(graphSim.nodes.map(n => [n.id, n]));

  graphSim.nodes = state.graphData.nodes.map((n, idx) => {
    const prev = oldMap.get(n.id);
    const angle = (idx / Math.max(1, state.graphData.nodes.length)) * Math.PI * 2;
    const radius = 140;
    return {
      ...n,
      x: prev ? prev.x : cx + Math.cos(angle) * radius,
      y: prev ? prev.y : cy + Math.sin(angle) * radius,
      vx: prev ? prev.vx : 0,
      vy: prev ? prev.vy : 0,
      r: Math.min(30, 18 + (n.degree || 1) * 2.0)
    };
  });

  graphSim.edges = state.graphData.edges.map(e => ({ ...e }));

  if (!graphSim.animId) {
    runGraphLoop();
  }
}

function runGraphLoop() {
  const canvas = document.getElementById('knowledgeGraphCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const stepPhysics = () => {
    const nodes = graphSim.nodes;
    const edges = graphSim.edges;
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    // 1. Coulomb Repulsion between all nodes
    const repulsion = 5200 * graphSim.repulsionBoost;
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[j].x - nodes[i].x;
        const dy = nodes[j].y - nodes[i].y;
        const distSq = Math.max(400, dx * dx + dy * dy);
        const force = repulsion / distSq;
        const dist = Math.sqrt(distSq);
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;

        nodes[i].vx -= fx;
        nodes[i].vy -= fy;
        nodes[j].vx += fx;
        nodes[j].vy += fy;
      }
    }

    // 2. Hooke Spring Attraction along Wiki-Link edges
    const idealLength = 165;
    const springK = 0.025;
    const nodeById = new Map(nodes.map(n => [n.id, n]));

    for (const edge of edges) {
      const s = nodeById.get(edge.source);
      const t = nodeById.get(edge.target);
      if (!s || !t) continue;
      const dx = t.x - s.x;
      const dy = t.y - s.y;
      const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));
      const displacement = dist - idealLength;
      const force = displacement * springK;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;

      s.vx += fx;
      s.vy += fy;
      t.vx -= fx;
      t.vy -= fy;
    }

    // 3. Gentle center gravity + Velocity integration
    for (const n of nodes) {
      if (graphSim.draggingNode && graphSim.draggingNode.id === n.id) {
        n.vx = 0;
        n.vy = 0;
        continue;
      }
      n.vx += (cx - n.x) * 0.003;
      n.vy += (cy - n.y) * 0.003;

      n.vx *= 0.82; // damping
      n.vy *= 0.82;

      n.x += n.vx;
      n.y += n.vy;
    }
  };

  const drawScene = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Subtle background grid
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.025)';
    ctx.lineWidth = 1;
    const gridSize = 40 * graphSim.zoom;
    for (let x = (graphSim.panX % gridSize); x < canvas.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = (graphSim.panY % gridSize); y < canvas.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }
    ctx.restore();

    ctx.save();
    ctx.translate(graphSim.panX, graphSim.panY);
    ctx.scale(graphSim.zoom, graphSim.zoom);

    const nodeById = new Map(graphSim.nodes.map(n => [n.id, n]));

    // Draw Edges
    for (const edge of graphSim.edges) {
      const s = nodeById.get(edge.source);
      const t = nodeById.get(edge.target);
      if (!s || !t) continue;

      const isHighlighted =
        graphSim.hoveredNode &&
        (graphSim.hoveredNode.id === s.id || graphSim.hoveredNode.id === t.id);

      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(t.x, t.y);
      ctx.strokeStyle = isHighlighted ? '#818cf8' : 'rgba(148, 163, 184, 0.28)';
      ctx.lineWidth = isHighlighted ? 2.5 : 1.4;
      ctx.stroke();
    }

    // Draw Nodes
    for (const n of graphSim.nodes) {
      const isHovered = graphSim.hoveredNode && graphSim.hoveredNode.id === n.id;
      const isActive = n.id === state.activeNoteId;

      // Outer Glow
      ctx.save();
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r + (isHovered || isActive ? 6 : 2), 0, Math.PI * 2);
      ctx.fillStyle = isHovered || isActive ? 'rgba(99, 102, 241, 0.32)' : 'rgba(0, 0, 0, 0.2)';
      ctx.fill();
      ctx.restore();

      // Main Circle
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      ctx.fillStyle = n.color || '#6366f1';
      ctx.fill();
      ctx.lineWidth = isActive ? 3 : 1.5;
      ctx.strokeStyle = isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.4)';
      ctx.stroke();

      // Monospace code badge inside node
      ctx.font = `700 10px JetBrains Mono, monospace`;
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText((n.icon || 'DOC').slice(0, 4), n.x, n.y);

      // Node Label below
      ctx.font = '600 12px Inter, sans-serif';
      ctx.fillStyle = isHovered ? '#ffffff' : '#cbd5e1';
      ctx.fillText(n.title, n.x, n.y + n.r + 15);
    }

    ctx.restore();
  };

  const tick = () => {
    if (state.activeView === 'graph') {
      stepPhysics();
      drawScene();
    }
    graphSim.animId = requestAnimationFrame(tick);
  };

  graphSim.animId = requestAnimationFrame(tick);
}

function setupGraphCanvasInteractions() {
  const canvas = document.getElementById('knowledgeGraphCanvas');
  const tooltip = document.getElementById('graphNodeTooltip');

  const toWorld = (clientX, clientY) => {
    const rect = canvas.getBoundingClientRect();
    const sx = clientX - rect.left;
    const sy = clientY - rect.top;
    return {
      x: (sx - graphSim.panX) / graphSim.zoom,
      y: (sy - graphSim.panY) / graphSim.zoom,
      sx,
      sy
    };
  };

  const findNodeAt = (wx, wy) => {
    for (let i = graphSim.nodes.length - 1; i >= 0; i--) {
      const n = graphSim.nodes[i];
      const dx = wx - n.x;
      const dy = wy - n.y;
      if (dx * dx + dy * dy <= (n.r + 4) * (n.r + 4)) {
        return n;
      }
    }
    return null;
  };

  let downTime = 0;

  canvas.addEventListener('mousedown', e => {
    const pt = toWorld(e.clientX, e.clientY);
    const hit = findNodeAt(pt.x, pt.y);
    downTime = Date.now();
    graphSim.lastMouseX = e.clientX;
    graphSim.lastMouseY = e.clientY;

    if (hit) {
      graphSim.draggingNode = hit;
    } else {
      graphSim.isPanning = true;
    }
  });

  window.addEventListener('mousemove', e => {
    if (state.activeView !== 'graph') return;
    const pt = toWorld(e.clientX, e.clientY);

    if (graphSim.draggingNode) {
      graphSim.draggingNode.x = pt.x;
      graphSim.draggingNode.y = pt.y;
      return;
    }

    if (graphSim.isPanning) {
      graphSim.panX += e.clientX - graphSim.lastMouseX;
      graphSim.panY += e.clientY - graphSim.lastMouseY;
      graphSim.lastMouseX = e.clientX;
      graphSim.lastMouseY = e.clientY;
      return;
    }

    const hit = findNodeAt(pt.x, pt.y);
    graphSim.hoveredNode = hit;
    if (hit) {
      tooltip.classList.remove('hidden');
      tooltip.style.left = `${pt.sx + 16}px`;
      tooltip.style.top = `${pt.sy + 16}px`;
      tooltip.innerHTML = `
        <div style="font-weight:700; margin-bottom:4px;">[${escapeHtml(hit.icon)}] ${escapeHtml(hit.title)}</div>
        <div style="color:var(--text-secondary); font-size:11.5px;">/${escapeHtml(hit.folder)} · ${hit.wordCount} từ · ${hit.degree} liên kết</div>
        <div style="color:var(--accent-indigo); font-size:11px; margin-top:4px;">Click để mở tài liệu →</div>
      `;
    } else {
      tooltip.classList.add('hidden');
    }
  });

  window.addEventListener('mouseup', () => {
    if (graphSim.draggingNode && Date.now() - downTime < 220) {
      state.activeNoteId = graphSim.draggingNode.id;
      switchView('editor');
      renderSidebar();
      renderActiveNote();
    }
    graphSim.draggingNode = null;
    graphSim.isPanning = false;
  });

  canvas.addEventListener('wheel', e => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    graphSim.zoom = Math.min(2.4, Math.max(0.45, graphSim.zoom * factor));
  });
}

/* ============================================================================
 * VIEW 3: ACTION TASKS HUB
 * ============================================================================ */
function renderTasksHub() {
  const container = document.getElementById('tasksHubList');
  const groups = [];

  for (const note of state.notes) {
    let tasks = note.tasks || [];
    if (state.taskFilter === 'pending') tasks = tasks.filter(t => !t.completed);
    if (state.taskFilter === 'done') tasks = tasks.filter(t => t.completed);
    if (tasks.length > 0) {
      groups.push({ note, tasks });
    }
  }

  if (groups.length === 0) {
    container.innerHTML = `<div style="color:var(--text-muted); padding:24px;">Không có nhiệm vụ nào trong bộ lọc này.</div>`;
    return;
  }

  container.innerHTML = groups
    .map(
      ({ note, tasks }) => `
      <div class="task-group-card">
        <div class="task-group-header">
          <div class="task-group-title" data-openNoteId="${note.id}">
            <span class="note-card-icon">${escapeHtml(note.icon || 'DOC')}</span>
            <span>${escapeHtml(note.title)}</span>
          </div>
          <span class="note-folder-pill">${escapeHtml(note.folder)}</span>
        </div>
        <div>
          ${tasks
            .map(
              t => `
            <label class="task-row ${t.completed ? 'done' : ''}">
              <input type="checkbox" data-tasknote="${note.id}" data-taskline="${t.lineIndex}" ${t.completed ? 'checked' : ''} />
              <span>${parseInlineMarkdown(t.text)}</span>
            </label>
          `
            )
            .join('')}
        </div>
      </div>
    `
    )
    .join('');
}

/* ============================================================================
 * VIEW 4: BRAIN ANALYTICS & INSIGHTS
 * ============================================================================ */
function renderInsightsHub() {
  const s = state.stats;
  if (!s) return;

  const taskRate = s.totalTasks > 0 ? Math.round((s.completedTasks / s.totalTasks) * 100) : 0;

  document.getElementById('insightsKpiGrid').innerHTML = `
    <div class="kpi-card">
      <div class="kpi-label">Tổng Tài liệu Tri thức</div>
      <div class="kpi-value">${s.noteCount}</div>
      <div class="kpi-sub">Lưu trữ bền vững trên SQLite</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Liên kết Hai chiều (Wiki-Links)</div>
      <div class="kpi-value">${s.linkCount}</div>
      <div class="kpi-sub">Mạng lưới Zettelkasten</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Tổng Khối lượng Từ vựng</div>
      <div class="kpi-value">${s.totalWords.toLocaleString('vi-VN')}</div>
      <div class="kpi-sub">~${Math.max(1, Math.ceil(s.totalWords / 200))} phút đọc chuyên sâu</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Tỷ lệ Hoàn thành Nhiệm vụ</div>
      <div class="kpi-value">${taskRate}%</div>
      <div class="kpi-sub">${s.completedTasks}/${s.totalTasks} Action Items</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Thời gian Tập trung</div>
      <div class="kpi-value">${s.focus.totalMinutes} <span style="font-size:15px">phút</span></div>
      <div class="kpi-sub">${s.focus.sessionCount} phiên làm việc hoàn tất</div>
    </div>
  `;

  // Folder chart
  const folderEntries = Object.entries(s.folderCounts || {}).sort((a, b) => b[1] - a[1]);
  const maxFolder = Math.max(1, ...folderEntries.map(x => x[1]));
  document.getElementById('folderDistChart').innerHTML = folderEntries
    .map(
      ([name, count]) => `
      <div class="bar-row">
        <div class="bar-label-line">
          <span>/${escapeHtml(name)}</span>
          <span>${count} bài</span>
        </div>
        <div class="bar-track">
          <div class="bar-fill" style="width:${Math.round((count / maxFolder) * 100)}%"></div>
        </div>
      </div>
    `
    )
    .join('');

  // Tag chart
  const tagEntries = Object.entries(s.tagCounts || {}).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const maxTag = Math.max(1, ...tagEntries.map(x => x[1]));
  document.getElementById('tagDistChart').innerHTML = tagEntries
    .map(
      ([name, count]) => `
      <div class="bar-row">
        <div class="bar-label-line">
          <span>#${escapeHtml(name)}</span>
          <span>${count} bài</span>
        </div>
        <div class="bar-track">
          <div class="bar-fill" style="width:${Math.round((count / maxTag) * 100)}%"></div>
        </div>
      </div>
    `
    )
    .join('');

  // Focus sessions
  const focusList = s.focus.recentSessions || [];
  document.getElementById('focusHistoryList').innerHTML = focusList
    .map(
      f => `
      <div class="focus-item">
        <div><strong>${escapeHtml(f.note_title || 'Deep Work Session')}</strong></div>
        <div style="color:var(--accent-emerald); font-family:var(--font-mono)">+${f.duration_minutes} phút · ${new Date(
        f.completed_at
      ).toLocaleDateString('vi-VN')}</div>
      </div>
    `
    )
    .join('');
}

/* ============================================================================
 * VIEW SWITCHING & UI EVENTS
 * ============================================================================ */
function switchView(viewName) {
  state.activeView = viewName;
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === viewName);
  });

  document.getElementById('viewEditor').classList.toggle('active', viewName === 'editor');
  document.getElementById('viewGraph').classList.toggle('active', viewName === 'graph');
  document.getElementById('viewTasks').classList.toggle('active', viewName === 'tasks');
  document.getElementById('viewInsights').classList.toggle('active', viewName === 'insights');

  document.getElementById('editorLayoutGroup').style.display = viewName === 'editor' ? 'flex' : 'none';

  if (viewName === 'graph') initOrUpdateGraph();
  if (viewName === 'tasks') renderTasksHub();
  if (viewName === 'insights') renderInsightsHub();
}

async function openOrCreateWikiLink(targetTitle) {
  const existing = state.notes.find(n => n.title.trim().toLowerCase() === targetTitle.trim().toLowerCase());
  if (existing) {
    state.activeNoteId = existing.id;
    switchView('editor');
    renderSidebar();
    renderActiveNote();
    return;
  }

  // Auto-create linked note if it doesn't exist yet!
  const current = getActiveNote();
  const { note } = await apiFetch('/api/notes', {
    method: 'POST',
    body: JSON.stringify({
      title: targetTitle.trim(),
      icon: 'DOC',
      folder: current ? current.folder : 'Second Brain',
      tags: ['linked-note'],
      content: `# ${targetTitle.trim()}\n\nTài liệu này được khởi tạo tự động từ liên kết hai chiều trong [[${
        current ? current.title : 'MindVault Architecture Hub'
      }]].\n\n## Nội dung chính\n- Viết ý tưởng của bạn tại đây...\n`
    })
  });

  state.activeNoteId = note.id;
  await loadAllData(false);
  switchView('editor');
}

function setupEventListeners() {
  // Mode navigation
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => switchView(btn.dataset.view));
  });

  // Layout switcher (Edit / Split / Preview)
  document.querySelectorAll('.layout-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.layout-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const container = document.getElementById('editorSplitContainer');
      container.className = `editor-split-container layout-${btn.dataset.layout}`;
    });
  });

  // Sidebar search
  document.getElementById('sidebarSearchInput').addEventListener('input', e => {
    state.searchQuery = e.target.value;
    renderSidebar();
  });

  // Favorite filter
  document.getElementById('chkFavoriteOnly').addEventListener('change', e => {
    state.filterFavorite = e.target.checked;
    renderSidebar();
  });

  // Clear filters
  document.getElementById('btnClearFilter').addEventListener('click', () => {
    state.filterFolder = 'ALL';
    state.filterTag = '';
    state.filterFavorite = false;
    state.searchQuery = '';
    document.getElementById('sidebarSearchInput').value = '';
    document.getElementById('chkFavoriteOnly').checked = false;
    renderSidebar();
  });

  // Folder & Tag filter delegation
  document.getElementById('folderList').addEventListener('click', e => {
    const chip = e.target.closest('[data-folder]');
    if (!chip) return;
    const f = chip.dataset.folder;
    state.filterFolder = state.filterFolder === f ? 'ALL' : f;
    renderSidebar();
  });

  document.getElementById('tagList').addEventListener('click', e => {
    const chip = e.target.closest('[data-tag]');
    if (!chip) return;
    const t = chip.dataset.tag;
    state.filterTag = state.filterTag === t ? '' : t;
    renderSidebar();
  });

  // Select note from list
  document.getElementById('notesListContainer').addEventListener('click', e => {
    const card = e.target.closest('[data-noteid]');
    if (!card) return;
    state.activeNoteId = card.dataset.noteid;
    if (state.activeView !== 'editor') switchView('editor');
    renderSidebar();
    renderActiveNote();
  });

  // Create new note
  document.getElementById('btnNewNote').addEventListener('click', async () => {
    const { note } = await apiFetch('/api/notes', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Tài liệu Kỹ thuật Mới',
        icon: 'DOC',
        folder: state.filterFolder !== 'ALL' ? state.filterFolder : 'Second Brain',
        tags: ['draft'],
        content: `# Tài liệu Kỹ thuật Mới\n\nKết nối với [[MindVault Architecture Hub]]...\n\n## Nhiệm vụ cần làm\n- [ ] Phác thảo ý tưởng cốt lõi\n`
      })
    });
    state.activeNoteId = note.id;
    await loadAllData(false);
    switchView('editor');
    document.getElementById('noteTitleInput').focus();
    document.getElementById('noteTitleInput').select();
  });

  // Editor live changes
  document.getElementById('noteTitleInput').addEventListener('input', () => scheduleAutoSave());
  document.getElementById('noteFolderInput').addEventListener('input', () => scheduleAutoSave());
  document.getElementById('noteColorInput').addEventListener('input', () => scheduleAutoSave());

  document.getElementById('noteContentInput').addEventListener('input', e => {
    const note = getActiveNote();
    if (note) {
      note.content = e.target.value;
      updateLivePreviewAndConnections(note);
    }
    scheduleAutoSave();
  });

  // Pin & Favorite toggles
  document.getElementById('btnTogglePin').addEventListener('click', () => {
    const note = getActiveNote();
    if (!note) return;
    scheduleAutoSave({ pinned: !note.pinned });
  });

  document.getElementById('btnToggleFav').addEventListener('click', () => {
    const note = getActiveNote();
    if (!note) return;
    scheduleAutoSave({ favorite: !note.favorite });
  });

  // Delete note
  document.getElementById('btnDeleteNote').addEventListener('click', async () => {
    const note = getActiveNote();
    if (!note) return;
    await apiFetch(`/api/notes/${note.id}`, { method: 'DELETE' });
    state.activeNoteId = null;
    await loadAllData(true);
  });

  // Export single Markdown file
  document.getElementById('btnExportMd').addEventListener('click', () => {
    const note = getActiveNote();
    if (!note) return;
    const blob = new Blob([note.content], { type: 'text/markdown;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${note.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.md`;
    a.click();
  });

  // Export entire vault JSON
  document.getElementById('btnExportVault').addEventListener('click', async () => {
    const data = await apiFetch('/api/export');
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `mindvault-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  });

  // Add & remove tags
  document.getElementById('tagAddInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = e.target.value.trim().replace(/^#/, '');
      const note = getActiveNote();
      if (val && note && !note.tags.includes(val)) {
        const nextTags = [...note.tags, val];
        e.target.value = '';
        scheduleAutoSave({ tags: nextTags });
      }
    }
  });

  document.getElementById('activeNoteTags').addEventListener('click', e => {
    const btn = e.target.closest('[data-removetag]');
    if (!btn) return;
    const note = getActiveNote();
    if (!note) return;
    const nextTags = note.tags.filter(t => t !== btn.dataset.removetag);
    scheduleAutoSave({ tags: nextTags });
  });

  // Markdown formatting quick toolbar
  document.querySelectorAll('.md-tool-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const textarea = document.getElementById('noteContentInput');
      const snippet = btn.dataset.insert.replace(/\\n/g, '\n');
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const val = textarea.value;
      textarea.value = val.slice(0, start) + snippet + val.slice(end);
      textarea.focus();
      textarea.dispatchEvent(new Event('input'));
    });
  });

  // Delegate clicks on Wiki-Links & Checkboxes inside Preview & Connections
  document.getElementById('viewEditor').addEventListener('click', async e => {
    const wiki = e.target.closest('[data-wikilink]');
    if (wiki) {
      e.preventDefault();
      await openOrCreateWikiLink(wiki.dataset.wikilink);
      return;
    }

    const openBtn = e.target.closest('[data-openNoteId]');
    if (openBtn) {
      state.activeNoteId = openBtn.getAttribute('data-openNoteId');
      renderSidebar();
      renderActiveNote();
      return;
    }

    if (e.target.matches('input[type="checkbox"][data-line]')) {
      const note = getActiveNote();
      if (!note) return;
      const lineIndex = Number(e.target.dataset.line);
      await apiFetch('/api/tasks/toggle', {
        method: 'POST',
        body: JSON.stringify({ noteId: note.id, lineIndex })
      });
      await loadAllData(false);
    }
  });

  // Delegate clicks in Action Tasks Hub
  document.getElementById('viewTasks').addEventListener('click', async e => {
    const openBtn = e.target.closest('[data-openNoteId]');
    if (openBtn) {
      state.activeNoteId = openBtn.getAttribute('data-openNoteId');
      switchView('editor');
      renderSidebar();
      renderActiveNote();
      return;
    }

    if (e.target.matches('input[type="checkbox"][data-tasknote]')) {
      const noteId = e.target.dataset.tasknote;
      const lineIndex = Number(e.target.dataset.taskline);
      await apiFetch('/api/tasks/toggle', {
        method: 'POST',
        body: JSON.stringify({ noteId, lineIndex })
      });
      await loadAllData(false);
    }
  });

  document.querySelectorAll('.task-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.task-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      state.taskFilter = tab.dataset.tfilter;
      renderTasksHub();
    });
  });

  // Graph controls
  document.getElementById('btnGraphResetZoom').addEventListener('click', () => {
    graphSim.zoom = 1;
    graphSim.panX = 0;
    graphSim.panY = 0;
    graphSim.repulsionBoost = 1;
  });

  document.getElementById('btnGraphRepulse').addEventListener('click', () => {
    graphSim.repulsionBoost = graphSim.repulsionBoost === 1 ? 2.2 : 1;
  });

  // Badge Label Picker
  const emojiPopover = document.getElementById('emojiPopover');
  emojiPopover.innerHTML = EMOJI_LIST.map(em => `<button class="emoji-choice" data-emoji="${em}">${em}</button>`).join('');

  document.getElementById('btnPickIcon').addEventListener('click', e => {
    const rect = e.currentTarget.getBoundingClientRect();
    emojiPopover.style.left = `${rect.left}px`;
    emojiPopover.style.top = `${rect.bottom + 6}px`;
    emojiPopover.classList.toggle('hidden');
  });

  emojiPopover.addEventListener('click', e => {
    const btn = e.target.closest('[data-emoji]');
    if (!btn) return;
    document.getElementById('btnPickIcon').textContent = btn.dataset.emoji;
    emojiPopover.classList.add('hidden');
    scheduleAutoSave({ icon: btn.dataset.emoji });
  });

  // Templates Modal
  const templatesModal = document.getElementById('templatesModal');
  document.getElementById('templatesList').innerHTML = SMART_TEMPLATES.map(
    (tpl, idx) => `
    <div class="template-card" data-tplidx="${idx}">
      <h4>[${tpl.icon}] ${escapeHtml(tpl.title)}</h4>
      <p>${escapeHtml(tpl.desc)}</p>
    </div>
  `
  ).join('');

  document.getElementById('btnTemplates').addEventListener('click', () => {
    templatesModal.classList.remove('hidden');
  });

  document.getElementById('btnCloseTemplates').addEventListener('click', () => {
    templatesModal.classList.add('hidden');
  });

  document.getElementById('templatesList').addEventListener('click', async e => {
    const card = e.target.closest('[data-tplidx]');
    if (!card) return;
    const tpl = SMART_TEMPLATES[Number(card.dataset.tplidx)];
    templatesModal.classList.add('hidden');

    const { note } = await apiFetch('/api/notes', {
      method: 'POST',
      body: JSON.stringify({
        title: tpl.title,
        icon: tpl.icon,
        folder: tpl.folder,
        color: tpl.color,
        tags: tpl.tags,
        content: tpl.content
      })
    });
    state.activeNoteId = note.id;
    await loadAllData(false);
    switchView('editor');
  });

  // Pomodoro Timer
  const updatePomoUI = () => {
    const m = String(Math.floor(state.pomo.secondsLeft / 60)).padStart(2, '0');
    const s = String(state.pomo.secondsLeft % 60).padStart(2, '0');
    document.getElementById('pomoTimeDisplay').textContent = `${m}:${s}`;
    document.getElementById('btnPomoToggle').textContent = state.pomo.running ? '||' : '▶';
  };

  document.getElementById('btnPomoToggle').addEventListener('click', () => {
    state.pomo.running = !state.pomo.running;
    if (state.pomo.running) {
      state.pomo.interval = setInterval(async () => {
        state.pomo.secondsLeft--;
        if (state.pomo.secondsLeft <= 0) {
          clearInterval(state.pomo.interval);
          state.pomo.running = false;
          state.pomo.secondsLeft = 25 * 60;
          const active = getActiveNote();
          await apiFetch('/api/focus', {
            method: 'POST',
            body: JSON.stringify({
              noteId: active ? active.id : null,
              noteTitle: active ? active.title : 'Deep Work Session',
              durationMinutes: 25
            })
          });
          await loadAllData(false);
        }
        updatePomoUI();
      }, 1000);
    } else {
      clearInterval(state.pomo.interval);
    }
    updatePomoUI();
  });

  document.getElementById('btnPomoReset').addEventListener('click', () => {
    clearInterval(state.pomo.interval);
    state.pomo.running = false;
    state.pomo.secondsLeft = 25 * 60;
    updatePomoUI();
  });

  // Command Palette (Ctrl+K)
  const cmdModal = document.getElementById('cmdPaletteModal');
  const cmdInput = document.getElementById('cmdSearchInput');
  const cmdResults = document.getElementById('cmdResultsList');

  const renderCmdResults = () => {
    const q = cmdInput.value.trim().toLowerCase();
    const matchedNotes = state.notes
      .filter(n => !q || n.title.toLowerCase().includes(q) || n.folder.toLowerCase().includes(q))
      .slice(0, 6);

    cmdResults.innerHTML = matchedNotes
      .map(
        n => `
      <div class="cmd-item" data-cmdnote="${n.id}">
        <span><span class="note-card-icon">${escapeHtml(n.icon)}</span> <strong>${escapeHtml(n.title)}</strong></span>
        <span class="note-folder-pill">${escapeHtml(n.folder)}</span>
      </div>
    `
      )
      .join('');
  };

  window.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      cmdModal.classList.toggle('hidden');
      if (!cmdModal.classList.contains('hidden')) {
        cmdInput.value = '';
        renderCmdResults();
        cmdInput.focus();
      }
    } else if (e.key === 'Escape') {
      cmdModal.classList.add('hidden');
      templatesModal.classList.add('hidden');
      emojiPopover.classList.add('hidden');
    }
  });

  cmdInput.addEventListener('input', renderCmdResults);
  cmdResults.addEventListener('click', e => {
    const item = e.target.closest('[data-cmdnote]');
    if (!item) return;
    state.activeNoteId = item.dataset.cmdnote;
    cmdModal.classList.add('hidden');
    switchView('editor');
    renderSidebar();
    renderActiveNote();
  });

  cmdModal.addEventListener('click', e => {
    if (e.target === cmdModal) cmdModal.classList.add('hidden');
  });
}

/* ============================================================================
 * BOOTSTRAP
 * ============================================================================ */
window.addEventListener('DOMContentLoaded', async () => {
  setupEventListeners();
  setupGraphCanvasInteractions();
  await loadAllData(true);
});
