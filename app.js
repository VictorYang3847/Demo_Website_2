// ============================================
// 唐诗百首 · 前端逻辑
// 功能：渲染列表、按作者/关键词筛选、详情弹窗
// ============================================

(function () {
  'use strict';

  // ---------- DOM 引用 ----------
  const $list = document.getElementById('poemList');
  const $empty = document.getElementById('emptyState');
  const $search = document.getElementById('searchInput');
  const $author = document.getElementById('authorFilter');
  const $total = document.getElementById('totalCount');
  const $visible = document.getElementById('visibleCount');
  const $modal = document.getElementById('modal');
  const $modalTitle = document.getElementById('modalTitle');
  const $modalAuthor = document.getElementById('modalAuthor');
  const $modalContent = document.getElementById('modalContent');

  // ---------- 初始化 ----------
  function init() {
    if (typeof POEMS === 'undefined' || !Array.isArray(POEMS)) {
      $list.innerHTML = '<p style="color:#f88;padding:20px;">诗数据加载失败，请检查 poems.js</p>';
      return;
    }
    populateAuthorFilter();
    render(POEMS);
    $total.textContent = POEMS.length;
    bindEvents();
  }

  // ---------- 填充作者下拉框 ----------
  function populateAuthorFilter() {
    const authors = Array.from(new Set(POEMS.map(p => p.author))).sort((a, b) => {
      // 按唐诗常见诗人顺序粗排
      const order = ['李白', '杜甫', '王维', '孟浩然', '王昌龄', '高适', '岑参',
                     '李商隐', '杜牧', '白居易', '刘禹锡', '元稹', '张九龄',
                     '王之涣', '王勃', '骆宾王', '贺知章', '陈子昂', '李贺',
                     '温庭筠', '韦应物', '柳宗元'];
      const ia = order.indexOf(a), ib = order.indexOf(b);
      if (ia === -1 && ib === -1) return a.localeCompare(b, 'zh-CN');
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });
    authors.forEach(name => {
      const opt = document.createElement('option');
      opt.value = name;
      opt.textContent = `${name}（${POEMS.filter(p => p.author === name).length}）`;
      $author.appendChild(opt);
    });
  }

  // ---------- 过滤 + 渲染 ----------
  function filterPoems() {
    const kw = $search.value.trim().toLowerCase();
    const author = $author.value;
    return POEMS.filter(p => {
      const matchAuthor = !author || p.author === author;
      const matchKw = !kw ||
        p.title.toLowerCase().includes(kw) ||
        p.author.toLowerCase().includes(kw);
      return matchAuthor && matchKw;
    });
  }

  function render(items) {
    $list.innerHTML = '';
    $visible.textContent = items.length;
    if (items.length === 0) {
      $empty.hidden = false;
      return;
    }
    $empty.hidden = true;
    const frag = document.createDocumentFragment();
    items.forEach(p => {
      const card = document.createElement('article');
      card.className = 'poem-card';
      card.tabIndex = 0;
      card.setAttribute('role', 'button');
      card.setAttribute('aria-label', `查看《${p.title}》`);
      card.dataset.id = p.id;

      const previewLines = p.content.slice(0, 2).join('');

      card.innerHTML = `
        <h3 class="card-title">${escapeHtml(p.title)}</h3>
        <p class="card-author">— ${escapeHtml(p.author)} —</p>
        <p class="card-preview">${escapeHtml(previewLines)}</p>
        <span class="card-arrow" aria-hidden="true">→</span>
      `;
      frag.appendChild(card);
    });
    $list.appendChild(frag);
  }

  function refresh() {
    render(filterPoems());
  }

  // ---------- 弹窗 ----------
  function openModal(poem) {
    $modalTitle.textContent = poem.title;
    $modalAuthor.textContent = `— ${poem.author} —`;
    $modalContent.innerHTML = poem.content
      .map(line => `<p>${escapeHtml(line)}</p>`)
      .join('');
    $modal.hidden = false;
    $modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    $modal.hidden = true;
    $modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  // ---------- 事件绑定 ----------
  function bindEvents() {
    // 搜索输入（带 200ms 防抖）
    let timer = null;
    $search.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(refresh, 200);
    });

    // 作者筛选
    $author.addEventListener('change', refresh);

    // 卡片点击
    $list.addEventListener('click', e => {
      const card = e.target.closest('.poem-card');
      if (!card) return;
      const poem = POEMS.find(p => p.id === Number(card.dataset.id));
      if (poem) openModal(poem);
    });

    // 卡片键盘
    $list.addEventListener('keydown', e => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const card = e.target.closest('.poem-card');
      if (!card) return;
      e.preventDefault();
      const poem = POEMS.find(p => p.id === Number(card.dataset.id));
      if (poem) openModal(poem);
    });

    // 关闭弹窗（背景 / 按钮 / Esc）
    $modal.addEventListener('click', e => {
      if (e.target.dataset.close !== undefined) closeModal();
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && !$modal.hidden) closeModal();
    });
  }

  // ---------- 工具：HTML 转义 ----------
  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // ---------- 启动 ----------
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
