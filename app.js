// ============================================
// 中华诗词三百首 · 前端逻辑
// 功能：合并五大类数据、类型/作者/关键词筛选、详情弹窗
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
  const $typeTabs = document.querySelectorAll('.type-tab');
  const $modal = document.getElementById('modal');
  const $modalTitle = document.getElementById('modalTitle');
  const $modalAuthor = document.getElementById('modalAuthor');
  const $modalCipai = document.getElementById('modalCipai');
  const $modalContent = document.getElementById('modalContent');

  // ---------- 状态 ----------
  let ALL = [];           // 合并后的全量数据
  let currentType = 'all';// 当前类型: all / shi / ci / qu / qing / modern

  // 类型显示名映射
  const TYPE_LABELS = {
    shi: '诗',
    ci: '词',
    qu: '曲',
    qing: '清诗',
    modern: '现代'
  };

  // ---------- 初始化 ----------
  function init() {
    // 收集所有数据源
    const sources = [
      (typeof POEMS !== 'undefined' && Array.isArray(POEMS)) ? POEMS : [],
      (typeof SONGS !== 'undefined' && Array.isArray(SONGS)) ? SONGS : [],
      (typeof QU !== 'undefined' && Array.isArray(QU)) ? QU : [],
      (typeof QING !== 'undefined' && Array.isArray(QING)) ? QING : [],
      (typeof MODERN !== 'undefined' && Array.isArray(MODERN)) ? MODERN : [],
    ];

    const validSources = sources.filter(s => s.length > 0);

    if (validSources.length === 0) {
      $list.innerHTML = '<p style="color:#f88;padding:20px;">数据加载失败，请检查数据文件</p>';
      return;
    }

    // 兜底：若数据缺 type 字段，自动补
    validSources.forEach((arr, idx) => {
      arr.forEach(p => {
        if (!p.type) {
          // 根据数据源索引推断类型
          if (idx === 0) p.type = 'shi';
          else if (idx === 1) p.type = 'ci';
          else if (idx === 2) p.type = 'qu';
          else if (idx === 3) p.type = 'qing';
          else p.type = 'modern';
        }
      });
    });

    ALL = validSources.flat();
    populateAuthorFilter();
    $total.textContent = ALL.length;
    render(ALL);
    bindEvents();
  }

  // ---------- 作者下拉框 ----------
  function populateAuthorFilter() {
    const counts = {};
    ALL.forEach(p => { counts[p.author] = (counts[p.author] || 0) + 1; });
    const authors = Object.keys(counts).sort((a, b) => {
      // 按朝代顺序粗排
      const order = [
        // 唐
        '李白','杜甫','王维','孟浩然','王昌龄','高适','岑参','李商隐','杜牧',
        '白居易','刘禹锡','元稹','张九龄','王之涣','王勃','骆宾王','贺知章',
        '陈子昂','李贺','温庭筠','韦应物','柳宗元',
        // 宋
        '苏轼','李清照','辛弃疾','柳永','李煜','欧阳修','周邦彦','陆游','秦观',
        '范仲淹','王安石','姜夔','晏殊','晏几道','岳飞','贺铸','张先','王观',
        '刘克庄','叶梦得','陈与义','刘辰翁','文天祥',
        // 元
        '马致远','关汉卿','白朴','张养浩','睢景臣','王实甫','张可久','徐再思',
        '乔吉','郑光祖',
        // 清
        '纳兰性德','龚自珍','郑燮','袁枚','赵翼','查慎行','黄景仁','林则徐',
        // 现代
        '毛泽东','徐志摩','戴望舒','海子','舒婷','艾青','余光中','郑愁予',
        '席慕容','顾城'
      ];
      const ia = order.indexOf(a), ib = order.indexOf(b);
      if (ia === -1 && ib === -1) return a.localeCompare(b, 'zh-CN');
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });
    authors.forEach(name => {
      const opt = document.createElement('option');
      opt.value = name;
      opt.textContent = `${name}（${counts[name]}）`;
      $author.appendChild(opt);
    });
  }

  // ---------- 过滤 + 渲染 ----------
  function filterPoems() {
    const kw = $search.value.trim().toLowerCase();
    const author = $author.value;
    return ALL.filter(p => {
      const matchType = currentType === 'all' || p.type === currentType;
      const matchAuthor = !author || p.author === author;
      const matchKw = !kw ||
        p.title.toLowerCase().includes(kw) ||
        p.author.toLowerCase().includes(kw) ||
        (p.cipai || p.qupai || '').toLowerCase().includes(kw);
      return matchType && matchAuthor && matchKw;
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
      card.dataset.type = p.type;

      const previewLines = p.content.slice(0, 2).join('');

      // 词牌名/曲牌名标签（仅 ci/qu 显示）
      const nameTag = p.type === 'ci' && p.cipai
        ? `<span class="cipai-tag">${escapeHtml(p.cipai)}</span>`
        : p.type === 'qu' && p.qupai
          ? `<span class="cipai-tag">${escapeHtml(p.qupai)}</span>`
          : '';

      // 类型徽章
      const typeBadge = `<span class="type-badge type-${p.type}">${TYPE_LABELS[p.type] || p.type}</span>`;

      card.innerHTML = `
        <div class="card-header">
          ${typeBadge}
          ${nameTag}
        </div>
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

    // 词牌名/曲牌名（仅 ci/qu）
    const nameTag = poem.type === 'ci' ? poem.cipai : poem.type === 'qu' ? poem.qupai : null;
    if (nameTag) {
      $modalCipai.textContent = nameTag;
      $modalCipai.hidden = false;
    } else {
      $modalCipai.hidden = true;
    }

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

  // ---------- 事件 ----------
  function bindEvents() {
    // 类型 tab
    $typeTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        $typeTabs.forEach(t => {
          t.classList.remove('active');
          t.setAttribute('aria-selected', 'false');
        });
        tab.classList.add('active');
        tab.setAttribute('aria-selected', 'true');
        currentType = tab.dataset.type;
        refresh();
      });
    });

    // 搜索（防抖 200ms）
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
      const poem = ALL.find(p => p.id === Number(card.dataset.id));
      if (poem) openModal(poem);
    });

    // 卡片键盘
    $list.addEventListener('keydown', e => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const card = e.target.closest('.poem-card');
      if (!card) return;
      e.preventDefault();
      const poem = ALL.find(p => p.id === Number(card.dataset.id));
      if (poem) openModal(poem);
    });

    // 关闭弹窗
    $modal.addEventListener('click', e => {
      if (e.target.dataset.close !== undefined) closeModal();
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && !$modal.hidden) closeModal();
    });
  }

  // ---------- 工具 ----------
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
