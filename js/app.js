const STORAGE_KEY = 'memo-app-data';

// ── 상태 ──────────────────────────────────────────────
let memos = [];
let currentId = null;
let saveTimer = null;
let currentTab = 'text'; // 'text' | 'draw'

// ── DOM: 공통 ─────────────────────────────────────────

const memoList        = document.getElementById('memo-list');
const btnNew          = document.getElementById('btn-new');
const btnDelete       = document.getElementById('btn-delete');
const btnTheme        = document.getElementById('btn-theme');
const btnShowcase     = document.getElementById('btn-showcase');
const searchInput     = document.getElementById('search');
const memoDate        = document.getElementById('memo-date');
const tabText         = document.getElementById('tab-text');
const tabDraw         = document.getElementById('tab-draw');
const panelText       = document.getElementById('panel-text');
const panelDraw       = document.getElementById('panel-draw');
const showcaseOverlay = document.getElementById('showcase-overlay');
const showcaseGrid    = document.getElementById('showcase-grid');
const btnShowcaseClose = document.getElementById('btn-showcase-close');

// ── DOM: 텍스트 ───────────────────────────────────────
const titleInput  = document.getElementById('memo-title');
const contentArea = document.getElementById('memo-content');

// ── DOM: 그림판 ───────────────────────────────────────
const canvas       = document.getElementById('draw-canvas');
const ctx          = canvas.getContext('2d');
const toolPen      = document.getElementById('tool-pen');
const toolEraser   = document.getElementById('tool-eraser');
const colorPicker  = document.getElementById('color-picker');
const brushSize    = document.getElementById('brush-size');
const sizeDisplay  = document.getElementById('size-display');
const btnClearCanvas = document.getElementById('btn-clear-canvas');
const btnSaveImg   = document.getElementById('btn-save-img');

// ── 그림판 상태 ───────────────────────────────────────
let drawing = false;
let drawTool = 'pen';
let lastX = 0;
let lastY = 0;

// ── 초기화 ────────────────────────────────────────────
function init() {
  load();
  applyTheme(localStorage.getItem('memo-theme') || 'dark');
  renderList();
  if (memos.length > 0) openMemo(memos[0].id);
  bindEvents();
  resizeCanvas();
}

// ── 테마 ──────────────────────────────────────────────
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  btnTheme.textContent = theme === 'dark' ? '🌙' : '☀️';
  localStorage.setItem('memo-theme', theme);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  applyTheme(current === 'dark' ? 'light' : 'dark');
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
    drawing: null,
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

  memos = [memo, ...memos.filter(m => m.id !== currentId)];
  save();
  renderList();
}

function saveCanvasToCurrent() {
  if (!currentId) return;
  const memo = memos.find(m => m.id === currentId);
  if (!memo) return;
  memo.drawing = canvas.toDataURL();
  memo.updatedAt = new Date().toISOString();
  save();
}

// ── 에디터 ────────────────────────────────────────────
function openMemo(id) {
  currentId = id;
  const memo = memos.find(m => m.id === id);
  if (!memo) return;

  titleInput.value  = memo.title;
  contentArea.value = memo.content;
  memoDate.textContent = formatDate(memo.updatedAt);

  titleInput.disabled  = false;
  contentArea.disabled = false;
  btnDelete.disabled   = false;

  loadCanvasFromMemo(memo);
  highlightActive(id);
}

function clearEditor() {
  titleInput.value  = '';
  contentArea.value = '';
  memoDate.textContent = '';
  titleInput.disabled  = true;
  contentArea.disabled = true;
  btnDelete.disabled   = true;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  highlightActive(null);
}

// ── 캔버스 ────────────────────────────────────────────
function resizeCanvas() {
  const saved = canvas.toDataURL();
  canvas.width  = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;
  // 리사이즈 후 현재 메모 그림 복원
  const memo = memos.find(m => m.id === currentId);
  if (memo) loadCanvasFromMemo(memo);
}

function loadCanvasFromMemo(memo) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!memo.drawing) return;
  const img = new Image();
  img.onload = () => ctx.drawImage(img, 0, 0);
  img.src = memo.drawing;
}

function getPos(e) {
  const rect = canvas.getBoundingClientRect();
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;
  return {
    x: clientX - rect.left,
    y: clientY - rect.top,
  };
}

function startDraw(e) {
  e.preventDefault();
  drawing = true;
  const pos = getPos(e);
  lastX = pos.x;
  lastY = pos.y;
  ctx.beginPath();
  ctx.arc(lastX, lastY, ctx.lineWidth / 2, 0, Math.PI * 2);
  ctx.fillStyle = drawTool === 'eraser' ? '#ffffff' : colorPicker.value;
  ctx.fill();
}

function draw(e) {
  if (!drawing) return;
  e.preventDefault();
  const pos = getPos(e);

  ctx.beginPath();
  ctx.moveTo(lastX, lastY);
  ctx.lineTo(pos.x, pos.y);
  ctx.strokeStyle = drawTool === 'eraser' ? '#ffffff' : colorPicker.value;
  ctx.lineWidth   = parseInt(brushSize.value);
  ctx.lineCap     = 'round';
  ctx.lineJoin    = 'round';
  ctx.stroke();

  lastX = pos.x;
  lastY = pos.y;
}

