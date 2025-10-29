(function contentsModule() {
  const categories = {
    immigration: '移民問題',
    special: '番外編',
    music: '音楽',
  };

  const videos = [
    {
      id: 'ep-015',
      title: '地域共生をどう実現するか',
      description: '現場で活動する支援団体に聞く、多文化共生のヒント。',
      category: 'immigration',
      publishedAt: '2024-09-15',
      duration: '18:42',
      url: 'https://www.example.com/videos/ep-015',
      thumbnail: 'assets/img/placeholder.png',
    },
    {
      id: 'ep-014',
      title: '技能実習制度はどこへ向かうのか',
      description: '制度改正案を読み解きながら労働環境改善への道を探る。',
      category: 'immigration',
      publishedAt: '2024-08-30',
      duration: '21:05',
      url: 'https://www.example.com/videos/ep-014',
      thumbnail: 'assets/img/placeholder.png',
    },
    {
      id: 'sp-003',
      title: '政策担当者と考える受け入れ枠拡大',
      description: '行政担当者を招いた公開ラウンドテーブルのダイジェスト。',
      category: 'special',
      publishedAt: '2024-08-18',
      duration: '16:28',
      url: 'https://www.example.com/videos/sp-003',
      thumbnail: 'assets/img/placeholder.png',
    },
    {
      id: 'ep-013',
      title: '若者と考えるボーダーの意味',
      description: '学生ワークショップの様子を追いながら求められる受け皿を考察。',
      category: 'immigration',
      publishedAt: '2024-07-22',
      duration: '19:13',
      url: 'https://www.example.com/videos/ep-013',
      thumbnail: 'assets/img/placeholder.png',
    },
    {
      id: 'mu-002',
      title: '境界線を越えるメロディー',
      description: '移民ルーツのアーティストと共に作る新録セッション。',
      category: 'music',
      publishedAt: '2024-06-28',
      duration: '12:52',
      url: 'https://www.example.com/videos/mu-002',
      thumbnail: 'assets/img/placeholder.png',
    },
    {
      id: 'ep-012',
      title: '外国人児童の教育を支える現場',
      description: '多言語教室の先生たちが語る、教室づくりの工夫。',
      category: 'immigration',
      publishedAt: '2024-06-02',
      duration: '17:04',
      url: 'https://www.example.com/videos/ep-012',
      thumbnail: 'assets/img/placeholder.png',
    },
    {
      id: 'sp-002',
      title: 'コミュニティラジオから広がる支援の輪',
      description: '多言語放送を続ける市民団体の取り組みを紹介。',
      category: 'special',
      publishedAt: '2024-05-16',
      duration: '14:37',
      url: 'https://www.example.com/videos/sp-002',
      thumbnail: 'assets/img/placeholder.png',
    },
    {
      id: 'mu-001',
      title: '移民ルーツの音楽家クロストーク',
      description: '異なるバックグラウンドを持つ3人が語る創作の裏側。',
      category: 'music',
      publishedAt: '2024-04-05',
      duration: '24:18',
      url: 'https://www.example.com/videos/mu-001',
      thumbnail: 'assets/img/placeholder.png',
    },
    {
      id: 'sp-001',
      title: '現場リポート：農業と移民労働',
      description: '長野県の農業現場を巡り、雇用のリアルを伝える特集。',
      category: 'special',
      publishedAt: '2024-03-25',
      duration: '20:11',
      url: 'https://www.example.com/videos/sp-001',
      thumbnail: 'assets/img/placeholder.png',
    },
  ];

  function sortDescByDate(list) {
    return [...list].sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
  }

  function getLatest(limit) {
    return sortDescByDate(videos).slice(0, limit || window.AppConfig?.latestLimit || 6);
  }

  function renderLatest() {
    const latestContainer = document.getElementById('latest');
    if (!latestContainer) return;

    const items = getLatest(window.AppConfig?.latestLimit);
    if (!items.length) {
      latestContainer.innerHTML = '<p class="empty-state">最新動画は準備中です。</p>';
      return;
    }

    const grid = document.createElement('div');
    grid.className = 'card-grid';

    items.forEach((item) => {
      const card = createVideoCard(item);
      grid.appendChild(card);
    });

    latestContainer.innerHTML = '';
    latestContainer.appendChild(grid);
  }

  function createVideoCard(item) {
    const card = window.App.createElement('article', { className: 'card' });

    const thumb = window.App.createElement('img', {
      attrs: {
        src: item.thumbnail,
        alt: `${item.title}のサムネイル`,
        loading: 'lazy',
      },
    });

    const title = window.App.createElement('h3', {
      className: 'card-title',
      text: item.title,
    });

    const description = window.App.createElement('p', {
      text: item.description,
    });

    const meta = window.App.createElement('div', {
      className: 'card-meta',
      children: [
        window.App.createElement('span', { text: categories[item.category] || 'その他' }),
        window.App.createElement('span', { text: window.App.formatDate(item.publishedAt) }),
        window.App.createElement('span', { text: `再生時間 ${item.duration}` }),
      ],
    });

    const actions = window.App.createElement('div', {
      className: 'card-actions',
      children: [
        window.App.createElement('a', {
          text: '視聴する',
          attrs: {
            href: item.url,
            target: '_blank',
            rel: 'noopener noreferrer',
          },
        }),
      ],
    });

    card.appendChild(thumb);
    card.appendChild(title);
    card.appendChild(description);
    card.appendChild(meta);
    card.appendChild(actions);

    return card;
  }

  function initContentsPage() {
    const cardsContainer = document.getElementById('cards');
    if (!cardsContainer) return;

    const badge = document.querySelector('[data-count-badge]');
    const tabButtons = document.querySelectorAll('.tab-button');
    const searchInput = document.querySelector('[data-search-input]');
    const sortSelect = document.querySelector('[data-sort-select]');

    let currentTab = 'immigration';
    let currentQuery = '';

    function applyFilters() {
      const filtered = videos.filter((item) => {
        const matchTab = currentTab === 'all' || item.category === currentTab;
        const matchQuery = !currentQuery || item.title.toLowerCase().includes(currentQuery);
        return matchTab && matchQuery;
      });

      const sorted = sortDescByDate(filtered);
      updateCards(sorted);
    }

    function updateCards(list) {
      cardsContainer.innerHTML = '';

      if (!list.length) {
        cardsContainer.innerHTML = '<p class="empty-state">条件に合う動画が見つかりませんでした。</p>';
        if (badge) badge.textContent = '0件';
        return;
      }

      const grid = document.createElement('div');
      grid.className = 'card-grid';

      list.forEach((item) => {
        const card = createVideoCard(item);
        grid.appendChild(card);
      });

      cardsContainer.appendChild(grid);
      if (badge) badge.textContent = `${list.length}件`;
    }

    tabButtons.forEach((button) => {
      if (button.classList.contains('active')) {
        button.setAttribute('aria-selected', 'true');
      } else {
        button.setAttribute('aria-selected', 'false');
      }

      button.addEventListener('click', () => {
        tabButtons.forEach((btn) => {
          btn.classList.remove('active');
          btn.setAttribute('aria-selected', 'false');
        });
        button.classList.add('active');
        button.setAttribute('aria-selected', 'true');
        currentTab = button.dataset.category;
        applyFilters();
      });
    });

    if (searchInput) {
      searchInput.addEventListener('input', (event) => {
        currentQuery = event.target.value.trim().toLowerCase();
        applyFilters();
      });
    }

    if (sortSelect) {
      sortSelect.addEventListener('change', applyFilters);
    }

    applyFilters();
  }

  function initContactPage() {
    const formContainer = document.getElementById('form-embed');
    if (!formContainer) return;

    const iframeUrl = window.AppConfig?.contactFormUrl;
    if (iframeUrl) {
      const iframe = document.createElement('iframe');
      iframe.src = iframeUrl;
      iframe.width = '100%';
      iframe.height = '900';
      iframe.style.border = '0';
      iframe.loading = 'lazy';
      iframe.title = 'お問い合わせフォーム';
      formContainer.appendChild(iframe);
    } else {
      const notice = document.createElement('p');
      notice.className = 'empty-state';
      notice.textContent = 'お問い合わせフォームの準備中です。しばらくお待ちください。';
      formContainer.appendChild(notice);
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    renderLatest();
    initContentsPage();
    initContactPage();
  });

  window.Contents = {
    categories,
    videos,
    getLatest,
  };
})();

