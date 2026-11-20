/* ============================================================================
 * MindVault v2.0 — Hybrid Second Brain & Knowledge Graph Workspace
 * Runs seamlessly on Node.js SQLite WAL API OR standalone browser localStorage
 * via ./local-engine.js (GitHub Pages Live Demo compatible).
 * ============================================================================ */

(() => {
  'use strict';

  const ICON_BADGES = [
    'CORE', 'SEC', 'RAG', 'ARCH',
    'CODE', 'DATA', 'TASK', 'DOC',
    'IDEA', 'LOG', 'TEST', 'OPS'
  ];

  const NOTE_TEMPLATES = [
    {
      title: 'Architecture Decision Record (ADR)',
      icon: 'ARCH',
      folder: 'Engineering',
      color: '#10b981',
      tags: ['architecture', 'adr', 'system-design'],
      content: `# ADR: Tên quyết định kiến trúc

## Bối cảnh & Vấn đề (Context)
Mô tả bài toán kỹ thuật, ràng buộc về hiệu năng/chi phí/bảo mật.

## Phương án lựa chọn (Decision)
- Giải pháp đã chọn và lý do kỹ thuật cốt lõi
- Tài liệu liên quan: [[MindVault Architecture Hub]]

## Hệ quả & Rủi ro (Consequences)
- [ ] Xác định các điểm nghẽn có thể phát sinh
- [ ] Viết benchmark kiểm thử tải trước khi rollout
`
    },
    {
      title: 'AI & LLM Security Review',
      icon: 'SEC',
      folder: 'AI & Security',
      color: '#ef4444',
      tags: ['security', 'llm', 'owasp'],
      content: `# Đánh giá Bảo mật Mô hình & Dữ liệu

## Bề mặt tấn công (Attack Surface)
- Prompt Injection (Direct / Indirect)
- PII Leakage trong context window
- Unbounded token consumption

## Kiểm soát đề xuất (Mitigations)
- [ ] Bật PII redaction trước khi gửi dữ liệu ra ngoài
- [ ] Áp dụng strict schema validation cho mọi tool output
- [ ] Tham chiếu chuẩn: [[OWASP Top 10 for LLM Apps]]
`
    },
    {
      title: 'Zettelkasten Atomic Note',
      icon: 'CORE',
      folder: 'Second Brain',
      color: '#06b6d4',
      tags: ['zettelkasten', 'atomic-note', 'knowledge'],
      content: `# Ý tưởng Cốt lõi (Atomic Concept)

> *"Viết ngắn gọn một khái niệm duy nhất bằng ngôn từ của chính bạn."*

## Phân tích chi tiết
Diễn giải bản chất vấn đề, tránh sao chép nguyên văn từ nguồn ngoài.

## Liên kết tri thức
- Kết nối với: [[Zettelkasten & Second Brain]]
- Ứng dụng thực tế: [[RAG Pipeline & Vector Search]]
`
    },
    {
      title: 'Weekly Engineering Sprint Review',
      icon: 'OPS',
      folder: 'Productivity',
      color: '#f59e0b',
      tags: ['sprint', 'review', 'planning'],
      content: `# Sprint Review & Deep Work Plan

## Kết quả đạt được tuần này
- [x] Hoàn thiện kiến trúc lõi và benchmark ban đầu
- [ ] Rà soát nợ kỹ thuật và tối ưu bộ nhớ

## Mục tiêu ưu tiên tuần tới
- [ ] Triển khai kiểm thử tự động end-to-end
- [ ] Tham chiếu ghi chú: [[Deep Work & Pomodoro Metrics]]
`
    }
  ];

  const state = {
    runtimeMode: 'browser', // 'sqlite' | 'browser'
    theme: 'dark',
    notes: [],
    activeNoteId: null,
    activeView: 'editor', // 'editor' | 'graph' | 'tasks' | 'insights'
    editorLayout: 'split', // 'edit' | 'split' | 'preview'
    filter: {
      search: '',
      folder: null,
      tag: null,
      favoriteOnly: false
    },
    taskFilter: 'all',
    graphSearch: '',
    stats: null,
    saveTimer: null,
    isSaving: false,
    pomo: {
      totalSeconds: 25 * 60,
      remainingSeconds: 25 * 60,
      running: false,
      timerId: null
    },
    graph: {
      nodes: [],
      edges: [],
      rafId: null,
      panX: 0,
      panY: 0,
      scale: 1,
      draggingNode: null,
      panning: false,
      pointerMoved: false,
      lastX: 0,
      lastY: 0,
      hoveredNode: null,
      initialized: false
    }
  };

  const $ = (id) => document.getElementById(id);

  const el = {
    sidebarPanel: $('sidebarPanel'),
    mobileBackdrop: $('mobileBackdrop'),
    btnMobileMenu: $('btnMobileMenu'),
    brandModeSubtitle: $('brandModeSubtitle'),
    btnNewNote: $('btnNewNote'),
    sidebarSearchInput: $('sidebarSearchInput'),
    modeBtns: Array.from(document.querySelectorAll('.mode-btn')),
    navNoteCount: $('navNoteCount'),
    navLinkCount: $('navLinkCount'),
    navTaskCount: $('navTaskCount'),
    btnClearFilter: $('btnClearFilter'),
    folderList: $('folderList'),
    tagList: $('tagList'),
    chkFavoriteOnly: $('chkFavoriteOnly'),
    notesListContainer: $('notesListContainer'),
    btnTemplates: $('btnTemplates'),
    fileImportVault: $('fileImportVault'),
    btnImportVault: $('btnImportVault'),
    btnExportVault: $('btnExportVault'),
    crumbFolder: $('crumbFolder'),
    crumbTitle: $('crumbTitle'),
    saveStatus: $('saveStatus'),
    btnResetDemo: $('btnResetDemo'),
    btnToggleTheme: $('btnToggleTheme'),
    pomoTimeDisplay: $('pomoTimeDisplay'),
    btnPomoToggle: $('btnPomoToggle'),
    btnPomoReset: $('btnPomoReset'),
    layoutBtns: Array.from(document.querySelectorAll('.layout-btn')),
    views: {
      editor: $('viewEditor'),
      graph: $('viewGraph'),
      tasks: $('viewTasks'),
      insights: $('viewInsights')
    },
    btnPickIcon: $('btnPickIcon'),
    noteTitleInput: $('noteTitleInput'),
    noteFolderInput: $('noteFolderInput'),
    noteColorInput: $('noteColorInput'),
    btnTogglePin: $('btnTogglePin'),
    btnToggleFav: $('btnToggleFav'),
    btnExportMd: $('btnExportMd'),
    btnDeleteNote: $('btnDeleteNote'),
    activeNoteTags: $('activeNoteTags'),
    tagAddInput: $('tagAddInput'),
    mdToolBtns: Array.from(document.querySelectorAll('.md-tool-btn')),
    editorSplitContainer: $('editorSplitContainer'),
    noteContentInput: $('noteContentInput'),
    markdownPreview: $('markdownPreview'),
    outgoingLinksList: $('outgoingLinksList'),
    backlinksList: $('backlinksList'),
    statWords: $('statWords'),
    statReadTime: $('statReadTime'),
    statTasksInNote: $('statTasksInNote'),
    statUpdatedAt: $('statUpdatedAt'),
    graphSearchInput: $('graphSearchInput'),
    btnGraphResetZoom: $('btnGraphResetZoom'),
    btnGraphRepulse: $('btnGraphRepulse'),
    knowledgeGraphCanvas: $('knowledgeGraphCanvas'),
    graphNodeTooltip: $('graphNodeTooltip'),
    tasksHubList: $('tasksHubList'),
    taskTabs: Array.from(document.querySelectorAll('.task-tab')),
    insightsKpiGrid: $('insightsKpiGrid'),
    folderDistChart: $('folderDistChart'),
    tagDistChart: $('tagDistChart'),
    focusHistoryList: $('focusHistoryList'),
    cmdPaletteModal: $('cmdPaletteModal'),
    cmdSearchInput: $('cmdSearchInput'),
    cmdResultsList: $('cmdResultsList'),
    templatesModal: $('templatesModal'),
    templatesList: $('templatesList'),
    btnCloseTemplates: $('btnCloseTemplates'),
    emojiPopover: $('emojiPopover'),
    toastRoot: $('toastRoot')
  };

  /* --------------------------------------------------------------------------
   * Utilities: Toast, Escaping, Relative Dates, Theme
   * ------------------------------------------------------------------------ */

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function showToast(message, tone = 'emerald') {
    if (!el.toastRoot) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    if (tone === 'amber') {
      toast.style.borderLeftColor = 'var(--accent-amber)';
    } else if (tone === 'rose') {
      toast.style.borderLeftColor = 'var(--accent-rose)';
    }
    toast.textContent = message;
    el.toastRoot.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(6px)';
      toast.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
      setTimeout(() => toast.remove(), 220);
    }, 3000);
  }

  function formatRelativeTime(isoString) {
    if (!isoString) return 'Vừa xong';
    const diffSec = Math.max(0, Math.floor((Date.now() - new Date(isoString).getTime()) / 1000));
    if (diffSec < 45) return 'Vừa xong';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)} phút trước`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} giờ trước`;
    return `${Math.floor(diffSec / 86400)} ngày trước`;
  }

  function getSavedTheme() {
    try {
      const saved = localStorage.getItem('mindvault_theme');
      if (saved === 'light' || saved === 'dark') return saved;
    } catch {
      // Ignore storage errors
    }
    return 'dark';
  }

  function applyTheme(theme) {
    const next = theme === 'light' ? 'light' : 'dark';
    state.theme = next;
    document.documentElement.dataset.theme = next;
    if (el.btnToggleTheme) {
      el.btnToggleTheme.textContent = next === 'light' ? 'Giao diện Tối' : 'Giao diện Sáng';
    }
    try {
      localStorage.setItem('mindvault_theme', next);
    } catch {
      // Ignore storage errors
    }
    if (state.activeView === 'graph') {
      drawScene();
    }
  }

  function updateRuntimeIndicators(textOverride) {
    const isSqlite = state.runtimeMode === 'sqlite';
    if (el.brandModeSubtitle) {
      el.brandModeSubtitle.textContent = isSqlite
        ? 'SQLite WAL Engine · v2.0'
        : 'Live Demo (Trình duyệt) · v2.0';
    }
    if (el.saveStatus) {
      if (textOverride) {
        el.saveStatus.textContent = textOverride;
      } else {
        el.saveStatus.textContent = isSqlite
          ? '● Đã đồng bộ SQLite'
          : '● Live Demo (Trình duyệt)';
      }
    }
    if (el.btnResetDemo) {
      el.btnResetDemo.classList.toggle('hidden', isSqlite);
    }
  }

  /* --------------------------------------------------------------------------
   * Hybrid Runtime Detection & REST API Abstraction
   * ------------------------------------------------------------------------ */

  async function detectRuntimeMode() {
    if (window.location.protocol !== 'http:' && window.location.protocol !== 'https:') {
      state.runtimeMode = 'browser';
      updateRuntimeIndicators();
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1400);
    try {
      const res = await fetch('./api/stats', { signal: controller.signal });
      clearTimeout(timer);
      if (res.ok) {
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const data = await res.json();
          if (data && typeof data.noteCount === 'number') {
            state.runtimeMode = 'sqlite';
            updateRuntimeIndicators();
            return;
          }
        }
      }
    } catch {
      clearTimeout(timer);
    }
    state.runtimeMode = 'browser';
    updateRuntimeIndicators();
  }

  async function apiFetch(url, options = {}) {
    if (state.runtimeMode === 'browser') {
      if (!window.MindVaultLocalEngine) {
        throw new Error('Không tìm thấy local-engine.js');
      }
      return window.MindVaultLocalEngine.handle(url, options);
    }

    const endpoint = url.startsWith('./') ? url.slice(1) : url;
    const res = await fetch(endpoint, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || `HTTP ${res.status}`);
    }
    return data;
  }

  /* --------------------------------------------------------------------------
   * Mobile Navigation Drawer
   * ------------------------------------------------------------------------ */

  function openMobileMenu() {
    if (el.sidebarPanel) el.sidebarPanel.classList.add('open');
    if (el.mobileBackdrop) el.mobileBackdrop.classList.remove('hidden');
  }

  function closeMobileMenu() {
    if (el.sidebarPanel) el.sidebarPanel.classList.remove('open');
    if (el.mobileBackdrop) el.mobileBackdrop.classList.add('hidden');
  }

  /* --------------------------------------------------------------------------
   * Data Loading & State Sync
   * ------------------------------------------------------------------------ */

  async function loadVault({ preserveActiveId = true } = {}) {
    const [notesRes, statsRes] = await Promise.all([
      apiFetch('/api/notes'),
      apiFetch('/api/stats')
    ]);
    state.notes = notesRes.notes || [];
    state.stats = statsRes;

    if (!preserveActiveId || !state.notes.some(n => n.id === state.activeNoteId)) {
      state.activeNoteId = state.notes.length ? state.notes[0].id : null;
    }

    renderSidebar();
    renderActiveNote();
    updateNavBadges();
    if (state.activeView === 'tasks') renderTasksHub();
    if (state.activeView === 'insights') renderInsights();
  }

  function getActiveNote() {
    return state.notes.find(n => n.id === state.activeNoteId) || null;
  }

  function replaceNoteInState(updatedNote) {
    const idx = state.notes.findIndex(n => n.id === updatedNote.id);
    if (idx !== -1) {
      state.notes[idx] = updatedNote;
    } else {
      state.notes.unshift(updatedNote);
    }
  }

  function updateNavBadges() {
    const stats = state.stats;
    if (!stats) return;
    if (el.navNoteCount) el.navNoteCount.textContent = String(stats.noteCount || 0);
    if (el.navLinkCount) el.navLinkCount.textContent = String(stats.linkCount || 0);
    if (el.navTaskCount) {
      el.navTaskCount.textContent = `${stats.completedTasks || 0}/${stats.totalTasks || 0}`;
    }
  }

  /* --------------------------------------------------------------------------
   * Sidebar Rendering: Folders, Tags, Filtered Notes List
   * ------------------------------------------------------------------------ */

  function getFilteredNotes() {
    const q = state.filter.search.trim().toLowerCase();
    return state.notes.filter(note => {
      if (state.filter.favoriteOnly && !note.favorite) return false;
      if (state.filter.folder && note.folder !== state.filter.folder) return false;
      if (state.filter.tag && !(note.tags || []).includes(state.filter.tag)) return false;
      if (q) {
        const haystack = [
          note.title,
          note.folder,
          note.content,
          (note.tags || []).join(' ')
        ].join(' ').toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }

  function renderSidebar() {
    // Directories
    if (el.folderList) {
      const folders = new Map();
      state.notes.forEach(n => {
        const f = n.folder || 'Inbox';
        folders.set(f, (folders.get(f) || 0) + 1);
      });
      el.folderList.innerHTML = Array.from(folders.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([folder, count]) => {
          const active = state.filter.folder === folder ? 'active' : '';
          return `<button type="button" class="filter-chip ${active}" data-folder="${escapeHtml(folder)}">${escapeHtml(folder)} <span>${count}</span></button>`;
        })
        .join('');
    }

    // Tags
    if (el.tagList) {
      const tags = new Map();
      state.notes.forEach(n => (n.tags || []).forEach(t => tags.set(t, (tags.get(t) || 0) + 1)));
      el.tagList.innerHTML = Array.from(tags.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 14)
        .map(([tag, count]) => {
          const active = state.filter.tag === tag ? 'active' : '';
          return `<button type="button" class="filter-chip ${active}" data-tag="${escapeHtml(tag)}">#${escapeHtml(tag)} <span>${count}</span></button>`;
        })
        .join('');
    }

    // Notes list
    if (el.notesListContainer) {
      const filtered = getFilteredNotes();
      if (!filtered.length) {
        el.notesListContainer.innerHTML = `
          <div style="padding: 18px 10px; text-align: center; color: var(--text-muted); font-size: 12px;">
            Không có tài liệu khớp bộ lọc.
          </div>`;
        return;
      }

      el.notesListContainer.innerHTML = filtered.map(note => {
        const isActive = note.id === state.activeNoteId ? 'active' : '';
        const cleanExcerpt = (note.content || '')
          .replace(/^#\s+.*(?:\r?\n|$)/, '')
          .replace(/^#+\s*/gm, '')
          .replace(/\[\[([^\]]+)\]\]/g, '$1')
          .replace(/[`*>_-]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 90);
        const pinMark = note.pinned ? '<span style="color:var(--accent-primary-text);">PIN</span>' : '';
        const favMark = note.favorite ? '<span style="color:var(--accent-amber);">★</span>' : '';
        const linkTotal = (note.outgoingLinks?.length || 0) + (note.backlinks?.length || 0);

        return `
          <div class="note-card ${isActive}" data-note-id="${escapeHtml(note.id)}">
            <div class="note-card-top">
              <span class="note-card-icon">${escapeHtml(note.icon || 'DOC')}</span>
              <span class="note-card-title">${escapeHtml(note.title)}</span>
              <div class="note-card-badges">${pinMark}${favMark}</div>
            </div>
            <div class="note-card-excerpt">${escapeHtml(cleanExcerpt || 'Tài liệu trống...')}</div>
            <div class="note-card-meta">
              <span class="note-folder-pill">${escapeHtml(note.folder || 'Inbox')}</span>
              <span>${note.wordCount || 0} từ · ${linkTotal} lk</span>
            </div>
          </div>`;
      }).join('');
    }
  }

  /* --------------------------------------------------------------------------
   * Markdown Parser & Live Preview + Bi-directional Connections
   * ------------------------------------------------------------------------ */

  function parseInlineMarkdown(rawLine) {
    const clean = String(rawLine || '').replace(/[\uE000-\uE002]/g, '');
    const tokens = [];
    const stash = (html) => {
      const idx = tokens.length;
      tokens.push(html);
      return `\uE000${idx}\uE001`;
    };

    const tokenized = clean
      .replace(/`([^`]+)`/g, (_, code) => stash(`<code>${escapeHtml(code)}</code>`))
      .replace(/\[\[([^\]]+)\]\]/g, (_, targetRaw) => {
        const target = targetRaw.trim();
        return stash(
          `<button type="button" class="wiki-link" data-wiki-target="${escapeHtml(target)}">[[${escapeHtml(target)}]]</button>`
        );
      })
      .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (_, label, url) =>
        stash(`<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a>`)
      );

    const formatted = escapeHtml(tokenized)
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>');

    return formatted.replace(/\uE000(\d+)\uE001/g, (_, idx) => tokens[Number(idx)] || '');
  }

  function renderMarkdownToHtml(markdown) {
    const raw = String(markdown || '');
    const codeBlocks = [];

    const withPlaceholders = raw.replace(/```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g, (_, lang, code) => {
      const idx = codeBlocks.length;
      const safeCode = escapeHtml(code.replace(/\n$/, ''));
      const langBadge = lang ? `<div style="font-size:10px;color:var(--text-muted);margin-bottom:6px;text-transform:uppercase;letter-spacing:.06em;">${escapeHtml(lang)}</div>` : '';
      codeBlocks.push(`<pre>${langBadge}<code>${safeCode}</code></pre>`);
      return `@@CODE_BLOCK_${idx}@@`;
    });

    const lines = withPlaceholders.split('\n');
    const out = [];
    let inUl = false;
    let inOl = false;

    const closeLists = () => {
      if (inUl) { out.push('</ul>'); inUl = false; }
      if (inOl) { out.push('</ol>'); inOl = false; }
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      const blockMatch = trimmed.match(/^@@CODE_BLOCK_(\d+)@@$/);
      if (blockMatch) {
        closeLists();
        out.push(codeBlocks[Number(blockMatch[1])]);
        continue;
      }

      if (!trimmed) {
        closeLists();
        continue;
      }

      if (/^---+$/.test(trimmed)) {
        closeLists();
        out.push('<hr />');
        continue;
      }

      // Markdown table row detection
      if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
        closeLists();
        const tableRows = [];
        let j = i;
        while (j < lines.length && lines[j].trim().startsWith('|') && lines[j].trim().endsWith('|')) {
          tableRows.push(lines[j].trim());
          j++;
        }
        if (tableRows.length >= 2 && /^\|(?:\s*:?-{2,}:?\s*\|)+$/.test(tableRows[1])) {
          const splitCells = (row) => row.slice(1, -1).split('|').map(c => c.trim());
          const headers = splitCells(tableRows[0]);
          const bodyRows = tableRows.slice(2).map(splitCells);
          out.push('<table><thead><tr>' + headers.map(h => `<th>${parseInlineMarkdown(h)}</th>`).join('') + '</tr></thead><tbody>');
          bodyRows.forEach(r => {
            out.push('<tr>' + r.map(c => `<td>${parseInlineMarkdown(c)}</td>`).join('') + '</tr>');
          });
          out.push('</tbody></table>');
          i = j - 1;
          continue;
        }
      }

      const headingMatch = line.match(/^(#{1,4})\s+(.+)$/);
      if (headingMatch) {
        closeLists();
        const lvl = headingMatch[1].length;
        out.push(`<h${lvl}>${parseInlineMarkdown(headingMatch[2])}</h${lvl}>`);
        continue;
      }

      const quoteMatch = line.match(/^>\s?(.*)$/);
      if (quoteMatch) {
        closeLists();
        out.push(`<blockquote>${parseInlineMarkdown(quoteMatch[1])}</blockquote>`);
        continue;
      }

      const taskMatch = line.match(/^\s*[-*]\s+\[([ xX])\]\s+(.+)$/);
      if (taskMatch) {
        if (inOl) { out.push('</ol>'); inOl = false; }
        if (!inUl) { out.push('<ul>'); inUl = true; }
        const checked = taskMatch[1].toLowerCase() === 'x';
        out.push(
          `<li class="md-task-item ${checked ? 'done' : ''}">` +
          `<input type="checkbox" data-line-index="${i}" ${checked ? 'checked' : ''} />` +
          `<span>${parseInlineMarkdown(taskMatch[2])}</span>` +
          `</li>`
        );
        continue;
      }

      const ulMatch = line.match(/^\s*[-*]\s+(.+)$/);
      if (ulMatch) {
        if (inOl) { out.push('</ol>'); inOl = false; }
        if (!inUl) { out.push('<ul>'); inUl = true; }
        out.push(`<li>${parseInlineMarkdown(ulMatch[1])}</li>`);
        continue;
      }

      const olMatch = line.match(/^\s*\d+\.\s+(.+)$/);
      if (olMatch) {
        if (inUl) { out.push('</ul>'); inUl = false; }
        if (!inOl) { out.push('<ol>'); inOl = true; }
        out.push(`<li>${parseInlineMarkdown(olMatch[1])}</li>`);
        continue;
      }

      closeLists();
      out.push(`<p>${parseInlineMarkdown(line)}</p>`);
    }

    closeLists();
    return out.join('\n');
  }

  function extractLocalOutgoingLinks(content) {
    const links = new Set();
    const re = /\[\[([^\]]+)\]\]/g;
    let m;
    while ((m = re.exec(content || '')) !== null) {
      if (m[1].trim()) links.add(m[1].trim());
    }
    return Array.from(links);
  }

  function countWords(text) {
    if (!text || !text.trim()) return 0;
    return text.trim().split(/\s+/).length;
  }

  function updateLivePreviewAndConnections() {
    const note = getActiveNote();
    const content = el.noteContentInput ? el.noteContentInput.value : '';

    if (el.markdownPreview) {
      el.markdownPreview.innerHTML = renderMarkdownToHtml(content);
    }

    const words = countWords(content);
    const readMinutes = Math.max(1, Math.ceil(words / 200));
    const taskLines = content.split('\n').filter(l => /^\s*[-*]\s+\[([ xX])\]\s+.+$/.test(l));
    const doneTasks = taskLines.filter(l => /^\s*[-*]\s+\[[xX]\]\s+.+$/.test(l)).length;

    if (el.statWords) el.statWords.textContent = `${words} từ`;
    if (el.statReadTime) el.statReadTime.textContent = `${readMinutes} phút đọc`;
    if (el.statTasksInNote) el.statTasksInNote.textContent = `${doneTasks}/${taskLines.length} nhiệm vụ`;
    if (el.statUpdatedAt && note) el.statUpdatedAt.textContent = formatRelativeTime(note.updatedAt);

    if (!note) return;

    // Outgoing wiki-links
    const outgoing = extractLocalOutgoingLinks(content);
    if (el.outgoingLinksList) {
      if (!outgoing.length) {
        el.outgoingLinksList.innerHTML = '<span style="color:var(--text-muted);font-size:12px;">Chưa có liên kết [[Wiki-Link]]</span>';
      } else {
        el.outgoingLinksList.innerHTML = outgoing.map(target => {
          const exists = state.notes.some(n => n.title.trim().toLowerCase() === target.toLowerCase());
          const statusDot = exists
            ? '<span style="color:var(--accent-primary-text);">●</span>'
            : '<span style="color:var(--accent-amber);">+</span>';
          return `<button type="button" class="conn-chip" data-wiki-target="${escapeHtml(target)}">${statusDot} ${escapeHtml(target)}</button>`;
        }).join('');
      }
    }

    // Backlinks
    if (el.backlinksList) {
      const backlinks = state.notes.filter(n =>
        n.id !== note.id &&
        (n.outgoingLinks || []).some(t => t.toLowerCase() === note.title.trim().toLowerCase())
      );
      if (!backlinks.length) {
        el.backlinksList.innerHTML = '<span style="color:var(--text-muted);font-size:12px;">Chưa có tài liệu nào trỏ về</span>';
      } else {
        el.backlinksList.innerHTML = backlinks.map(b =>
          `<button type="button" class="conn-chip" data-open-note-id="${escapeHtml(b.id)}"><span style="color:var(--accent-primary-text);">${escapeHtml(b.icon || 'DOC')}</span> ${escapeHtml(b.title)}</button>`
        ).join('');
      }
    }
  }

  function renderActiveNoteTags(note) {
    if (!el.activeNoteTags) return;
    if (!note || !(note.tags || []).length) {
      el.activeNoteTags.innerHTML = '';
      return;
    }
    el.activeNoteTags.innerHTML = note.tags.map(tag => `
      <span class="tag-pill">
        #${escapeHtml(tag)}
        <button type="button" data-remove-tag="${escapeHtml(tag)}" title="Xóa thẻ">×</button>
      </span>
    `).join('');
  }

  function renderActiveNote() {
    const note = getActiveNote();
    if (!note) {
      if (el.crumbFolder) el.crumbFolder.textContent = 'Trống';
      if (el.crumbTitle) el.crumbTitle.textContent = 'Chưa chọn tài liệu';
      if (el.noteTitleInput) el.noteTitleInput.value = '';
      if (el.noteContentInput) el.noteContentInput.value = '';
      if (el.markdownPreview) el.markdownPreview.innerHTML = '<p style="color:var(--text-muted);">Hãy nhấn "+ Mới" để tạo tài liệu đầu tiên.</p>';
      renderActiveNoteTags(null);
      return;
    }

    if (el.crumbFolder) el.crumbFolder.textContent = note.folder || 'Inbox';
    if (el.crumbTitle) el.crumbTitle.textContent = note.title || 'Untitled';
    if (el.btnPickIcon) el.btnPickIcon.textContent = note.icon || 'DOC';
    if (el.noteTitleInput) el.noteTitleInput.value = note.title || '';
    if (el.noteFolderInput) el.noteFolderInput.value = note.folder || 'Inbox';
    if (el.noteColorInput) el.noteColorInput.value = note.color || '#10b981';
    if (el.noteContentInput) el.noteContentInput.value = note.content || '';

    if (el.btnTogglePin) {
      el.btnTogglePin.classList.toggle('active', Boolean(note.pinned));
      el.btnTogglePin.textContent = note.pinned ? 'PINNED' : 'PIN';
    }
    if (el.btnToggleFav) {
      el.btnToggleFav.classList.toggle('active', Boolean(note.favorite));
      el.btnToggleFav.textContent = note.favorite ? 'STAR ★' : 'STAR';
    }

    renderActiveNoteTags(note);
    updateLivePreviewAndConnections();
  }

  async function selectNote(noteId, switchToEditor = false) {
    if (state.saveTimer) {
      await flushPendingSave();
    }
    state.activeNoteId = noteId;
    renderSidebar();
    renderActiveNote();
    closeMobileMenu();
    if (switchToEditor) switchView('editor');
  }

  /* --------------------------------------------------------------------------
   * Saving, Creating, Deleting, Exporting, Importing
   * ------------------------------------------------------------------------ */

  function scheduleSave() {
    if (state.saveTimer) clearTimeout(state.saveTimer);
    if (el.saveStatus) el.saveStatus.textContent = '● Đang soạn thảo...';
    state.saveTimer = setTimeout(() => {
      flushPendingSave();
    }, 420);
  }

  async function flushPendingSave() {
    if (state.saveTimer) {
      clearTimeout(state.saveTimer);
      state.saveTimer = null;
    }
    const note = getActiveNote();
    if (!note || state.isSaving) return;

    state.isSaving = true;
    try {
      const payload = {
        title: (el.noteTitleInput?.value || 'Untitled Note').trim() || 'Untitled Note',
        folder: (el.noteFolderInput?.value || 'Inbox').trim() || 'Inbox',
        color: el.noteColorInput?.value || '#10b981',
        content: el.noteContentInput?.value || '',
        tags: note.tags || [],
        icon: note.icon || 'DOC',
        pinned: note.pinned,
        favorite: note.favorite
      };
      const res = await apiFetch(`/api/notes/${encodeURIComponent(note.id)}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      if (res.note) {
        replaceNoteInState(res.note);
        if (el.crumbFolder) el.crumbFolder.textContent = res.note.folder;
        if (el.crumbTitle) el.crumbTitle.textContent = res.note.title;
        if (el.statUpdatedAt) el.statUpdatedAt.textContent = formatRelativeTime(res.note.updatedAt);
      }
      state.stats = await apiFetch('/api/stats');
      updateNavBadges();
      renderSidebar();
      updateRuntimeIndicators();
    } catch (err) {
      updateRuntimeIndicators(`● Lỗi lưu: ${err.message}`);
    } finally {
      state.isSaving = false;
    }
  }

  async function createNewNote(preset = {}) {
    await flushPendingSave();
    const res = await apiFetch('/api/notes', {
      method: 'POST',
      body: JSON.stringify({
        title: preset.title || 'Tài liệu mới',
        icon: preset.icon || 'DOC',
        folder: preset.folder || state.filter.folder || 'Inbox',
        color: preset.color || '#10b981',
        tags: preset.tags || ['note'],
        content: preset.content || `# ${preset.title || 'Tài liệu mới'}\n\nBắt đầu ghi chú hoặc tạo liên kết bằng \`[[MindVault Architecture Hub]]\`...\n\n- [ ] Hành động tiếp theo\n`
      })
    });
    if (res.note) {
      state.filter.folder = null;
      state.filter.tag = null;
      state.filter.search = '';
      if (el.sidebarSearchInput) el.sidebarSearchInput.value = '';
      await loadVault({ preserveActiveId: false });
      state.activeNoteId = res.note.id;
      renderSidebar();
      renderActiveNote();
      switchView('editor');
      el.noteTitleInput?.focus();
      el.noteTitleInput?.select();
      showToast(`Đã tạo: ${res.note.title}`);
    }
  }

  async function openOrCreateWikiTarget(targetTitle) {
    const clean = (targetTitle || '').trim();
    if (!clean) return;
    const match = state.notes.find(n => n.title.trim().toLowerCase() === clean.toLowerCase());
    if (match) {
      await selectNote(match.id, true);
      return;
    }
    await createNewNote({
      title: clean,
      icon: 'CORE',
      folder: getActiveNote()?.folder || 'Second Brain',
      tags: ['linked-note'],
      content: `# ${clean}\n\nTài liệu được khởi tạo từ Wiki-Link trong [[${getActiveNote()?.title || 'MindVault Architecture Hub'}]].\n\n- [ ] Bổ sung nội dung chi tiết cho chủ đề này\n`
    });
  }

  async function deleteActiveNote() {
    const note = getActiveNote();
    if (!note) return;
    if (state.notes.length <= 1) {
      showToast('Cần giữ lại ít nhất 1 tài liệu trong kho.', 'amber');
      return;
    }
    await apiFetch(`/api/notes/${encodeURIComponent(note.id)}`, { method: 'DELETE' });
    showToast(`Đã xóa "${note.title}"`, 'rose');
    await loadVault({ preserveActiveId: false });
  }

  function downloadBlob(filename, content, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function exportActiveMarkdown() {
    const note = getActiveNote();
    if (!note) return;
    const slug = (note.title || 'note')
      .toLowerCase()
      .replace(/[^a-z0-9\u00C0-\u024F\u1E00-\u1EFF]+/gi, '-')
      .replace(/^-|-$/g, '') || 'mindvault-note';
    downloadBlob(`${slug}.md`, el.noteContentInput?.value || note.content || '', 'text/markdown;charset=utf-8');
    showToast(`Đã tải file ${slug}.md`);
  }

  async function exportVaultJson() {
    const payload = await apiFetch('/api/export');
    const date = new Date().toISOString().slice(0, 10);
    downloadBlob(`mindvault-backup-${date}.json`, JSON.stringify(payload, null, 2), 'application/json;charset=utf-8');
    showToast(`Đã sao lưu ${(payload.notes || []).length} tài liệu ra JSON`);
  }

  async function importVaultFile(file) {
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const notes = Array.isArray(parsed) ? parsed : parsed.notes;
      if (!Array.isArray(notes)) {
        throw new Error('File JSON phải chứa mảng notes hợp lệ');
      }
      const res = await apiFetch('/api/import', {
        method: 'POST',
        body: JSON.stringify({ notes })
      });
      await loadVault({ preserveActiveId: true });
      if (state.activeView === 'graph') await refreshGraphData();
      showToast(`Đã nhập thành công ${res.imported || 0} tài liệu`);
    } catch (err) {
      showToast(`Lỗi Import JSON: ${err.message}`, 'rose');
    } finally {
      if (el.fileImportVault) el.fileImportVault.value = '';
    }
  }

  /* --------------------------------------------------------------------------
   * View Switching
   * ------------------------------------------------------------------------ */

  function switchView(viewName) {
    state.activeView = viewName;
    el.modeBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.view === viewName));
    Object.entries(el.views).forEach(([k, section]) => {
      if (section) section.classList.toggle('active', k === viewName);
    });

    if (viewName === 'graph') {
      startGraphView();
    } else {
      stopGraphLoop();
    }
    if (viewName === 'tasks') renderTasksHub();
    if (viewName === 'insights') renderInsights();
    closeMobileMenu();
  }

  function setEditorLayout(layout) {
    state.editorLayout = layout;
    el.layoutBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.layout === layout));
    if (el.editorSplitContainer) {
      el.editorSplitContainer.classList.remove('layout-edit', 'layout-split', 'layout-preview');
      el.editorSplitContainer.classList.add(`layout-${layout}`);
    }
  }

  /* --------------------------------------------------------------------------
   * View 2: Interactive 2D Force-Directed Knowledge Graph + Search Highlight
   * ------------------------------------------------------------------------ */

  async function refreshGraphData() {
    const data = await apiFetch('/api/graph');
    const prevById = new Map(state.graph.nodes.map(n => [n.id, n]));
    const count = Math.max(1, (data.nodes || []).length);

    state.graph.nodes = (data.nodes || []).map((node, idx) => {
      const prev = prevById.get(node.id);
      const angle = (idx / count) * Math.PI * 2;
      const radius = 185 + (idx % 3) * 50;
      return {
        ...node,
        x: prev ? prev.x : Math.cos(angle) * radius,
        y: prev ? prev.y : Math.sin(angle) * radius,
        vx: prev ? prev.vx : 0,
        vy: prev ? prev.vy : 0,
        r: Math.min(26, 12 + Math.sqrt((node.degree || 0) + 1) * 4)
      };
    });

    const nodeById = new Map(state.graph.nodes.map(n => [n.id, n]));
    state.graph.edges = (data.edges || [])
      .map(e => ({
        ...e,
        sourceNode: nodeById.get(e.source),
        targetNode: nodeById.get(e.target)
      }))
      .filter(e => e.sourceNode && e.targetNode);
  }

  function stepPhysics() {
    const nodes = state.graph.nodes;
    const edges = state.graph.edges;
    const len = nodes.length;
    if (!len) return;

    // Pairwise Coulomb repulsion + mild center attraction
    for (let i = 0; i < len; i++) {
      const a = nodes[i];
      if (state.graph.draggingNode === a) continue;
      a.vx += -a.x * 0.0022;
      a.vy += -a.y * 0.0022;

      for (let j = i + 1; j < len; j++) {
        const b = nodes[j];
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        let distSq = dx * dx + dy * dy;
        if (distSq < 16) {
          dx = 2.5;
          dy = 2.5;
          distSq = 12.5;
        }
        const dist = Math.sqrt(distSq);
        const force = 4200 / distSq;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        if (state.graph.draggingNode !== a) {
          a.vx -= fx;
          a.vy -= fy;
        }
        if (state.graph.draggingNode !== b) {
          b.vx += fx;
          b.vy += fy;
        }
      }
    }

    // Spring edges
    for (const edge of edges) {
      const a = edge.sourceNode;
      const b = edge.targetNode;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));
      const targetLen = 185;
      const force = (dist - targetLen) * 0.015;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      if (state.graph.draggingNode !== a) {
        a.vx += fx;
        a.vy += fy;
      }
      if (state.graph.draggingNode !== b) {
        b.vx -= fx;
        b.vy -= fy;
      }
    }

    // Integrate & damp
    for (const node of nodes) {
      if (state.graph.draggingNode === node) continue;
      node.vx *= 0.86;
      node.vy *= 0.86;
      node.x += node.vx;
      node.y += node.vy;
    }
  }

  function resizeGraphCanvas() {
    const canvas = el.knowledgeGraphCanvas;
    if (!canvas || !canvas.parentElement) return null;
    const rect = canvas.parentElement.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(300, Math.floor(rect.width));
    const h = Math.max(240, Math.floor(rect.height));
    if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
    }
    return { canvas, ctx: canvas.getContext('2d'), w, h, dpr };
  }

  function screenToWorld(clientX, clientY) {
    const canvas = el.knowledgeGraphCanvas;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const sx = clientX - rect.left;
    const sy = clientY - rect.top;
    return {
      x: (sx - rect.width / 2 - state.graph.panX) / state.graph.scale,
      y: (sy - rect.height / 2 - state.graph.panY) / state.graph.scale
    };
  }

  function findNodeAt(wx, wy) {
    for (let i = state.graph.nodes.length - 1; i >= 0; i--) {
      const n = state.graph.nodes[i];
      const dx = wx - n.x;
      const dy = wy - n.y;
      if (dx * dx + dy * dy <= (n.r + 6) * (n.r + 6)) {
        return n;
      }
    }
    return null;
  }

  function drawScene() {
    const metrics = resizeGraphCanvas();
    if (!metrics) return;
    const { ctx, w, h, dpr } = metrics;
    const isLight = state.theme === 'light';
    const q = state.graphSearch.trim().toLowerCase();

    const matchedIds = new Set();
    const neighborIds = new Set();
    if (q) {
      state.graph.nodes.forEach(n => {
        const hay = `${n.title} ${n.folder} ${(n.tags || []).join(' ')}`.toLowerCase();
        if (hay.includes(q)) matchedIds.add(n.id);
      });
      state.graph.edges.forEach(e => {
        if (matchedIds.has(e.sourceNode.id)) neighborIds.add(e.targetNode.id);
        if (matchedIds.has(e.targetNode.id)) neighborIds.add(e.sourceNode.id);
      });
    }

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    // Subtle background grid
    ctx.strokeStyle = isLight ? 'rgba(15, 23, 42, 0.05)' : 'rgba(148, 163, 184, 0.06)';
    ctx.lineWidth = 1;
    const grid = 44;
    const offsetX = ((w / 2 + state.graph.panX) % grid + grid) % grid;
    const offsetY = ((h / 2 + state.graph.panY) % grid + grid) % grid;
    ctx.beginPath();
    for (let gx = offsetX; gx < w; gx += grid) {
      ctx.moveTo(gx, 0);
      ctx.lineTo(gx, h);
    }
    for (let gy = offsetY; gy < h; gy += grid) {
      ctx.moveTo(0, gy);
      ctx.lineTo(w, gy);
    }
    ctx.stroke();

    ctx.translate(w / 2 + state.graph.panX, h / 2 + state.graph.panY);
    ctx.scale(state.graph.scale, state.graph.scale);

    const focusNode = state.graph.hoveredNode;

    // Edges
    for (const edge of state.graph.edges) {
      const a = edge.sourceNode;
      const b = edge.targetNode;
      const isHoverConnected = focusNode && (a.id === focusNode.id || b.id === focusNode.id);
      const isSearchConnected = !q || matchedIds.has(a.id) || matchedIds.has(b.id);

      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);

      if (isHoverConnected) {
        ctx.strokeStyle = isLight ? 'rgba(5, 150, 105, 0.85)' : 'rgba(16, 185, 129, 0.85)';
        ctx.lineWidth = 2.2;
      } else if (!isSearchConnected) {
        ctx.strokeStyle = isLight ? 'rgba(15, 23, 42, 0.06)' : 'rgba(148, 163, 184, 0.06)';
        ctx.lineWidth = 1;
      } else {
        ctx.strokeStyle = isLight ? 'rgba(71, 85, 105, 0.28)' : 'rgba(148, 163, 184, 0.26)';
        ctx.lineWidth = 1.3;
      }
      ctx.stroke();
    }

    // Nodes
    for (const node of state.graph.nodes) {
      const isActive = node.id === state.activeNoteId;
      const isHovered = focusNode && focusNode.id === node.id;
      let alpha = 1;
      if (q) {
        if (matchedIds.has(node.id)) alpha = 1;
        else if (neighborIds.has(node.id)) alpha = 0.55;
        else alpha = 0.16;
      }

      ctx.save();
      ctx.globalAlpha = alpha;

      if (isActive || isHovered || (q && matchedIds.has(node.id))) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.r + 6, 0, Math.PI * 2);
        ctx.fillStyle = isLight ? 'rgba(5, 150, 105, 0.18)' : 'rgba(16, 185, 129, 0.24)';
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(node.x, node.y, node.r, 0, Math.PI * 2);
      ctx.fillStyle = node.color || '#10b981';
      ctx.fill();
      ctx.lineWidth = isActive || isHovered ? 2.5 : 1.5;
      ctx.strokeStyle = isLight ? '#ffffff' : '#090c11';
      ctx.stroke();

      // Short code inside node
      ctx.fillStyle = '#ffffff';
      ctx.font = '700 8.5px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(node.icon || 'DOC').slice(0, 4), node.x, node.y);

      // Node title below circle
      ctx.font = `${isActive || isHovered ? '600' : '500'} 11.5px "Plus Jakarta Sans", sans-serif`;
      ctx.fillStyle = isLight ? '#0f172a' : '#e2e8f0';
      ctx.fillText(node.title, node.x, node.y + node.r + 13);

      ctx.restore();
    }

    ctx.restore();
  }

  function startGraphLoop() {
    if (state.graph.rafId) return;
    const tick = () => {
      if (state.activeView !== 'graph') {
        state.graph.rafId = null;
        return;
      }
      stepPhysics();
      drawScene();
      state.graph.rafId = requestAnimationFrame(tick);
    };
    state.graph.rafId = requestAnimationFrame(tick);
  }

  function stopGraphLoop() {
    if (state.graph.rafId) {
      cancelAnimationFrame(state.graph.rafId);
      state.graph.rafId = null;
    }
  }

  async function startGraphView() {
    await refreshGraphData();
    startGraphLoop();
  }

  function setupGraphEvents() {
    const canvas = el.knowledgeGraphCanvas;
    if (!canvas || state.graph.initialized) return;
    state.graph.initialized = true;

    canvas.addEventListener('mousedown', (e) => {
      const world = screenToWorld(e.clientX, e.clientY);
      const hit = findNodeAt(world.x, world.y);
      state.graph.pointerMoved = false;
      state.graph.lastX = e.clientX;
      state.graph.lastY = e.clientY;
      if (hit) {
        state.graph.draggingNode = hit;
      } else {
        state.graph.panning = true;
      }
    });

    window.addEventListener('mousemove', (e) => {
      if (state.activeView !== 'graph') return;
      const dx = e.clientX - state.graph.lastX;
      const dy = e.clientY - state.graph.lastY;
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
        state.graph.pointerMoved = true;
      }
      state.graph.lastX = e.clientX;
      state.graph.lastY = e.clientY;

      if (state.graph.draggingNode) {
        const world = screenToWorld(e.clientX, e.clientY);
        state.graph.draggingNode.x = world.x;
        state.graph.draggingNode.y = world.y;
        state.graph.draggingNode.vx = 0;
        state.graph.draggingNode.vy = 0;
        return;
      }

      if (state.graph.panning) {
        state.graph.panX += dx;
        state.graph.panY += dy;
        return;
      }

      const world = screenToWorld(e.clientX, e.clientY);
      const hit = findNodeAt(world.x, world.y);
      state.graph.hoveredNode = hit;
      if (el.graphNodeTooltip) {
        if (hit) {
          const rect = canvas.getBoundingClientRect();
          el.graphNodeTooltip.innerHTML = `
            <div style="font-weight:700;color:var(--text-primary);margin-bottom:3px;">${escapeHtml(hit.title)}</div>
            <div style="font-size:11px;color:var(--accent-primary-text);font-family:var(--font-mono);margin-bottom:4px;">${escapeHtml(hit.folder)} · ${hit.wordCount || 0} từ · ${hit.degree || 0} kết nối</div>
            <div style="font-size:11px;color:var(--text-secondary);">${(hit.tags || []).map(t => `#${escapeHtml(t)}`).join(' ')}</div>
          `;
          el.graphNodeTooltip.style.left = `${Math.min(rect.width - 230, Math.max(12, e.clientX - rect.left + 14))}px`;
          el.graphNodeTooltip.style.top = `${Math.min(rect.height - 90, Math.max(12, e.clientY - rect.top + 14))}px`;
          el.graphNodeTooltip.classList.remove('hidden');
          canvas.style.cursor = 'pointer';
        } else {
          el.graphNodeTooltip.classList.add('hidden');
          canvas.style.cursor = 'grab';
        }
      }
    });

    window.addEventListener('mouseup', () => {
      if (state.graph.draggingNode && !state.graph.pointerMoved) {
        selectNote(state.graph.draggingNode.id, true);
      }
      state.graph.draggingNode = null;
      state.graph.panning = false;
    });

    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.1 : 0.9;
      state.graph.scale = Math.min(2.6, Math.max(0.4, state.graph.scale * factor));
    }, { passive: false });
  }

  /* --------------------------------------------------------------------------
   * View 3: Action Tasks Hub
   * ------------------------------------------------------------------------ */

  function renderTasksHub() {
    if (!el.tasksHubList) return;
    const filter = state.taskFilter;
    const groups = [];

    for (const note of state.notes) {
      const tasks = (note.tasks || []).filter(t => {
        if (filter === 'pending') return !t.completed;
        if (filter === 'done') return t.completed;
        return true;
      });
      if (tasks.length) {
        groups.push({ note, tasks });
      }
    }

    if (!groups.length) {
      el.tasksHubList.innerHTML = `
        <div class="task-group-card">
          <div style="color:var(--text-secondary);font-size:13px;">
            Không có nhiệm vụ nào ở bộ lọc hiện tại. Dùng cú pháp <code>- [ ] Việc cần làm</code> trong ghi chú để tự động tổng hợp vào đây.
          </div>
        </div>`;
      return;
    }

    el.tasksHubList.innerHTML = groups.map(({ note, tasks }) => {
      const done = tasks.filter(t => t.completed).length;
      return `
        <div class="task-group-card">
          <div class="task-group-header">
            <div class="task-group-title" data-open-note-id="${escapeHtml(note.id)}">
              <span class="note-card-icon">${escapeHtml(note.icon || 'DOC')}</span>
              <span>${escapeHtml(note.title)}</span>
            </div>
            <span class="badge">${done}/${tasks.length}</span>
          </div>
          <div>
            ${tasks.map(t => `
              <label class="task-row ${t.completed ? 'done' : ''}">
                <input type="checkbox" data-task-note="${escapeHtml(note.id)}" data-task-line="${t.lineIndex}" ${t.completed ? 'checked' : ''} />
                <span>${escapeHtml(t.text)}</span>
              </label>
            `).join('')}
          </div>
        </div>`;
    }).join('');
  }

  /* --------------------------------------------------------------------------
   * View 4: Insights & Focus Metrics
   * ------------------------------------------------------------------------ */

  function renderBarList(container, countsObj, maxBars = 6) {
    if (!container) return;
    const entries = Object.entries(countsObj || {}).sort((a, b) => b[1] - a[1]).slice(0, maxBars);
    if (!entries.length) {
      container.innerHTML = '<div style="color:var(--text-muted);font-size:12px;">Chưa có dữ liệu thống kê.</div>';
      return;
    }
    const maxVal = Math.max(1, entries[0][1]);
    container.innerHTML = entries.map(([label, val]) => `
      <div class="bar-row">
        <div class="bar-label-line">
          <span>${escapeHtml(label)}</span>
          <span style="font-family:var(--font-mono);color:var(--text-secondary);">${val}</span>
        </div>
        <div class="bar-track">
          <div class="bar-fill" style="width:${Math.round((val / maxVal) * 100)}%"></div>
        </div>
      </div>
    `).join('');
  }

  function renderInsights() {
    const s = state.stats;
    if (!s || !el.insightsKpiGrid) return;

    const completionRate = s.totalTasks ? Math.round((s.completedTasks / s.totalTasks) * 100) : 0;
    const focus = s.focus || { totalMinutes: 0, sessionCount: 0, recentSessions: [] };

    el.insightsKpiGrid.innerHTML = `
      <div class="kpi-card">
        <div class="kpi-label">Tổng tài liệu tri thức</div>
        <div class="kpi-value">${s.noteCount || 0}</div>
        <div class="kpi-sub">${s.totalWords || 0} từ đã biên soạn</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Mật độ liên kết Zettelkasten</div>
        <div class="kpi-value">${s.linkCount || 0}</div>
        <div class="kpi-sub">Cạnh liên kết hai chiều trên Đồ thị</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Tiến độ Action Tasks</div>
        <div class="kpi-value">${completionRate}%</div>
        <div class="kpi-sub">${s.completedTasks || 0} / ${s.totalTasks || 0} nhiệm vụ hoàn tất</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Thời lượng Deep Work</div>
        <div class="kpi-value">${focus.totalMinutes || 0}p</div>
        <div class="kpi-sub">${focus.sessionCount || 0} phiên Pomodoro ghi nhận</div>
      </div>
    `;

    renderBarList(el.folderDistChart, s.folderCounts, 6);
    const prefixedTags = {};
    Object.entries(s.tagCounts || {}).forEach(([k, v]) => {
      prefixedTags[`#${k}`] = v;
    });
    renderBarList(el.tagDistChart, prefixedTags, 6);

    if (el.focusHistoryList) {
      const sessions = focus.recentSessions || [];
      if (!sessions.length) {
        el.focusHistoryList.innerHTML = '<div style="color:var(--text-muted);font-size:12px;">Chưa có phiên Pomodoro nào hoàn tất.</div>';
      } else {
        el.focusHistoryList.innerHTML = sessions.map(item => `
          <div class="focus-item">
            <div>
              <strong>${escapeHtml(item.note_title || 'Deep Work Session')}</strong>
              <span style="color:var(--text-muted);margin-left:8px;font-size:11.5px;">${formatRelativeTime(item.completed_at)}</span>
            </div>
            <span class="badge badge-amber">${item.duration_minutes || 25} phút</span>
          </div>
        `).join('');
      }
    }
  }

  /* --------------------------------------------------------------------------
   * Pomodoro Timer
   * ------------------------------------------------------------------------ */

  function renderPomodoro() {
    if (!el.pomoTimeDisplay) return;
    const min = Math.floor(state.pomo.remainingSeconds / 60);
    const sec = state.pomo.remainingSeconds % 60;
    el.pomoTimeDisplay.textContent = `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    if (el.btnPomoToggle) {
      el.btnPomoToggle.textContent = state.pomo.running ? '❚❚' : '▶';
    }
  }

  async function completePomodoroSession() {
    clearInterval(state.pomo.timerId);
    state.pomo.timerId = null;
    state.pomo.running = false;
    state.pomo.remainingSeconds = state.pomo.totalSeconds;
    renderPomodoro();

    const active = getActiveNote();
    try {
      const res = await apiFetch('/api/focus', {
        method: 'POST',
        body: JSON.stringify({
          noteId: active?.id || null,
          noteTitle: active?.title || 'Deep Work Session',
          durationMinutes: 25
        })
      });
      if (res.stats) state.stats = res.stats;
      if (state.activeView === 'insights') renderInsights();
      showToast('Hoàn tất phiên Pomodoro 25 phút!');
    } catch (err) {
      showToast(`Không thể lưu phiên Pomodoro: ${err.message}`, 'amber');
    }
  }

  function togglePomodoro() {
    if (state.pomo.running) {
      clearInterval(state.pomo.timerId);
      state.pomo.timerId = null;
      state.pomo.running = false;
      renderPomodoro();
      return;
    }
    state.pomo.running = true;
    renderPomodoro();
    state.pomo.timerId = setInterval(() => {
      if (state.pomo.remainingSeconds <= 1) {
        completePomodoroSession();
        return;
      }
      state.pomo.remainingSeconds--;
      renderPomodoro();
    }, 1000);
  }

  function resetPomodoro() {
    clearInterval(state.pomo.timerId);
    state.pomo.timerId = null;
    state.pomo.running = false;
    state.pomo.remainingSeconds = state.pomo.totalSeconds;
    renderPomodoro();
  }

  /* --------------------------------------------------------------------------
   * Command Palette, Templates & Icon Badge Popover
   * ------------------------------------------------------------------------ */

  function openCommandPalette() {
    if (!el.cmdPaletteModal) return;
    el.cmdPaletteModal.classList.remove('hidden');
    if (el.cmdSearchInput) {
      el.cmdSearchInput.value = '';
      renderCommandResults('');
      el.cmdSearchInput.focus();
    }
  }

  function closeCommandPalette() {
    if (el.cmdPaletteModal) el.cmdPaletteModal.classList.add('hidden');
  }

  function renderCommandResults(query) {
    if (!el.cmdResultsList) return;
    const q = (query || '').trim().toLowerCase();
    const matches = state.notes.filter(n =>
      !q ||
      n.title.toLowerCase().includes(q) ||
      (n.folder || '').toLowerCase().includes(q) ||
      (n.tags || []).some(t => t.toLowerCase().includes(q))
    );
    if (!matches.length) {
      el.cmdResultsList.innerHTML = `
        <div class="cmd-item" data-create-from-cmd="${escapeHtml(query.trim())}">
          <span>+ Tạo nhanh tài liệu "${escapeHtml(query.trim() || 'Tài liệu mới')}"</span>
          <span class="badge badge-emerald">Enter</span>
        </div>`;
      return;
    }
    el.cmdResultsList.innerHTML = matches.slice(0, 12).map(n => `
      <div class="cmd-item" data-cmd-note-id="${escapeHtml(n.id)}">
        <div style="display:flex;align-items:center;gap:10px;">
          <span class="note-card-icon">${escapeHtml(n.icon || 'DOC')}</span>
          <span>${escapeHtml(n.title)}</span>
        </div>
        <span class="note-folder-pill">${escapeHtml(n.folder || 'Inbox')}</span>
      </div>
    `).join('');
  }

  function openTemplatesModal() {
    if (!el.templatesModal || !el.templatesList) return;
    el.templatesList.innerHTML = NOTE_TEMPLATES.map((tpl, idx) => `
      <div class="template-card" data-template-idx="${idx}">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
          <span class="note-card-icon">${escapeHtml(tpl.icon)}</span>
          <span class="note-folder-pill">${escapeHtml(tpl.folder)}</span>
        </div>
        <h4>${escapeHtml(tpl.title)}</h4>
        <p>${escapeHtml(tpl.tags.map(t => `#${t}`).join(' '))}</p>
      </div>
    `).join('');
    el.templatesModal.classList.remove('hidden');
  }

  function closeTemplatesModal() {
    if (el.templatesModal) el.templatesModal.classList.add('hidden');
  }

  function toggleIconPopover() {
    if (!el.emojiPopover || !el.btnPickIcon) return;
    if (!el.emojiPopover.classList.contains('hidden')) {
      el.emojiPopover.classList.add('hidden');
      return;
    }
    const rect = el.btnPickIcon.getBoundingClientRect();
    el.emojiPopover.innerHTML = ICON_BADGES.map(code =>
      `<button type="button" class="emoji-choice" data-icon-code="${code}">${code}</button>`
    ).join('');
    el.emojiPopover.style.left = `${Math.min(window.innerWidth - 240, rect.left)}px`;
    el.emojiPopover.style.top = `${rect.bottom + 6}px`;
    el.emojiPopover.classList.remove('hidden');
  }

  /* --------------------------------------------------------------------------
   * Event Listeners Wiring
   * ------------------------------------------------------------------------ */

  function bindEvents() {
    if (el.btnMobileMenu) el.btnMobileMenu.addEventListener('click', openMobileMenu);
    if (el.mobileBackdrop) el.mobileBackdrop.addEventListener('click', closeMobileMenu);

    if (el.btnToggleTheme) {
      el.btnToggleTheme.addEventListener('click', () => {
        applyTheme(state.theme === 'dark' ? 'light' : 'dark');
      });
    }

    if (el.btnResetDemo) {
      el.btnResetDemo.addEventListener('click', async () => {
        if (!window.MindVaultLocalEngine) return;
        window.MindVaultLocalEngine.resetDemo();
        await loadVault({ preserveActiveId: false });
        if (state.activeView === 'graph') await refreshGraphData();
        showToast('Đã khôi phục 6 tài liệu mẫu mặc định');
      });
    }

    if (el.btnNewNote) {
      el.btnNewNote.addEventListener('click', () => createNewNote());
    }

    if (el.sidebarSearchInput) {
      el.sidebarSearchInput.addEventListener('input', (e) => {
        state.filter.search = e.target.value;
        renderSidebar();
      });
    }

    el.modeBtns.forEach(btn => {
      btn.addEventListener('click', () => switchView(btn.dataset.view));
    });

    el.layoutBtns.forEach(btn => {
      btn.addEventListener('click', () => setEditorLayout(btn.dataset.layout));
    });

    if (el.btnClearFilter) {
      el.btnClearFilter.addEventListener('click', () => {
        state.filter.folder = null;
        state.filter.tag = null;
        state.filter.favoriteOnly = false;
        state.filter.search = '';
        if (el.sidebarSearchInput) el.sidebarSearchInput.value = '';
        if (el.chkFavoriteOnly) el.chkFavoriteOnly.checked = false;
        renderSidebar();
      });
    }

    if (el.chkFavoriteOnly) {
      el.chkFavoriteOnly.addEventListener('change', (e) => {
        state.filter.favoriteOnly = e.target.checked;
        renderSidebar();
      });
    }

    if (el.folderList) {
      el.folderList.addEventListener('click', (e) => {
        const chip = e.target.closest('[data-folder]');
        if (!chip) return;
        const folder = chip.dataset.folder;
        state.filter.folder = state.filter.folder === folder ? null : folder;
        renderSidebar();
      });
    }

    if (el.tagList) {
      el.tagList.addEventListener('click', (e) => {
        const chip = e.target.closest('[data-tag]');
        if (!chip) return;
        const tag = chip.dataset.tag;
        state.filter.tag = state.filter.tag === tag ? null : tag;
        renderSidebar();
      });
    }

    if (el.notesListContainer) {
      el.notesListContainer.addEventListener('click', (e) => {
        const card = e.target.closest('[data-note-id]');
        if (!card) return;
        selectNote(card.dataset.noteId, true);
      });
    }

    // Editor inputs & autosave
    [el.noteTitleInput, el.noteFolderInput, el.noteColorInput].forEach(input => {
      if (!input) return;
      input.addEventListener('input', () => scheduleSave());
    });

    if (el.noteContentInput) {
      el.noteContentInput.addEventListener('input', () => {
        updateLivePreviewAndConnections();
        scheduleSave();
      });
    }

    // Markdown toolbar snippets
    el.mdToolBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const ta = el.noteContentInput;
        if (!ta) return;
        const snippet = (btn.dataset.insert || '').replace(/\\n/g, '\n');
        const start = ta.selectionStart ?? ta.value.length;
        const end = ta.selectionEnd ?? ta.value.length;
        ta.value = ta.value.slice(0, start) + snippet + ta.value.slice(end);
        ta.focus();
        ta.selectionStart = ta.selectionEnd = start + snippet.length;
        updateLivePreviewAndConnections();
        scheduleSave();
      });
    });

    // Tags add/remove on active note
    if (el.tagAddInput) {
      el.tagAddInput.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        const note = getActiveNote();
        const rawTag = el.tagAddInput.value.trim().replace(/^#+/, '').toLowerCase();
        if (!note || !rawTag) return;
        if (!note.tags.includes(rawTag)) {
          note.tags.push(rawTag);
          renderActiveNoteTags(note);
          flushPendingSave();
        }
        el.tagAddInput.value = '';
      });
    }

    if (el.activeNoteTags) {
      el.activeNoteTags.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-remove-tag]');
        const note = getActiveNote();
        if (!btn || !note) return;
        const tagToRemove = btn.dataset.removeTag;
        note.tags = (note.tags || []).filter(t => t !== tagToRemove);
        renderActiveNoteTags(note);
        flushPendingSave();
      });
    }

    // Pin, Fav, Delete, Export MD
    if (el.btnTogglePin) {
      el.btnTogglePin.addEventListener('click', () => {
        const note = getActiveNote();
        if (!note) return;
        note.pinned = !note.pinned;
        renderActiveNote();
        flushPendingSave();
      });
    }

    if (el.btnToggleFav) {
      el.btnToggleFav.addEventListener('click', () => {
        const note = getActiveNote();
        if (!note) return;
        note.favorite = !note.favorite;
        renderActiveNote();
        flushPendingSave();
      });
    }

    if (el.btnExportMd) el.btnExportMd.addEventListener('click', exportActiveMarkdown);
    if (el.btnDeleteNote) el.btnDeleteNote.addEventListener('click', deleteActiveNote);

    // Preview checkbox toggle & wiki-links
    if (el.markdownPreview) {
      el.markdownPreview.addEventListener('change', async (e) => {
        const cb = e.target.closest('input[type="checkbox"][data-line-index]');
        const note = getActiveNote();
        if (!cb || !note) return;
        const lineIndex = Number(cb.dataset.lineIndex);
        const res = await apiFetch('/api/tasks/toggle', {
          method: 'POST',
          body: JSON.stringify({ noteId: note.id, lineIndex })
        });
        if (res.note) {
          replaceNoteInState(res.note);
          if (el.noteContentInput) el.noteContentInput.value = res.note.content;
          updateLivePreviewAndConnections();
          state.stats = await apiFetch('/api/stats');
          updateNavBadges();
        }
      });

      el.markdownPreview.addEventListener('click', (e) => {
        const link = e.target.closest('[data-wiki-target]');
        if (!link) return;
        openOrCreateWikiTarget(link.dataset.wikiTarget);
      });
    }

    [el.outgoingLinksList, el.backlinksList].forEach(box => {
      if (!box) return;
      box.addEventListener('click', (e) => {
        const wikiBtn = e.target.closest('[data-wiki-target]');
        if (wikiBtn) return openOrCreateWikiTarget(wikiBtn.dataset.wikiTarget);
        const noteBtn = e.target.closest('[data-open-note-id]');
        if (noteBtn) return selectNote(noteBtn.dataset.openNoteId, true);
      });
    });

    // Graph controls
    if (el.graphSearchInput) {
      el.graphSearchInput.addEventListener('input', (e) => {
        state.graphSearch = e.target.value;
        drawScene();
      });
    }

    if (el.btnGraphResetZoom) {
      el.btnGraphResetZoom.addEventListener('click', () => {
        state.graph.panX = 0;
        state.graph.panY = 0;
        state.graph.scale = 1;
        drawScene();
      });
    }

    if (el.btnGraphRepulse) {
      el.btnGraphRepulse.addEventListener('click', () => {
        state.graph.nodes.forEach(n => {
          n.vx += (Math.random() - 0.5) * 14;
          n.vy += (Math.random() - 0.5) * 14;
        });
      });
    }

    // Tasks Hub filtering & toggling
    el.taskTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        state.taskFilter = tab.dataset.tfilter;
        el.taskTabs.forEach(t => t.classList.toggle('active', t === tab));
        renderTasksHub();
      });
    });

    if (el.tasksHubList) {
      el.tasksHubList.addEventListener('change', async (e) => {
        const cb = e.target.closest('input[type="checkbox"][data-task-note]');
        if (!cb) return;
        const noteId = cb.dataset.taskNote;
        const lineIndex = Number(cb.dataset.taskLine);
        const res = await apiFetch('/api/tasks/toggle', {
          method: 'POST',
          body: JSON.stringify({ noteId, lineIndex })
        });
        if (res.note) {
          replaceNoteInState(res.note);
          if (noteId === state.activeNoteId) renderActiveNote();
          state.stats = await apiFetch('/api/stats');
          updateNavBadges();
          renderTasksHub();
        }
      });

      el.tasksHubList.addEventListener('click', (e) => {
        const titleEl = e.target.closest('[data-open-note-id]');
        if (titleEl) selectNote(titleEl.dataset.openNoteId, true);
      });
    }

    // Pomodoro & Sidebar Footer actions
    if (el.btnPomoToggle) el.btnPomoToggle.addEventListener('click', togglePomodoro);
    if (el.btnPomoReset) el.btnPomoReset.addEventListener('click', resetPomodoro);
    if (el.btnExportVault) el.btnExportVault.addEventListener('click', exportVaultJson);
    if (el.btnImportVault && el.fileImportVault) {
      el.btnImportVault.addEventListener('click', () => el.fileImportVault.click());
      el.fileImportVault.addEventListener('change', (e) => importVaultFile(e.target.files?.[0]));
    }

    // Templates modal
    if (el.btnTemplates) el.btnTemplates.addEventListener('click', openTemplatesModal);
    if (el.btnCloseTemplates) el.btnCloseTemplates.addEventListener('click', closeTemplatesModal);
    if (el.templatesModal) {
      el.templatesModal.addEventListener('click', (e) => {
        if (e.target === el.templatesModal) closeTemplatesModal();
        const card = e.target.closest('[data-template-idx]');
        if (card) {
          const tpl = NOTE_TEMPLATES[Number(card.dataset.templateIdx)];
          closeTemplatesModal();
          if (tpl) createNewNote(tpl);
        }
      });
    }

    // Command palette
    if (el.cmdPaletteModal) {
      el.cmdPaletteModal.addEventListener('click', (e) => {
        if (e.target === el.cmdPaletteModal) closeCommandPalette();
        const item = e.target.closest('[data-cmd-note-id]');
        if (item) {
          closeCommandPalette();
          selectNote(item.dataset.cmdNoteId, true);
        }
        const createItem = e.target.closest('[data-create-from-cmd]');
        if (createItem) {
          closeCommandPalette();
          createNewNote({ title: createItem.dataset.createFromCmd || 'Tài liệu mới' });
        }
      });
    }

    if (el.cmdSearchInput) {
      el.cmdSearchInput.addEventListener('input', (e) => renderCommandResults(e.target.value));
      el.cmdSearchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          const first = el.cmdResultsList?.querySelector('.cmd-item');
          first?.click();
        }
      });
    }

    // Icon badge picker popover
    if (el.btnPickIcon) {
      el.btnPickIcon.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleIconPopover();
      });
    }

    if (el.emojiPopover) {
      el.emojiPopover.addEventListener('click', (e) => {
        const choice = e.target.closest('[data-icon-code]');
        const note = getActiveNote();
        if (!choice || !note) return;
        note.icon = choice.dataset.iconCode;
        el.emojiPopover.classList.add('hidden');
        renderActiveNote();
        flushPendingSave();
      });
    }

    document.addEventListener('click', (e) => {
      if (el.emojiPopover && !el.emojiPopover.contains(e.target) && e.target !== el.btnPickIcon) {
        el.emojiPopover.classList.add('hidden');
      }
    });

    // Global keyboard shortcuts
    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        openCommandPalette();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        flushPendingSave();
        showToast('Đã đồng bộ ghi chú hiện tại');
      } else if (e.key === 'Escape') {
        closeCommandPalette();
        closeTemplatesModal();
        closeMobileMenu();
        el.emojiPopover?.classList.add('hidden');
      }
    });
  }

  /* --------------------------------------------------------------------------
   * Bootstrap
   * ------------------------------------------------------------------------ */

  async function init() {
    applyTheme(getSavedTheme());
    bindEvents();
    setupGraphEvents();
    renderPomodoro();
    await detectRuntimeMode();
    await loadVault({ preserveActiveId: false });
  }

  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', init);
  }
})();