function stopDraw() {
  if (!drawing) return;
  drawing = false;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveCanvasToCurrent, 500);
}

// ── 인첸트 쇼케이스 ──────────────────────────────────
let showcaseAnimId = null;
let showcaseImgObjs = [];

function openShowcase() {
  showcaseOverlay.classList.remove('showcase-hidden');
  showcaseGrid.innerHTML = '';
  showcaseImgObjs = [];
  if (showcaseAnimId) { cancelAnimationFrame(showcaseAnimId); showcaseAnimId = null; }

  const W = window.innerWidth;
  const H = window.innerHeight;

  const cvs = document.createElement('canvas');
  cvs.id = 'enchant-canvas';
  cvs.width = W; cvs.height = H;
  showcaseGrid.appendChild(cvs);
  const bCtx = cvs.getContext('2d');

  // ── 줄 단위로 텍스트 추출 ──
  const lines = [];
  memos.forEach(m => {
    [`${m.title}`, ...m.content.split('\n')].forEach(s => {
      const t = s.trim();
      if (t.length > 0) lines.push(t);
    });
  });
  if (lines.length === 0) lines.push('아직 메모가 없어요 ✦');

  // ── 그림 → DOM img (흰 배경 제거: invert+screen) ──
  memos.forEach(m => {
    if (!m.drawing) return;
    const img = document.createElement('img');
    img.src = m.drawing;
    img.className = 'enchant-drawing';
    showcaseGrid.appendChild(img);

    const angle = Math.random() * Math.PI * 2;
    const spd   = 0.18 + Math.random() * 0.32;
    const obj   = {
      el: img,
      x: 80 + Math.random() * (W - 440),
      y: 80 + Math.random() * (H - 320),
      vx: Math.cos(angle) * spd,
      vy: Math.sin(angle) * spd,
      rot: (Math.random() - 0.5) * 8,
      vrot: (Math.random() - 0.5) * 0.025,
      w: 360, h: 260,
    };
    img.onload = () => {
      const ratio = img.naturalHeight / img.naturalWidth;
      obj.h = Math.round(obj.w * ratio);
    };
    showcaseImgObjs.push(obj);
  });

  // ── 텍스트 파티클 (각 줄이 떠다님) ──
  const pool = [];
  let globalTick = 0;

  function makeLine(prefill) {
    const text    = lines[Math.floor(Math.random() * lines.length)];
    const size    = 15 + Math.random() * 18;
    const speed   = 0.22 + Math.random() * 0.65;
    const angle   = Math.random() * Math.PI * 2;
    const hueBase = Math.random() * 360;
    const span    = 90 + Math.random() * 130;
    return {
      text, size, hueBase, span,
      x: prefill ? 40 + Math.random() * (W - 80) : (Math.random() > 0.5 ? -20 : W + 20),
      y: prefill ? 40 + Math.random() * (H - 80) : 40 + Math.random() * (H - 80),
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      flick: 0.02 + Math.random() * 0.05,
      maxAlpha: 0.55 + Math.random() * 0.45,
      alpha: prefill ? (0.3 + Math.random() * 0.4) : 0,
    };
  }

  // 처음부터 화면을 채워 놓기
  const MAX = Math.min(lines.length * 2, 22);
  for (let i = 0; i < MAX; i++) pool.push(makeLine(true));

  let last = performance.now();

  function loop(now) {
    const dt = Math.min(now - last, 50);
    last = now;
    globalTick++;

    bCtx.clearRect(0, 0, W, H);
    bCtx.textBaseline = 'middle';

    pool.forEach(p => {
      // 페이드 인
      p.alpha = Math.min(p.maxAlpha, p.alpha + 0.006);
      p.x += p.vx;
      p.y += p.vy;

      bCtx.font = `${p.size}px "Courier New", monospace`;
      const tw = bCtx.measureText(p.text).width;

      // 경계에서 튕김
      if (p.x < 0)        { p.x = 0;      p.vx =  Math.abs(p.vx); }
      if (p.x + tw > W)   { p.x = W - tw; p.vx = -Math.abs(p.vx); }
      if (p.y < p.size)   { p.y = p.size;  p.vy =  Math.abs(p.vy); }
      if (p.y > H - p.size){ p.y = H-p.size; p.vy = -Math.abs(p.vy); }

      const flicker = p.alpha * (0.72 + Math.sin(globalTick * p.flick) * 0.28);
      const shift   = globalTick * 0.3;

      const grad = bCtx.createLinearGradient(p.x, 0, p.x + tw, 0);
      grad.addColorStop(0,    `hsl(${(p.hueBase + shift)                % 360}, 92%, 72%)`);
      grad.addColorStop(0.33, `hsl(${(p.hueBase + shift + p.span * .5)  % 360}, 96%, 82%)`);
      grad.addColorStop(0.66, `hsl(${(p.hueBase + shift + p.span)       % 360}, 92%, 76%)`);
      grad.addColorStop(1,    `hsl(${(p.hueBase + shift + p.span * 1.5) % 360}, 88%, 70%)`);

      bCtx.save();
      bCtx.globalAlpha = flicker;
      bCtx.fillStyle   = grad;
      bCtx.shadowColor = `hsl(${(p.hueBase + shift) % 360}, 100%, 65%)`;
      bCtx.shadowBlur  = 16;
      bCtx.fillText(p.text, p.x, p.y);
      bCtx.restore();
    });

    // 그림 이동 (bounce)
    showcaseImgObjs.forEach(io => {
      io.x   += io.vx;
      io.y   += io.vy;
      io.rot += io.vrot;
      if (io.x < 0)          { io.x = 0;          io.vx =  Math.abs(io.vx); }
      if (io.x + io.w > W)   { io.x = W - io.w;   io.vx = -Math.abs(io.vx); }
      if (io.y < 0)          { io.y = 0;           io.vy =  Math.abs(io.vy); }
      if (io.y + io.h > H)   { io.y = H - io.h;   io.vy = -Math.abs(io.vy); }
      io.el.style.transform = `translate(${io.x}px, ${io.y}px) rotate(${io.rot}deg)`;
    });

    showcaseAnimId = requestAnimationFrame(loop);
  }

  showcaseAnimId = requestAnimationFrame(loop);
}

