const STORAGE_KEY = 'memo-app-data';

// ── 상태 ──────────────────────────────────────────────
let memos = [];        // { id, title, content, createdAt, updatedAt }
let currentId = null;  // 현재 열린 메모 id
let saveTimer = null;  // 자동저장 타이머

// ── DOM ───────────────────────────────────────────────
const memoList    = document.getElementById('memo-list');
const btnNew      = document.getElementById('btn-new');
const btnDelete   = document.getElementById('btn-delete');
const searchInput = document.getElementById('search');
const titleInput  = document.getElementById('memo-title');
const contentArea = document.getElementById('memo-content');
const memoDate    = document.getElementById('memo-date');

// ── 초기화 ────────────────────────────────────────────
function init() {
  load();
  renderList();
  if (memos.length > 0) openMemo(memos[0].id);
  bindEvents();
}

// ── 로컬스토리지 ──────────────────────────────────────
function load() {
  try {
    memos = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    memos = [];
  }
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(memos));
}

// ── CRUD ──────────────────────────────────────────────
function createMemo() {
  const now = new Date().toISOString();
  const memo = {
    id: Date.now().toString(),
    title: '',
    content: '',
    createdAt: now,
    updatedAt: now,
  };
  memos.unshift(memo);
  save();
  renderList();
  openMemo(memo.id);
  titleInput.focus();
}

function deleteMemo(id) {
  if (!confirm('이 메모를 삭제할까요?')) return;
  memos = memos.filter(m => m.id !== id);
  save();
  currentId = null;
  renderList();
  if (memos.length > 0) {
    openMemo(memos[0].id);
  } else {
    clearEditor();
  }
}

function updateCurrent() {
  if (!currentId) return;
  const memo = memos.find(m => m.id === currentId);
  if (!memo) return;

  memo.title   = titleInput.value;
  memo.content = contentArea.value;
  memo.updatedAt = new Date().toISOString();

  // 목록에서 맨 위로 올리기
  memos = [memo, ...memos.filter(m => m.id !== currentId)];
  save();
  renderList();
}

// ── 에디터 ────────────────────────────────────────────
function openMemo(id) {
  currentId = id;
  const memo = memos.find(m => m.id === id);
  if (!memo) return;

  titleInput.value   = memo.title;
  contentArea.value  = memo.content;
  memoDate.textContent = formatDate(memo.updatedAt);

  titleInput.disabled  = false;
  contentArea.disabled = false;
  btnDelete.disabled   = false;

  highlightActive(id);
}

function clearEditor() {
  titleInput.value   = '';
  contentArea.value  = '';
  memoDate.textContent = '';
  titleInput.disabled  = true;
  contentArea.disabled = true;
  btnDelete.disabled   = true;
  highlightActive(null);
}

// ── 목록 렌더링 ───────────────────────────────────────
function renderList(filter = '') {
  const keyword = filter.toLowerCase();
  const filtered = keyword
    ? memos.filter(m =>
        m.title.toLowerCase().includes(keyword) ||
        m.content.toLowerCase().includes(keyword)
      )
    : memos;

  memoList.innerHTML = '';

  if (filtered.length === 0) {
    memoList.innerHTML = `<li class="empty-list">${keyword ? '검색 결과 없음' : '메모가 없습니다'}</li>`;
    return;
  }

  filtered.forEach(memo => {
    const li = document.createElement('li');
    if (memo.id === currentId) li.classList.add('active');

    const preview = memo.content.replace(/\n/g, ' ').slice(0, 60) || '내용 없음';

    li.innerHTML = `
      <div class="item-title">${escapeHtml(memo.title) || '제목 없음'}</div>
      <div class="item-preview">${escapeHtml(preview)}</div>
      <div class="item-date">${formatDate(memo.updatedAt)}</div>
    `;

    li.addEventListener('click', () => openMemo(memo.id));
    memoList.appendChild(li);
  });
}

function highlightActive(id) {
  document.querySelectorAll('#memo-list li').forEach(li => {
    li.classList.remove('active');
  });
  if (!id) return;
  const items = document.querySelectorAll('#memo-list li');
  const visibleMemos = getCurrentFilteredMemos();
  const idx = visibleMemos.findIndex(m => m.id === id);
  if (items[idx]) items[idx].classList.add('active');
}

function getCurrentFilteredMemos() {
  const keyword = searchInput.value.toLowerCase();
  return keyword
    ? memos.filter(m =>
        m.title.toLowerCase().includes(keyword) ||
        m.content.toLowerCase().includes(keyword)
      )
    : memos;
}

// ── 이벤트 ────────────────────────────────────────────
function bindEvents() {
  btnNew.addEventListener('click', createMemo);

  btnDelete.addEventListener('click', () => {
    if (currentId) deleteMemo(currentId);
  });

  searchInput.addEventListener('input', () => {
    renderList(searchInput.value);
  });

  // 자동저장: 입력 후 500ms 뒤 저장
  [titleInput, contentArea].forEach(el => {
    el.addEventListener('input', () => {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => {
        updateCurrent();
      }, 500);
    });
  });

  // 단축키: Ctrl+N / Cmd+N → 새 메모
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
      e.preventDefault();
      createMemo();
    }
    // Ctrl+Backspace / Cmd+Delete → 현재 메모 삭제
    if ((e.ctrlKey || e.metaKey) && e.key === 'Backspace') {
      e.preventDefault();
      if (currentId) deleteMemo(currentId);
    }
  });
}

// ── 유틸 ──────────────────────────────────────────────
function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now - d;
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1)  return '방금 전';
  if (diffMin < 60) return `${diffMin}분 전`;
  if (diffMin < 1440) return `${Math.floor(diffMin / 60)}시간 전`;

  return d.toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── 시작 ──────────────────────────────────────────────
init();
