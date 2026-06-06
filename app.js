// ============================================
// 中华诗词三百首 · 前端逻辑
// 功能：合并五大类数据、类型/作者/关键词筛选、
//       详情弹窗、创作背景、作者页视图切换
// ============================================

(function () {
  'use strict';

  // ---------- DOM 引用 ----------
  const $poemView = document.getElementById('poemView');
  const $authorView = document.getElementById('authorView');
  const $navBtns = document.querySelectorAll('.nav-btn');
  const $list = document.getElementById('poemList');
  const $authorList = document.getElementById('authorList');
  const $authorCount = document.getElementById('authorCount');
  const $empty = document.getElementById('emptyState');
  const $search = document.getElementById('searchInput');
  const $author = document.getElementById('authorFilter');
  const $grade = document.getElementById('gradeFilter');
  const $total = document.getElementById('totalCount');
  const $visible = document.getElementById('visibleCount');
  const $typeTabs = document.querySelectorAll('.type-tab');
  const $modal = document.getElementById('modal');
  const $modalTitle = document.getElementById('modalTitle');
  const $modalAuthor = document.getElementById('modalAuthor');
  const $modalCipai = document.getElementById('modalCipai');
  const $modalContent = document.getElementById('modalContent');
  const $bgToggle = document.getElementById('bgToggle');
  const $bgContent = document.getElementById('bgContent');
  const $authorModal = document.getElementById('authorModal');
  const $authorModalTitle = document.getElementById('authorModalTitle');
  const $authorModalYear = document.getElementById('authorModalYear');
  const $authorModalDynasty = document.getElementById('authorModalDynasty');
  const $authorModalBio = document.getElementById('authorModalBio');

  // ---------- 状态 ----------
  let ALL = [];           // 合并后的全量数据
  let currentType = 'all';// 当前类型: all / shi / ci / qu / qing / modern
  let currentPoemId = null;  // 当前打开弹窗的诗的 id

  // 类型显示名映射
  const TYPE_LABELS = {
    shi: '诗',
    ci: '词',
    qu: '曲',
    qing: '清诗',
    modern: '现代'
  };

  // 朝代顺序（用于作者排序）
  const DYNASTY_ORDER = {
    '唐': 1, '宋': 2, '元': 3, '清': 4, '现代': 5
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
    populateGradeFilter();
    $total.textContent = ALL.length;
    renderPoemList(ALL);
    renderAuthorList();
    bindEvents();
  }

  // ---------- 作者下拉框 ----------
  function populateAuthorFilter() {
    const counts = {};
    ALL.forEach(p => { counts[p.author] = (counts[p.author] || 0) + 1; });
    const authors = Object.keys(counts).sort((a, b) => {
      const order = [
        '李白','杜甫','王维','孟浩然','王昌龄','高适','岑参','李商隐','杜牧',
        '白居易','刘禹锡','元稹','张九龄','王之涣','王勃','骆宾王','贺知章',
        '陈子昂','李贺','温庭筠','韦应物','柳宗元',
        '苏轼','李清照','辛弃疾','柳永','李煜','欧阳修','周邦彦','陆游','秦观',
        '范仲淹','王安石','姜夔','晏殊','晏几道','岳飞','贺铸','张先','王观',
        '刘克庄','叶梦得','陈与义','刘辰翁','文天祥',
        '马致远','关汉卿','白朴','张养浩','睢景臣','王实甫','张可久','徐再思',
        '乔吉','郑光祖',
        '纳兰性德','龚自珍','郑燮','袁枚','赵翼','查慎行','黄景仁','林则徐',
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

  // ---------- 年级下拉框 ----------
  function populateGradeFilter() {
    const grades = [
      '小学一年级', '小学二年级', '小学三年级', '小学四年级', '小学五年级', '小学六年级',
      '初中七年级', '初中八年级', '初中九年级',
      '高中一年级', '高中二年级', '高中三年级',
      '课外拓展'
    ];
    grades.forEach(g => {
      const opt = document.createElement('option');
      opt.value = g;
      opt.textContent = g;
      $grade.appendChild(opt);
    });
  }

  // ---------- 诗词过滤 + 渲染 ----------
  function filterPoems() {
    const kw = $search.value.trim().toLowerCase();
    const author = $author.value;
    const grade = $grade.value;
    const grades = (typeof GRADES !== 'undefined') ? GRADES : {};
    return ALL.filter(p => {
      const matchType = currentType === 'all' || p.type === currentType;
      const matchAuthor = !author || p.author === author;
      const matchGrade = !grade || grades[String(p.id)] === grade;
      const matchKw = !kw ||
        p.title.toLowerCase().includes(kw) ||
        p.author.toLowerCase().includes(kw) ||
        (p.cipai || p.qupai || '').toLowerCase().includes(kw);
      return matchType && matchAuthor && matchGrade && matchKw;
    });
  }

  function renderPoemList(items) {
    $list.innerHTML = '';
    $visible.textContent = items.length;
    if (items.length === 0) {
      $empty.hidden = false;
      return;
    }
    $empty.hidden = true;
    const frag = document.createDocumentFragment();
    const grades = (typeof GRADES !== 'undefined') ? GRADES : {};
    items.forEach(p => {
      const card = document.createElement('article');
      card.className = 'poem-card';
      card.tabIndex = 0;
      card.setAttribute('role', 'button');
      card.setAttribute('aria-label', `查看《${p.title}》`);
      card.dataset.id = p.id;
      card.dataset.type = p.type;

      const previewLines = p.content.slice(0, 2).join('');

      const nameTag = p.type === 'ci' && p.cipai
        ? `<span class="cipai-tag">${escapeHtml(p.cipai)}</span>`
        : p.type === 'qu' && p.qupai
          ? `<span class="cipai-tag">${escapeHtml(p.qupai)}</span>`
          : '';

      const typeBadge = `<span class="type-badge type-${p.type}">${TYPE_LABELS[p.type] || p.type}</span>`;

      const gradeLabel = grades[String(p.id)] || '';
      const gradeTag = gradeLabel
        ? `<span class="grade-badge ${getGradeClass(gradeLabel)}">${escapeHtml(gradeLabel)}</span>`
        : '';

      card.innerHTML = `
        <div class="card-header">
          ${typeBadge}
          ${nameTag}
          ${gradeTag}
        </div>
        <h3 class="card-title">${escapeHtml(p.title)}</h3>
        <p class="card-author">— <span class="author-link" data-author="${escapeHtml(p.author)}">${escapeHtml(p.author)}</span> —</p>
        <p class="card-preview">${escapeHtml(previewLines)}</p>
        <span class="card-arrow" aria-hidden="true">→</span>
      `;
      frag.appendChild(card);
    });
    $list.appendChild(frag);
  }

  function refreshPoemList() {
    renderPoemList(filterPoems());
  }

  // ---------- 作者列表渲染 ----------
  function renderAuthorList() {
    // 优先用 AUTHORS 数组；若无，则从 ALL 中聚合
    let authors = (typeof AUTHORS !== 'undefined' && Array.isArray(AUTHORS)) ? AUTHORS.slice() : [];

    if (authors.length === 0) {
      // 从诗的数据聚合
      const map = {};
      ALL.forEach(p => {
        if (!map[p.author]) {
          map[p.author] = { name: p.author, count: 0, dynasty: guessDynasty(p.type) };
        }
        map[p.author].count++;
      });
      authors = Object.values(map);
    }

    // 按朝代 → 出生年 排序
    authors.sort((a, b) => {
      const da = DYNASTY_ORDER[a.dynasty] || 99;
      const db = DYNASTY_ORDER[b.dynasty] || 99;
      if (da !== db) return da - db;
      return (parseInt(a.birth, 10) || 9999) - (parseInt(b.birth, 10) || 9999);
    });

    $authorCount.textContent = authors.length;
    $authorList.innerHTML = '';
    const frag = document.createDocumentFragment();
    let lastDynasty = '';
    authors.forEach(a => {
      // 按朝代分组添加小标题
      if (a.dynasty && a.dynasty !== lastDynasty) {
        const groupTitle = document.createElement('div');
        groupTitle.className = 'dynasty-header';
        groupTitle.textContent = `【${a.dynasty}】`;
        frag.appendChild(groupTitle);
        lastDynasty = a.dynasty;
      }

      const card = document.createElement('article');
      card.className = 'author-card';
      card.tabIndex = 0;
      card.setAttribute('role', 'button');
      card.dataset.name = a.name;
      const yearText = a.death
        ? `${a.birth} — ${a.death}`
        : `${a.birth} —`;
      card.innerHTML = `
        <h3 class="author-name">${escapeHtml(a.name)}</h3>
        <p class="author-meta">${escapeHtml(yearText)} · ${escapeHtml(a.dynasty || '')}</p>
        <p class="author-preview">${escapeHtml((a.bio || '').slice(0, 60))}…</p>
        <span class="card-arrow" aria-hidden="true">→</span>
      `;
      frag.appendChild(card);
    });
    $authorList.appendChild(frag);
  }

  function guessDynasty(type) {
    if (type === 'shi' || type === 'ci' || type === 'qu') return '唐宋元';
    if (type === 'qing') return '清';
    if (type === 'modern') return '现代';
    return '';
  }

  // ---------- 弹窗 ----------
  function openModal(poem) {
    $modalTitle.textContent = poem.title;
    $modalAuthor.innerHTML = `— <span class="author-link" data-author="${escapeHtml(poem.author)}">${escapeHtml(poem.author)}</span> —`;

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

    // 创作背景
    currentPoemId = poem.id;
    const bg = (typeof BACKGROUNDS !== 'undefined') ? BACKGROUNDS[String(poem.id)] : null;
    if (bg) {
      $bgToggle.style.display = '';
      $bgContent.textContent = bg;
      $bgContent.hidden = true;
      $bgToggle.setAttribute('aria-expanded', 'false');
      $bgToggle.querySelector('.bg-arrow').textContent = '▾';
    } else {
      $bgToggle.style.display = 'none';
      $bgContent.hidden = true;
    }

    $modal.hidden = false;
    $modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    $modal.hidden = true;
    $modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  function openAuthorModal(author) {
    $authorModalTitle.textContent = author.name;
    $authorModalDynasty.textContent = author.dynasty || '';
    $authorModalYear.textContent = author.death
      ? `（${author.birth} — ${author.death}）`
      : `（${author.birth} — ）`;
    $authorModalBio.innerHTML = (author.bio || '暂无简介')
      .split('\n')
      .filter(line => line.trim())
      .map(line => `<p>${escapeHtml(line)}</p>`)
      .join('');
    $authorModal.hidden = false;
    $authorModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeAuthorModal() {
    $authorModal.hidden = true;
    $authorModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  // ---------- 视图切换 ----------
  function switchView(viewName) {
    $navBtns.forEach(btn => {
      const isActive = btn.dataset.view === viewName;
      btn.classList.toggle('active', isActive);
    });
    if (viewName === 'poems') {
      $poemView.hidden = false;
      $poemView.classList.add('active');
      $authorView.hidden = true;
      $authorView.classList.remove('active');
    } else if (viewName === 'authors') {
      $poemView.hidden = true;
      $poemView.classList.remove('active');
      $authorView.hidden = false;
      $authorView.classList.add('active');
    }
    // 切视图时关闭可能打开的弹窗
    closeModal();
    closeAuthorModal();
  }

  // ---------- 事件 ----------
  function bindEvents() {
    // 导航按钮
    $navBtns.forEach(btn => {
      btn.addEventListener('click', () => switchView(btn.dataset.view));
    });

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
        refreshPoemList();
      });
    });

    // 搜索（防抖 200ms）
    let timer = null;
    $search.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(refreshPoemList, 200);
    });

    // 作者筛选
    $author.addEventListener('change', refreshPoemList);

    // 年级筛选
    $grade.addEventListener('change', refreshPoemList);

    // 诗词卡片点击
    $list.addEventListener('click', e => {
      // 先检查是否点击了作者链接
      const authorLink = e.target.closest('.author-link');
      if (authorLink) {
        e.stopPropagation();
        const name = authorLink.dataset.author;
        const author = (typeof AUTHORS !== 'undefined' && Array.isArray(AUTHORS))
          ? AUTHORS.find(a => a.name === name)
          : null;
        if (author) openAuthorModal(author);
        return;
      }
      const card = e.target.closest('.poem-card');
      if (!card) return;
      const poem = ALL.find(p => p.id === Number(card.dataset.id));
      if (poem) openModal(poem);
    });

    // 诗词卡片键盘
    $list.addEventListener('keydown', e => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const card = e.target.closest('.poem-card');
      if (!card) return;
      e.preventDefault();
      const poem = ALL.find(p => p.id === Number(card.dataset.id));
      if (poem) openModal(poem);
    });

    // 作者卡片点击
    $authorList.addEventListener('click', e => {
      const card = e.target.closest('.author-card');
      if (!card) return;
      const name = card.dataset.name;
      const author = (typeof AUTHORS !== 'undefined' && Array.isArray(AUTHORS))
        ? AUTHORS.find(a => a.name === name)
        : null;
      if (author) openAuthorModal(author);
    });

    // 作者卡片键盘
    $authorList.addEventListener('keydown', e => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const card = e.target.closest('.author-card');
      if (!card) return;
      e.preventDefault();
      const name = card.dataset.name;
      const author = (typeof AUTHORS !== 'undefined' && Array.isArray(AUTHORS))
        ? AUTHORS.find(a => a.name === name)
        : null;
      if (author) openAuthorModal(author);
    });

    // 创作背景切换
    $bgToggle.addEventListener('click', () => {
      const expanded = $bgToggle.getAttribute('aria-expanded') === 'true';
      $bgToggle.setAttribute('aria-expanded', expanded ? 'false' : 'true');
      $bgContent.hidden = expanded;
      $bgToggle.querySelector('.bg-arrow').textContent = expanded ? '▾' : '▴';
    });

    // 关闭弹窗
    document.addEventListener('click', e => {
      // 弹窗内作者名字点击
      const authorLink = e.target.closest('.author-link');
      if (authorLink) {
        e.stopPropagation();
        const name = authorLink.dataset.author;
        const author = (typeof AUTHORS !== 'undefined' && Array.isArray(AUTHORS))
          ? AUTHORS.find(a => a.name === name)
          : null;
        if (author) openAuthorModal(author);
        return;
      }
      if (e.target.dataset && e.target.dataset.close !== undefined) {
        if (!$modal.hidden) closeModal();
        if (!$authorModal.hidden) closeAuthorModal();
      }
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        if (!$modal.hidden) closeModal();
        if (!$authorModal.hidden) closeAuthorModal();
      }
    });
  }

  // ---------- 工具 ----------
  function getGradeClass(grade) {
    if (!grade) return '';
    if (grade.startsWith('小学')) return 'grade-primary';
    if (grade.startsWith('初中')) return 'grade-middle';
    if (grade.startsWith('高中')) return 'grade-high';
    if (grade === '课外拓展') return 'grade-extra';
    return '';
  }

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