function closeShowcase() {
  if (showcaseAnimId) { cancelAnimationFrame(showcaseAnimId); showcaseAnimId = null; }
  showcaseOverlay.classList.add('showcase-hidden');
  showcaseGrid.innerHTML = '';
  showcaseImgObjs = [];
}

// ── 탭 전환 ───────────────────────────────────────────
function switchTab(tab) {
  currentTab = tab;
  if (tab === 'text') {
    panelText.classList.remove('hidden');
    panelDraw.classList.add('hidden');
    tabText.classList.add('active');
    tabDraw.classList.remove('active');
  } else {
    panelDraw.classList.remove('hidden');
    panelText.classList.add('hidden');
    tabDraw.classList.add('active');
    tabText.classList.remove('active');
    resizeCanvas();
  }
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

    const preview = memo.content.replace(/\n/g, ' ').slice(0, 60) || (memo.drawing ? '🎨 그림' : '내용 없음');

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
  document.querySelectorAll('#memo-list li').forEach(li => li.classList.remove('active'));
  if (!id) return;
  const items = document.querySelectorAll('#memo-list li');
  const idx = getCurrentFilteredMemos().findIndex(m => m.id === id);
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
  btnTheme.addEventListener('click', toggleTheme);
  btnShowcase.addEventListener('click', openShowcase);
  btnShowcaseClose.addEventListener('click', closeShowcase);
  showcaseOverlay.addEventListener('click', e => {
    if (e.target === showcaseOverlay) closeShowcase();
  });
  btnDelete.addEventListener('click', () => { if (currentId) deleteMemo(currentId); });
  searchInput.addEventListener('input', () => renderList(searchInput.value));

  tabText.addEventListener('click', () => switchTab('text'));
  tabDraw.addEventListener('click', () => switchTab('draw'));

  [titleInput, contentArea].forEach(el => {
    el.addEventListener('input', () => {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(updateCurrent, 500);
    });
  });

  // 그림판 마우스
  canvas.addEventListener('mousedown', startDraw);
  canvas.addEventListener('mousemove', draw);
  canvas.addEventListener('mouseup', stopDraw);
  canvas.addEventListener('mouseleave', stopDraw);

  // 그림판 터치
  canvas.addEventListener('touchstart', startDraw, { passive: false });
  canvas.addEventListener('touchmove', draw, { passive: false });
  canvas.addEventListener('touchend', stopDraw);

  // 도구 선택
  toolPen.addEventListener('click', () => {
    drawTool = 'pen';
    toolPen.classList.add('active');
    toolEraser.classList.remove('active');
  });

  toolEraser.addEventListener('click', () => {
    drawTool = 'eraser';
    toolEraser.classList.add('active');
    toolPen.classList.remove('active');
  });

  brushSize.addEventListener('input', () => {
    sizeDisplay.textContent = brushSize.value;
  });

  btnClearCanvas.addEventListener('click', () => {
    if (!confirm('그림을 전체 지울까요?')) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    saveCanvasToCurrent();
  });

  btnSaveImg.addEventListener('click', () => {
    const link = document.createElement('a');
    const title = memos.find(m => m.id === currentId)?.title || '그림';
    link.download = `${title || '그림'}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  });

  window.addEventListener('resize', resizeCanvas);

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeShowcase(); return; }
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
      e.preventDefault();
      createMemo();
    }
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
  const diffMin = Math.floor((Date.now() - d) / 60000);
  if (diffMin < 1)    return '방금 전';
  if (diffMin < 60)   return `${diffMin}분 전`;
  if (diffMin < 1440) return `${Math.floor(diffMin / 60)}시간 전`;
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── 시작 ──────────────────────────────────────────────
init();
