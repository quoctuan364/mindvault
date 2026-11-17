const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const fs = require('node:fs');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'mindvault.sqlite');
const db = new DatabaseSync(dbPath);

// Enable WAL mode for high concurrency and performance
db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS notes (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    icon TEXT DEFAULT 'DOC',
    folder TEXT DEFAULT 'Inbox',
    content TEXT DEFAULT '',
    tags TEXT DEFAULT '[]',
    pinned INTEGER DEFAULT 0,
    favorite INTEGER DEFAULT 0,
    archived INTEGER DEFAULT 0,
    color TEXT DEFAULT '#6366f1',
    word_count INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS focus_sessions (
    id TEXT PRIMARY KEY,
    note_id TEXT,
    note_title TEXT,
    duration_minutes INTEGER NOT NULL,
    completed_at TEXT NOT NULL
  );
`);

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

function seedInitialData() {
  const countRow = db.prepare('SELECT COUNT(*) as count FROM notes').get();
  if (countRow && countRow.count > 0) return;

  const now = new Date();
  const iso = (daysAgo = 0) => new Date(now.getTime() - daysAgo * 86400000).toISOString();

  const initialNotes = [
    {
      id: 'note-welcome-hub',
      title: 'MindVault Architecture Hub',
      icon: 'CORE',
      folder: 'Second Brain',
      color: '#6366f1',
      pinned: 1,
      favorite: 1,
      tags: JSON.stringify(['architecture', 'second-brain', 'zettelkasten', 'system-design']),
      created_at: iso(6),
      updated_at: iso(0),
      content: `# MindVault Architecture Hub

Hệ thống quản trị tri thức cá nhân (**Second Brain & Zettelkasten**) được thiết kế tối ưu cho Software Engineer & AI Researcher.

> *"Your mind is for having ideas, not holding them."* — David Allen

---

## Liên kết Tri thức (Bi-directional Wiki-Links)
Trong MindVault, mọi ghi chú đều kết nối thành mạng lưới đồ thị tri thức (**Knowledge Graph**). Bạn có thể liên kết tới bất kỳ ghi chú nào bằng cú pháp \`[[Tên Ghi Chú]]\`:

- Khám phá hệ thống bảo mật AI tại [[LLM Security Gateway Design]]
- Xem lộ trình nghiên cứu mô hình tại [[RAG & Vector Database Deep Dive]]
- Quản lý quy trình làm việc cá nhân với [[Deep Work & Pomodoro Protocol]]
- Theo dõi kế hoạch dự án tại [[2026 Portfolio & Open Source Roadmap]]
- Thiết kế kiến trúc hệ thống tại [[Zero-Dependency Full-Stack Architecture]]

---

## Nhiệm vụ trọng tâm tuần này
- [x] Khởi tạo cơ sở dữ liệu SQLite (WAL mode) cho MindVault
- [x] Xây dựng công cụ Interactive Force-Directed Knowledge Graph 2D
- [x] Tích hợp trình soạn thảo Markdown Live Preview & Backlinks tự động
- [ ] Hoàn thiện tài liệu API cho [[LLM Security Gateway Design]]
- [ ] Tối ưu hóa thuật toán HNSW Indexing trong [[RAG & Vector Database Deep Dive]]

---

## Bảng tổng hợp Tech Stack
| Tầng kiến trúc | Công nghệ sử dụng | Đặc tả kỹ thuật |
| :--- | :--- | :--- |
| **Backend Core** | Node.js Native HTTP | RESTful API tốc độ cao, Zero-overhead |
| **Database** | SQLite (\`node:sqlite\`) | Lưu trữ ACID, WAL Mode, Full-text Search |
| **Graph Engine** | HTML5 Canvas Physics | Lực đẩy Coulomb + Lò xo Hooke thời gian thực |
| **Editor** | Split-Pane Markdown | Hỗ trợ Wiki-link \`[[...]]\`, Callout, Code, Checklist |
`
    },
    {
      id: 'note-llm-security',
      title: 'LLM Security Gateway Design',
      icon: 'SEC',
      folder: 'AI & Security',
      color: '#10b981',
      pinned: 1,
      favorite: 1,
      tags: JSON.stringify(['security', 'llm', 'ai-safety', 'prompt-injection']),
      created_at: iso(5),
      updated_at: iso(1),
      content: `# LLM Security Gateway Design

Ghi chú nghiên cứu chuyên sâu về lớp phòng thủ bảo mật cho các hệ thống Large Language Model (tương ứng với dự án \`llm-security-gateway\` và \`sentinel-ai\`). Được liên kết trực tiếp từ [[MindVault Architecture Hub]].

---

## 1. Mô hình Đe dọa (Threat Model)
Các ứng dụng tích hợp LLM và [[RAG & Vector Database Deep Dive]] thường đối mặt với 4 nhóm tấn công chính:
1. **Direct Prompt Injection**: Vượt rào cản hệ thống (Jailbreak, DAN).
2. **Indirect Prompt Injection**: Nhiễm độc dữ liệu từ tài liệu ngoài đưa vào ngữ cảnh RAG.
3. **PII & Secret Leakage**: Rò rỉ API Key, thông tin nhạy cảm của người dùng trong câu trả lời.
4. **Denial of Wallet (DoW)**: Tấn công làm cạn kiệt ngân sách token.

---

## 2. Kiến trúc Pipeline Phòng thủ Đa tầng

\`\`\`python
class SentinelGateway:
    def inspect_request(self, prompt: str, user_id: str) -> SecurityVerdict:
        # Stage 1: Deterministic Heuristic & Regex Redaction
        sanitized = self.pii_scrubber.redact(prompt)
        
        # Stage 2: Semantic Vector Similarity (Prompt Guard)
        risk_score = self.vector_firewall.compute_threat(sanitized)
        if risk_score > 0.82:
            raise PromptInjectionDetected("Blocked high-risk semantic pattern")
            
        return SecurityVerdict(allowed=True, sanitized_prompt=sanitized)
\`\`\`

---

## 3. Checklist Triển khai
- [x] Xây dựng bộ lọc PII (Email, Phone, Credit Card, JWT Token)
- [x] Cài đặt Rate Limiter theo Token Bucket
- [ ] Kết nối cảnh báo bất thường sang [[2026 Portfolio & Open Source Roadmap]]
- [ ] Kiểm thử tấn công giả lập (Red Teaming) với 500 mẫu adversarial prompts
`
    },
    {
      id: 'note-rag-vector',
      title: 'RAG & Vector Database Deep Dive',
      icon: 'RAG',
      folder: 'AI & Security',
      color: '#ec4899',
      pinned: 0,
      favorite: 1,
      tags: JSON.stringify(['rag', 'embeddings', 'vector-db', 'ai']),
      created_at: iso(4),
      updated_at: iso(1),
      content: `# RAG & Vector Database Deep Dive

Tài liệu kỹ thuật phục vụ cho hệ thống gợi ý và đọc sách thông minh (\`bookverse-ai\`) cùng hệ sinh thái [[MindVault Architecture Hub]].

---

## Công thức Hybrid Search (Dense + Sparse)
Để khắc phục nhược điểm của tìm kiếm ngữ nghĩa thuần túy khi gặp từ khóa chuyên ngành, hệ thống kết hợp **BM25** và **Cosine Similarity** thông qua thuật toán **Reciprocal Rank Fusion (RRF)**:

\`\`\`
RRF_Score(d) = SUM [ 1 / (k + rank_dense(d)) ] + SUM [ 1 / (k + rank_sparse(d)) ]
\`\`\`
*(Trong đó hằng số làm mượt \`k = 60\` cho kết quả ổn định nhất).*

---

## Liên kết Kiến trúc
- Mọi ngữ cảnh truy xuất từ Vector DB trước khi đưa vào LLM đều phải đi qua [[LLM Security Gateway Design]] để chống **Indirect Prompt Injection**.
- Toàn bộ chỉ mục ghi chú cá nhân cũng có thể áp dụng triết lý của [[Zero-Dependency Full-Stack Architecture]].

---

## Hạng mục Tối ưu hóa
- [x] Triển khai Semantic Chunking theo cấu trúc Markdown Header
- [x] Thêm bước Reranking với Cross-Encoder
- [ ] Đánh giá độ trễ truy vấn (P99 Latency < 45ms)
`
    },
    {
      id: 'note-zero-dep',
      title: 'Zero-Dependency Full-Stack Architecture',
      icon: 'SYS',
      folder: 'Engineering',
      color: '#f59e0b',
      pinned: 0,
      favorite: 0,
      tags: JSON.stringify(['nodejs', 'sqlite', 'system-design', 'performance']),
      created_at: iso(3),
      updated_at: iso(2),
      content: `# Zero-Dependency Full-Stack Architecture

Tại sao các dự án hiện đại ngày càng ưu tiên giảm sự phụ thuộc vào hàng ngàn gói thư viện bên ngoài? Ghi chú này giải thích thiết kế cốt lõi đằng sau [[MindVault Architecture Hub]].

---

## 1. Sức mạnh từ Native Runtime (Node.js v22+ / v24+)
Kể từ khi Node.js tích hợp sẵn \`node:sqlite\` (SQLite C++ binding trực tiếp), chúng ta có thể xây dựng ứng dụng Full-Stack hoàn chỉnh mà không cần cài đặt \`node_modules\` nặng hàng trăm MB:

- **Khởi động tức thì (< 30ms)**: Không tốn thời gian phân giải cây phụ thuộc phức tạp.
- **Bảo mật chuỗi cung ứng**: Loại bỏ nguy cơ tấn công Supply Chain qua gói npm bên thứ 3 (như triết lý trong [[LLM Security Gateway Design]]).
- **Tính di động tuyệt đối**: Clone repo từ GitHub về là chạy được ngay lập tức.

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
      color: '#06b6d4',
      pinned: 0,
      favorite: 0,
      tags: JSON.stringify(['productivity', 'deep-work', 'pomodoro', 'habits']),
      created_at: iso(2),
      updated_at: iso(1),
      content: `# Deep Work & Pomodoro Protocol

Quy trình tối ưu hóa sự tập trung cao độ khi lập trình và nghiên cứu tại [[MindVault Architecture Hub]].

---

## Nguyên tắc 90/20 & Pomodoro 25/5
1. **Xác định rõ 1 mục tiêu duy nhất** trước khi bấm đồng hồ Focus ở thanh công cụ phía trên.
2. **Đóng toàn bộ tab gây xao nhãng**: Chỉ mở trình soạn thảo code và ghi chú kỹ thuật liên quan (ví dụ [[RAG & Vector Database Deep Dive]]).
3. **Ghi nhận lại tiến độ**: Sau mỗi phiên Pomodoro, đánh dấu hoàn thành các checkbox trong bài.

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
      color: '#8b5cf6',
      pinned: 1,
      favorite: 1,
      tags: JSON.stringify(['roadmap', 'github', 'portfolio', 'career']),
      created_at: iso(1),
      updated_at: iso(0),
      content: `# 2026 Portfolio & Open Source Roadmap

Kế hoạch xây dựng hệ sinh thái dự án mã nguồn mở chất lượng cao trên trang GitHub cá nhân **github.com/quoctuan364**.

---

## Danh mục Dự án Chủ lực
1. **MindVault** ([[MindVault Architecture Hub]]) — Full-Stack Second Brain & Knowledge Graph với [[Zero-Dependency Full-Stack Architecture]].
2. **Sentinel AI & LLM Security Gateway** ([[LLM Security Gateway Design]]) — Hệ thống tường lửa bảo vệ mô hình ngôn ngữ lớn.
3. **BookVerse AI** ([[RAG & Vector Database Deep Dive]]) — Nền tảng đọc sách thông minh tích hợp RAG.
4. **Productivity Discipline** ([[Deep Work & Pomodoro Protocol]]) — Hệ thống theo dõi hiệu suất làm việc chuyên sâu.

---

## Mục tiêu Chuẩn hóa GitHub Profile
- [x] Thiết kế giao diện Dark Mode chuẩn kỹ thuật cho MindVault
- [x] Bổ sung tính năng Xuất/Nhập toàn bộ kho tri thức (JSON & Markdown Bundle)
- [ ] Chụp ảnh màn hình giao diện Đồ thị Tri thức (Knowledge Graph) đưa vào README
- [ ] Đẩy mã nguồn hoàn chỉnh lên GitHub \`quoctuan364/mindvault\`
`
    }
  ];

  const insertStmt = db.prepare(`
    INSERT INTO notes (
      id, title, icon, folder, content, tags, pinned, favorite, archived, color, word_count, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const n of initialNotes) {
    insertStmt.run(
      n.id,
      n.title,
      n.icon,
      n.folder,
      n.content,
      n.tags,
      n.pinned,
      n.favorite,
      0,
      n.color,
      countWords(n.content),
      n.created_at,
      n.updated_at
    );
  }

  const insertFocus = db.prepare(`
    INSERT INTO focus_sessions (id, note_id, note_title, duration_minutes, completed_at)
    VALUES (?, ?, ?, ?, ?)
  `);
  insertFocus.run('focus-1', 'note-welcome-hub', 'MindVault Architecture Hub', 25, iso(2));
  insertFocus.run('focus-2', 'note-llm-security', 'LLM Security Gateway Design', 50, iso(1));
  insertFocus.run('focus-3', 'note-rag-vector', 'RAG & Vector Database Deep Dive', 25, iso(0));
}

seedInitialData();

module.exports = {
  db,
  countWords,
  extractWikiLinks,
  extractTasks
};
