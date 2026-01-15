(function contentsModule() {
  const CATEGORY_LABELS = {
    immigration: '移民問題',
    special: '番外編',
    music: '音楽',
    media: 'マスコミ',
  };

  const HEADER_ALIASES = {
    id: ['id', '動画id', 'video id'],
    title: ['title', 'name', 'タイトル'],
    description: ['description', '概要', 'details', '説明'],
    category: ['category', 'カテゴリ', 'カテゴリー', 'ジャンル'],
    playlist: ['playlist', 'play_list1', 'play list', 'プレイリスト', 'プレイリスト1'],
    publishedAt: ['published_at', 'publishedat', 'published at', '公開日', '公開日時', 'date'],
    duration: ['duration', 'length', '再生時間', '時間'],
    url: ['url', 'リンク', 'video url', 'リンクurl', '動画url'],
    shortUrl: ['short_url', 'shorturl', 'short link', 'ショートurl'],
    thumbnail: ['thumbnail', 'image', 'サムネイル', 'サムネイルurl'],
    likes: ['likes', 'いいね', 'いいね数', '高評価', 'likecount'],
    views: ['views', 'view_count', '閲覧数', '再生数', '視聴数', 'viewcount'],
    shortLikes: ['likecountshort', 'likes_short', 'shortlikes', 'short_like', 'short likes'],
    shortViews: ['viewcountshort', 'views_short', 'shortviews', 'short_view', 'short views'],
  };

  const SORT_KEYS = {
    PUBLISHED_DESC: 'published-desc',
    PUBLISHED_ASC: 'published-asc',
    POPULAR: 'popular',
  };

  const DEFAULT_SORT = SORT_KEYS.PUBLISHED_DESC;
  const PAGE_SIZE_OPTIONS = [30, 50, 100];
  const DEFAULT_PAGE_SIZE = PAGE_SIZE_OPTIONS[0];

  const state = {
    videos: [],
    isLoaded: false,
    loadError: null,
    now: new Date(),
  };

  function isPublished(item, referenceDate = state.now) {
    const publishedTime = getDateValue(item);
    if (!publishedTime) {
      return false;
    }

    const publishedDate = new Date(publishedTime);
    publishedDate.setHours(12, 0, 0, 0);

    return referenceDate.getTime() >= publishedDate.getTime();
  }

  function escapeHtml(value) {
    if (value === undefined || value === null) {
      return '';
    }
    return String(value).replace(/[&<>"']/g, (char) => {
      switch (char) {
        case '&':
          return '&amp;';
        case '<':
          return '&lt;';
        case '>':
          return '&gt;';
        case '"':
          return '&quot;';
        case "'":
          return '&#39;';
        default:
          return char;
      }
    });
  }

  function normalizeHttpUrl(rawUrl) {
    if (!rawUrl) {
      return '';
    }
    const trimmed = rawUrl.trim();
    if (!trimmed) {
      return '';
    }
    if (/^https?:\/\//i.test(trimmed)) {
      return trimmed;
    }
    return '';
  }

  function normalizeUrl(rawUrl) {
    if (!rawUrl) {
      return '';
    }
    const trimmed = rawUrl.trim();
    if (!trimmed) {
      return '';
    }
    if (/^https?:\/\//i.test(trimmed)) {
      return trimmed;
    }
    return `https://${trimmed}`;
  }

  function extractYoutubeId(rawUrl) {
    if (!rawUrl) {
      return '';
    }

    const normalized = normalizeUrl(rawUrl);
    try {
      const url = new URL(normalized);
      const hostname = url.hostname.replace(/^www\./i, '').toLowerCase();

      if (hostname === 'youtu.be') {
        const id = url.pathname.replace(/^\//, '').split('/')[0];
        if (id) return id;
      }

      if (hostname.endsWith('youtube.com')) {
        if (url.pathname.startsWith('/embed/')) {
          const id = url.pathname.split('/')[2];
          if (id) return id;
        }
        const v = url.searchParams.get('v');
        if (v) return v;
      }
    } catch (error) {
      // noop
    }

    const fallbackMatch = rawUrl.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
    if (fallbackMatch && fallbackMatch[1]) {
      return fallbackMatch[1];
    }

    return '';
  }

  function parseNumber(value) {
    if (!value) {
      return null;
    }
    const cleaned = value.replace(/[^0-9]/g, '');
    if (!cleaned) {
      return null;
    }
    const number = Number(cleaned);
    if (Number.isNaN(number)) {
      return null;
    }
    return number;
  }

  function parseDateToTimestamp(value) {
    if (!value) {
      return null;
    }
    const raw = String(value).trim();
    if (!raw) {
      return null;
    }

    if (raw.replace(/[^0-9]/g, '').length !== 8) {
      return null;
    }

    let date = new Date(raw);
    if (Number.isNaN(date.getTime())) {
      const normalized = raw.replace(/[\.年]/g, '-').replace(/[月]/g, '-').replace(/[日]/g, '').replace(/\s+/g, '-');
      const match = normalized.match(/^([0-9]{4})[-/]?([0-9]{1,2})[-/]?([0-9]{1,2})$/);
      if (match) {
        const [, year, monthStr, dayStr] = match;
        const month = Number(monthStr);
        const day = Number(dayStr);
        if (!Number.isNaN(month) && !Number.isNaN(day)) {
          date = new Date(Number(year), month - 1, day);
        }
      }
    }

    const time = date.getTime();
    return Number.isNaN(time) ? null : time;
  }

  function getDateValue(item) {
    if (item.publishedTimestamp !== undefined && item.publishedTimestamp !== null) {
      return item.publishedTimestamp;
    }
    const time = parseDateToTimestamp(item.publishedAt);
    return time ?? 0;
  }

  function sortVideos(list, sortKey = DEFAULT_SORT) {
    const sorted = [...list];

    switch (sortKey) {
      case SORT_KEYS.PUBLISHED_ASC:
        sorted.sort((a, b) => getDateValue(a) - getDateValue(b));
        break;
      case SORT_KEYS.POPULAR:
        sorted.sort((a, b) => {
          const viewsDiff = (b.views ?? 0) + (b.shortViews ?? 0) - ((a.views ?? 0) + (a.shortViews ?? 0));
          if (viewsDiff !== 0) {
            return viewsDiff;
          }
          const likesDiff = (b.likes ?? 0) + (b.shortLikes ?? 0) - ((a.likes ?? 0) + (a.shortLikes ?? 0));
          if (likesDiff !== 0) {
            return likesDiff;
          }
          return getDateValue(b) - getDateValue(a);
        });
        break;
      case SORT_KEYS.PUBLISHED_DESC:
      default:
        sorted.sort((a, b) => getDateValue(b) - getDateValue(a));
        break;
    }

    return sorted;
  }

  function renderMessage(container, className, message, detail) {
    const safeDetail = detail ? `<br><small>${escapeHtml(detail)}</small>` : '';
    container.innerHTML = `<p class="${className}">${message}${safeDetail}</p>`;
  }

  function buildProxyUrl(url) {
    if (!url) return '';
    if (url.startsWith('https://r.jina.ai/')) {
      return url;
    }
    if (/^https?:\/\//i.test(url)) {
      return `https://r.jina.ai/${url}`;
    }
    return `https://r.jina.ai/https://${url}`;
  }

  async function fetchCsvText(url) {
    const attemptFetch = async (target) => {
      const response = await fetch(target, { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return response.text();
    };

    try {
      return await attemptFetch(url);
    } catch (error) {
      const proxyUrl = buildProxyUrl(url);
      if (proxyUrl && proxyUrl !== url) {
        try {
          return await attemptFetch(proxyUrl);
        } catch (proxyError) {
          throw new Error(`${error.message || error} / Proxy: ${proxyError.message || proxyError}`);
        }
      }
      throw error;
    }
  }

  function parseCsv(text) {
    const rows = [];
    let currentRow = [];
    let currentValue = '';
    let insideQuotes = false;

    for (let i = 0; i < text.length; i += 1) {
      const char = text[i];
      if (char === '"') {
        if (insideQuotes && text[i + 1] === '"') {
          currentValue += '"';
          i += 1;
        } else {
          insideQuotes = !insideQuotes;
        }
      } else if (char === ',' && !insideQuotes) {
        currentRow.push(currentValue);
        currentValue = '';
      } else if ((char === '\n' || char === '\r') && !insideQuotes) {
        if (char === '\r' && text[i + 1] === '\n') {
          i += 1;
        }
        currentRow.push(currentValue);
        rows.push(currentRow);
        currentRow = [];
        currentValue = '';
      } else {
        currentValue += char;
      }
    }

    if (currentRow.length || currentValue) {
      currentRow.push(currentValue);
      rows.push(currentRow);
    }

    return rows.filter((row) => row.length);
  }

  function normalizeCategory(rawValue) {
    if (!rawValue) {
      return { key: 'immigration', label: CATEGORY_LABELS.immigration };
    }
    const trimmed = rawValue.trim();
    const lower = trimmed.toLowerCase();

    if (lower === 'immigration' || trimmed === '移民問題') {
      return { key: 'immigration', label: CATEGORY_LABELS.immigration };
    }
    if (lower === 'special' || trimmed === '番外編' || trimmed === 'プレイリスト番外編') {
      return { key: 'special', label: CATEGORY_LABELS.special };
    }
    if (lower === 'music' || trimmed === '音楽') {
      return { key: 'music', label: CATEGORY_LABELS.music };
    }
    if (lower === 'media' || lower === 'massmedia' || trimmed === 'マスコミ' || trimmed === 'メディア') {
      return { key: 'media', label: CATEGORY_LABELS.media };
    }

    return { key: 'immigration', label: CATEGORY_LABELS.immigration };
  }

  function pickValueFromRow(rowMap, key) {
    const aliases = HEADER_ALIASES[key] || [];
    for (let i = 0; i < aliases.length; i += 1) {
      const alias = aliases[i].toLowerCase();
      const value = rowMap[alias];
      if (value !== undefined && value !== '') {
        const trimmed = value.trim();
        if (!trimmed) {
          continue;
        }
        const lower = trimmed.toLowerCase();
        if (lower === 'none' || lower === 'null' || lower === 'undefined' || lower === 'n/a' || lower === '-') {
          continue;
        }
        return trimmed;
      }
    }
    return '';
  }

  function mapRowToObject(headers, row) {
    const map = {};
    headers.forEach((header, index) => {
      if (!header) return;
      const key = header.trim().toLowerCase();
      map[key] = (row[index] ?? '').trim();
    });
    return map;
  }

  function createVideoFromRow(rowMap) {
    const title = pickValueFromRow(rowMap, 'title');
    const url = pickValueFromRow(rowMap, 'url');
    if (!title || !url) {
      return null;
    }

    const normalizedUrl = normalizeUrl(url);
    const categoryValue = pickValueFromRow(rowMap, 'category') || pickValueFromRow(rowMap, 'playlist');
    const categoryInfo = normalizeCategory(categoryValue);
    const description = pickValueFromRow(rowMap, 'description');
    const publishedAt = pickValueFromRow(rowMap, 'publishedAt');
    const publishedTimestamp = parseDateToTimestamp(publishedAt);
    const duration = pickValueFromRow(rowMap, 'duration');
    const providedThumbnail = pickValueFromRow(rowMap, 'thumbnail');
    const youtubeId = extractYoutubeId(normalizedUrl);
    const thumbnail =
      providedThumbnail || (youtubeId ? `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg` : 'assets/img/placeholder.png');
    const likes = parseNumber(pickValueFromRow(rowMap, 'likes'));
    const views = parseNumber(pickValueFromRow(rowMap, 'views'));
    const shortUrl = normalizeHttpUrl(pickValueFromRow(rowMap, 'shortUrl'));
    const shortLikes = parseNumber(pickValueFromRow(rowMap, 'shortLikes'));
    const shortViews = parseNumber(pickValueFromRow(rowMap, 'shortViews'));
    const idValue = pickValueFromRow(rowMap, 'id');
    const fallback = `${title}-${publishedAt}-${url}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    if (!normalizedUrl) {
      return null;
    }

    return {
      id: idValue || fallback || `video-${Math.random().toString(36).slice(2)}`,
      title,
      description,
      category: categoryInfo.key,
      categoryLabel: categoryInfo.label,
      publishedAt,
      publishedTimestamp: publishedTimestamp ?? 0,
      duration,
      url: normalizedUrl,
      thumbnail,
      shortUrl,
      likes,
      views,
      shortLikes,
      shortViews,
    };
  }

  function convertCsvToVideos(text) {
    const table = parseCsv(text);
    if (!table.length) {
      return [];
    }

    const headers = table.shift().map((header) => (header || '').trim().toLowerCase());
    const rows = table.filter((row) => row.some((cell) => (cell || '').trim() !== ''));

    const result = rows
      .map((row) => mapRowToObject(headers, row))
      .map((rowMap) => createVideoFromRow(rowMap))
      .filter((item) => item);

    return sortVideos(result, SORT_KEYS.PUBLISHED_DESC);
  }

  async function loadVideoData() {
    const csvUrl = window.AppConfig?.videosCsvUrl;
    if (!csvUrl) {
      state.isLoaded = true;
      return;
    }

    try {
      const text = await fetchCsvText(csvUrl);
      state.videos = convertCsvToVideos(text);
      state.loadError = null;
    } catch (error) {
      state.videos = [];
      state.loadError = error;
      console.error('動画データの読み込みに失敗しました', error);
    } finally {
      state.isLoaded = true;
    }
  }

  function renderLatest() {
    state.now = new Date();
    const latestContainer = document.getElementById('latest');
    if (!latestContainer) {
      return;
    }

    if (!state.isLoaded) {
      renderMessage(latestContainer, 'loading-state', '読み込み中...');
      return;
    }

    if (state.loadError) {
      renderMessage(
        latestContainer,
        'empty-state',
        '動画情報を取得できませんでした。時間をおいて再度お試しください。',
        state.loadError?.message,
      );
      return;
    }

    const publishedVideos = state.videos.filter((item) => isPublished(item));
    const items = sortVideos(publishedVideos, SORT_KEYS.PUBLISHED_DESC).slice(0, window.AppConfig?.latestLimit || 6);
    if (!items.length) {
      renderMessage(latestContainer, 'empty-state', '最新動画は準備中です。');
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

    const thumbnailWrapper = window.App.createElement('div', {
      className: 'card-thumbnail',
      children: [thumb],
    });

    const title = window.App.createElement('h3', {
      className: 'card-title',
      text: item.title,
    });

    const categoryLabel = item.category || 'immigration';
    const meta = window.App.createElement('div', {
      className: 'card-meta',
      children: [
        window.App.createElement('span', {
          className: `badge badge-${categoryLabel}`,
          text: item.categoryLabel || CATEGORY_LABELS[item.category] || 'その他',
        }),
        window.App.createElement('span', { text: window.App.formatDate(item.publishedAt) }),
        item.duration ? window.App.createElement('span', { text: `再生時間 ${item.duration}` }) : null,
      ],
    });

    const likeValue =
      item.likes !== null && item.likes !== undefined
        ? window.App.formatNumber(item.likes)
        : null;
    const likeShortValue =
      item.shortLikes !== null && item.shortLikes !== undefined
        ? window.App.formatNumber(item.shortLikes)
        : null;
    const combinedLikes = (() => {
      const values = [likeValue, likeShortValue].filter(Boolean);
      if (!values.length) {
        return '—';
      }
      return `${values.join('+')}件`;
    })();
    const viewValue =
      item.views !== null && item.views !== undefined
        ? window.App.formatNumber(item.views)
        : null;
    const viewShortValue =
      item.shortViews !== null && item.shortViews !== undefined
        ? window.App.formatNumber(item.shortViews)
        : null;
    const combinedViews = (() => {
      const values = [viewValue, viewShortValue].filter(Boolean);
      if (!values.length) {
        return '—';
      }
      return `${values.join('+')}回`;
    })();
    const publishedValueRaw = item.publishedAt ? window.App.formatDate(item.publishedAt) : '';
    const publishedValue = publishedValueRaw && publishedValueRaw.trim() ? publishedValueRaw : '—';

    const createStatItem = (icon, label, iconClass = '') =>
      window.App.createElement('span', {
        className: 'stat-item',
        children: [
          window.App.createElement('span', {
            className: `icon ${iconClass}`.trim(),
            text: icon,
            attrs: { 'aria-hidden': 'true' },
          }),
          window.App.createElement('span', { className: 'stat-text', text: label }),
        ],
      });

    const stats = window.App.createElement('div', {
      className: 'card-stats',
      children: [
        createStatItem('❤', combinedLikes, 'icon-heart'),
        createStatItem('👁', combinedViews, 'icon-view'),
      ],
    });

    const actionButtons = [
      window.App.createElement('a', {
        text: '視聴する',
        className: 'action-primary',
        attrs: {
          href: item.url,
          target: '_blank',
          rel: 'noopener noreferrer',
        },
      }),
    ];

    if (item.shortUrl) {
      actionButtons.push(
        window.App.createElement('a', {
          text: 'ショート',
          className: 'action-secondary',
          attrs: {
            href: item.shortUrl,
            target: '_blank',
            rel: 'noopener noreferrer',
          },
        }),
      );
    }

    const actions = window.App.createElement('div', {
      className: 'card-actions',
      children: actionButtons,
    });

    card.appendChild(thumbnailWrapper);
    card.appendChild(title);
    card.appendChild(meta);
    card.appendChild(stats);
    card.appendChild(actions);

    return card;
  }

  function initContentsPage() {
    const cardsContainer = document.getElementById('cards');
    if (!cardsContainer) {
      return () => {};
    }

    const badge = document.querySelector('[data-count-badge]');
    const tabButtons = document.querySelectorAll('.tab-button');
    const searchInput = document.querySelector('[data-search-input]');
    const sortSelect = document.querySelector('[data-sort-select]');
    const pageSizeSelect = document.querySelector('[data-page-size]');
    const paginationContainer = document.getElementById('pagination');

    let currentTab = document.querySelector('.tab-button.active')?.dataset.category || 'immigration';
    let currentQuery = '';
    let currentSort = sortSelect?.value || DEFAULT_SORT;
    let currentPageSize = pageSizeSelect ? Number(pageSizeSelect.value) : DEFAULT_PAGE_SIZE;
    let currentPage = 1;

    const setBadge = (text) => {
      if (badge) {
        badge.textContent = text;
      }
    };

    const renderLoading = () => {
      renderMessage(cardsContainer, 'loading-state', '読み込み中...');
      setBadge('--');
      togglePagination(false);
    };

    const renderError = () => {
      renderMessage(
        cardsContainer,
        'empty-state',
        '動画情報を取得できませんでした。時間をおいて再度お試しください。',
        state.loadError?.message,
      );
      setBadge('0件');
      togglePagination(false);
    };

    const renderEmpty = () => {
      renderMessage(cardsContainer, 'empty-state', '条件に合う動画が見つかりませんでした。');
      setBadge('0件');
      togglePagination(false);
    };

    const renderList = (list) => {
      cardsContainer.innerHTML = '';
      const grid = document.createElement('div');
      grid.className = 'card-grid';

      list.forEach((item) => {
        const card = createVideoCard(item);
        grid.appendChild(card);
      });

      cardsContainer.appendChild(grid);
    };

    const togglePagination = (visible) => {
      if (!paginationContainer) {
        return;
      }
      if (visible) {
        paginationContainer.classList.add('is-visible');
      } else {
        paginationContainer.classList.remove('is-visible');
        paginationContainer.innerHTML = '';
      }
    };

    const buildPageNumbers = (totalPages, page) => {
      const pages = [];
      const delta = 2;
      const start = Math.max(1, page - delta);
      const end = Math.min(totalPages, page + delta);

      if (start > 1) {
        pages.push(1);
        if (start > 2) {
          pages.push('ellipsis');
        }
      }

      for (let i = start; i <= end; i += 1) {
        pages.push(i);
      }

      if (end < totalPages) {
        if (end < totalPages - 1) {
          pages.push('ellipsis');
        }
        pages.push(totalPages);
      }

      return pages;
    };

    const renderPagination = (meta) => {
      if (!paginationContainer) {
        return;
      }

      const { totalItems, totalPages, page, pageSize, startIndex, endIndex } = meta;

      if (totalPages <= 1 || totalItems === 0) {
        togglePagination(false);
        return;
      }

      togglePagination(true);
      paginationContainer.innerHTML = '';

      const info = window.App.createElement('div', {
        className: 'pagination-info',
        text: `全${window.App.formatNumber(totalItems)}件中 ${window.App.formatNumber(startIndex)}〜${window.App.formatNumber(endIndex)}件を表示`,
      });

      const nav = window.App.createElement('div', { className: 'pagination-nav' });

      const createPageButton = (label, targetPage, options = {}) => {
        const button = window.App.createElement('button', { text: label });
        if (options.disabled) {
          button.setAttribute('disabled', 'true');
        }
        if (options.active) {
          button.classList.add('is-active');
        }
        button.addEventListener('click', () => {
          if (targetPage === page || options.disabled) {
            return;
          }
          currentPage = targetPage;
          applyFilters();
        });
        return button;
      };

      const prevButton = createPageButton('前へ', Math.max(1, page - 1), { disabled: page === 1 });
      nav.appendChild(prevButton);

      const pageNumbers = buildPageNumbers(totalPages, page);
      pageNumbers.forEach((value) => {
        if (value === 'ellipsis') {
          const ellipsis = window.App.createElement('span', {
            className: 'pagination-ellipsis',
            text: '…',
          });
          nav.appendChild(ellipsis);
          return;
        }
        nav.appendChild(createPageButton(String(value), value, { active: value === page }));
      });

      const nextButton = createPageButton('次へ', Math.min(totalPages, page + 1), { disabled: page === totalPages });
      nav.appendChild(nextButton);

      paginationContainer.appendChild(info);
      paginationContainer.appendChild(nav);
    };

    const applyFilters = () => {
      state.now = new Date();
      if (!state.isLoaded) {
        renderLoading();
        return;
      }

      if (state.loadError) {
        renderError();
        return;
      }

      const filtered = state.videos.filter((item) => {
        const matchTab = !currentTab || item.category === currentTab;
        const matchQuery = !currentQuery || item.title.toLowerCase().includes(currentQuery);
        const published = isPublished(item);
        return matchTab && matchQuery && published;
      });

      if (!filtered.length) {
        renderEmpty();
        return;
      }

      const sorted = sortVideos(filtered, currentSort);

      if (!PAGE_SIZE_OPTIONS.includes(currentPageSize)) {
        currentPageSize = DEFAULT_PAGE_SIZE;
      }

      const totalItems = sorted.length;
      const totalPages = Math.max(1, Math.ceil(totalItems / currentPageSize));
      if (currentPage > totalPages) {
        currentPage = totalPages;
      }

      const startIndex = (currentPage - 1) * currentPageSize;
      const endIndex = Math.min(totalItems, startIndex + currentPageSize);
      const pageItems = sorted.slice(startIndex, endIndex);

      renderList(pageItems);
      setBadge(`${totalItems}件`);
      renderPagination({
        totalItems,
        totalPages,
        page: currentPage,
        pageSize: currentPageSize,
        startIndex: startIndex + 1,
        endIndex,
      });
    };

    tabButtons.forEach((button) => {
      const isActive = button.classList.contains('active');
      button.setAttribute('aria-selected', isActive ? 'true' : 'false');

      button.addEventListener('click', () => {
        tabButtons.forEach((btn) => {
          btn.classList.remove('active');
          btn.setAttribute('aria-selected', 'false');
        });
        button.classList.add('active');
        button.setAttribute('aria-selected', 'true');
        currentTab = button.dataset.category || 'immigration';
        currentPage = 1;
        applyFilters();
      });
    });

    if (searchInput) {
      searchInput.addEventListener('input', (event) => {
        currentQuery = event.target.value.trim().toLowerCase();
        currentPage = 1;
        applyFilters();
      });
    }

    if (sortSelect) {
      sortSelect.value = currentSort;
      sortSelect.addEventListener('change', (event) => {
        currentSort = event.target.value || DEFAULT_SORT;
        currentPage = 1;
        applyFilters();
      });
    }

    if (pageSizeSelect) {
      if (!PAGE_SIZE_OPTIONS.includes(Number(pageSizeSelect.value))) {
        pageSizeSelect.value = String(DEFAULT_PAGE_SIZE);
      }
      currentPageSize = Number(pageSizeSelect.value) || DEFAULT_PAGE_SIZE;

      pageSizeSelect.addEventListener('change', (event) => {
        const value = Number(event.target.value);
        currentPageSize = PAGE_SIZE_OPTIONS.includes(value) ? value : DEFAULT_PAGE_SIZE;
        currentPage = 1;
        applyFilters();
      });
    }

    applyFilters();

    return applyFilters;
  }

  function initContactPage() {
    const formContainer = document.getElementById('form-embed');
    if (!formContainer) return;

    const iframeUrl = window.AppConfig?.contactFormUrl;
    if (iframeUrl) {
      const iframe = document.createElement('iframe');
      iframe.src = iframeUrl;
      iframe.width = '100%';
      iframe.height = '1400';
      iframe.style.border = '0';
      iframe.loading = 'lazy';
      iframe.title = 'お問い合わせフォーム';
      iframe.className = 'form-embed-frame';
      formContainer.appendChild(iframe);
    } else {
      const notice = document.createElement('p');
      notice.className = 'empty-state';
      notice.textContent = 'お問い合わせフォームの準備中です。しばらくお待ちください。';
      formContainer.appendChild(notice);
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    const refreshContents = initContentsPage();
    initContactPage();
    renderLatest();

    loadVideoData()
      .catch(() => {})
      .finally(() => {
        state.now = new Date();
        renderLatest();
        refreshContents();
      });
  });

  window.Contents = {
    categories: CATEGORY_LABELS,
    getLatest(limit) {
      const size = limit || window.AppConfig?.latestLimit || 6;
      const publishedVideos = state.videos.filter((video) => isPublished(video));
      return sortVideos(publishedVideos, SORT_KEYS.PUBLISHED_DESC).slice(0, size);
    },
    get all() {
      return state.videos;
    },
  };
})();

