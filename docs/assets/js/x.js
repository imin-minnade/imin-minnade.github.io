(function xTimelineModule() {
  const HEADER_ALIASES = {
    id: ['id', 'post_id', 'tweet_id'],
    publishedAt: ['published_at', 'date', 'publishedat', 'posted_at'],
    url: ['url', 'link', 'permalink'],
    content: ['content', 'text', 'body'],
    likes: ['likes', 'likecount', 'metrics_likes', 'favoritecount'],
    reposts: ['reposts', 'retweets', 'retweetcount', 'metrics_retweets', 'shares'],
  };

  const PLACEHOLDER_CONTENT = '投稿内容はスプレッドシートに記載されていません。';

  const state = {
    posts: [],
    isLoaded: false,
    loadError: null,
    useFallback: false,
  };

  function hasContainer() {
    return document.getElementById('x-latest');
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
        if (trimmed.toLowerCase() === 'null' || trimmed.toLowerCase() === 'none' || trimmed === '-') {
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

  function normalizeUrl(rawUrl) {
    if (!rawUrl) {
      return '';
    }
    const trimmed = rawUrl.trim();
    if (!trimmed) {
      return '';
    }
    const converted = trimmed.replace(/^https?:\/\/x\.com\//i, 'https://twitter.com/');
    if (/^https?:\/\//i.test(trimmed)) {
      return converted;
    }
    return '';
  }

  function parseDate(value) {
    if (!value) {
      return null;
    }
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date;
    }
    const compact = value.replace(/[^0-9]/g, '');
    if (compact.length === 8) {
      const year = Number(compact.slice(0, 4));
      const month = Number(compact.slice(4, 6));
      const day = Number(compact.slice(6, 8));
      return new Date(year, month - 1, day);
    }
    return null;
  }

  function convertCsvToPosts(text) {
    const table = parseCsv(text);
    if (!table.length) {
      console.log('[XPosts] CSV parse: empty table');
      return [];
    }

    const posts = [];
    let headers = null;

    const lowerAliasSet = Object.fromEntries(
      Object.entries(HEADER_ALIASES).map(([key, aliases]) => [
        key,
        (aliases || []).map((alias) => alias.toLowerCase()),
      ]),
    );

    const isHeaderRow = (row) => {
      const lower = row.map((cell) => (cell || '').trim().toLowerCase());
      const hasUrl = lower.some((cell) => lowerAliasSet.url?.includes(cell));
      const hasContent = lower.some((cell) => lowerAliasSet.content?.includes(cell));
      const hasDate = lower.some((cell) => lowerAliasSet.publishedAt?.includes(cell));
      // console.log('[XPosts] Header detected:', lower);
      return hasUrl && hasContent && hasDate;
    };

    table.forEach((row) => {
      if (!row || row.every((cell) => !cell || !cell.trim())) {
        return;
      }

      if (isHeaderRow(row)) {
        headers = row.map((header) => (header || '').trim().toLowerCase());
        return;
      }

      if (!headers) {
        // console.log('[XPosts] Row skipped: headers not set yet', row);
        return;
      }

      const rowMap = mapRowToObject(headers, row);
      const url = normalizeUrl(pickValueFromRow(rowMap, 'url'));
      const content = pickValueFromRow(rowMap, 'content');
      const date = parseDate(pickValueFromRow(rowMap, 'publishedAt'));
      if (!url || !date) {
        // console.log('[XPosts] Row skipped: missing required fields', { url, content, date, row: rowMap });
        return;
      }

      const likes = parseNumber(pickValueFromRow(rowMap, 'likes'));
      const reposts = parseNumber(pickValueFromRow(rowMap, 'reposts'));

      // console.log('[XPosts] Row accepted', { url, content, date, likes, reposts });
      posts.push({
        id: pickValueFromRow(rowMap, 'id') || url,
        url,
        content,
        publishedAt: date,
        likes,
        reposts,
        embedHtml: `<blockquote class="twitter-tweet"><a href="${url}"></a></blockquote>`,
      });
    });

    posts.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());
    // console.log('[XPosts] Total posts parsed:', posts.length);
    return posts;
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
      const proxyUrl = url.startsWith('https://r.jina.ai/') ? url : `https://r.jina.ai/${url}`;
      if (proxyUrl && proxyUrl !== url) {
        return attemptFetch(proxyUrl);
      }
      throw error;
    }
  }

  function renderMessage(container, className, message) {
    container.innerHTML = '';
    const msg = window.App.createElement('p', { className, text: message });
    container.appendChild(msg);
  }

  function renderFallback(container) {
    const fallbackUrl = window.AppConfig?.xPostsFallbackUrl;
    container.innerHTML = '';

    if (!fallbackUrl) {
      renderMessage(container, 'empty-state', '最新の投稿は準備中です。');
      return;
    }

    const wrapper = document.createElement('div');
    wrapper.className = 'x-card-grid';

    const card = document.createElement('article');
    card.className = 'x-card';

    const embed = document.createElement('div');
    embed.className = 'x-card-embed';
    embed.innerHTML = `<blockquote class="twitter-tweet"><a href="${normalizeUrl(fallbackUrl)}"></a></blockquote>`;
    card.appendChild(embed);

    wrapper.appendChild(card);
    container.appendChild(wrapper);

    ensureTwitterWidgetsScriptLoaded(() => {
      if (window.twttr && window.twttr.widgets && window.twttr.widgets.load) {
        window.twttr.widgets.load(container);
      }
    });
  }

  function truncateText(text, maxLength = 220) {
    if (!text) {
      return '';
    }
    if (text.length <= maxLength) {
      return text;
    }
    return `${text.slice(0, maxLength - 1)}…`;
  }

  function createPostCard(post) {
    const card = window.App.createElement('article', { className: 'x-card' });

    const meta = window.App.createElement('div', {
      className: 'x-card-meta',
      children: [
        window.App.createElement('span', { className: 'x-card-date', text: window.App.formatDate(post.publishedAt) }),
      ],
    });

    const bodyContent = (() => {
      if (post.embedHtml) {
        const wrapper = document.createElement('div');
        wrapper.className = 'x-card-embed';
        wrapper.innerHTML = post.embedHtml;
        const container = document.createElement('div');
        container.appendChild(wrapper);
        if (post.content && post.content.trim()) {
          container.appendChild(
            window.App.createElement('p', {
              className: 'x-card-text',
              text: truncateText(post.content),
            }),
          );
        }
        return container;
      }
      return window.App.createElement('p', {
        className: 'x-card-text',
        text: truncateText(post.content || PLACEHOLDER_CONTENT),
      });
    })();

    const statsItems = [];
    if (post.likes !== null && post.likes !== undefined) {
      statsItems.push(window.App.createElement('span', { text: `❤ ${window.App.formatNumber(post.likes)}件` }));
    }
    if (post.reposts !== null && post.reposts !== undefined) {
      statsItems.push(window.App.createElement('span', { text: `🔁 ${window.App.formatNumber(post.reposts)}回` }));
    }

    const stats = statsItems.length
      ? window.App.createElement('div', { className: 'x-card-stats', children: statsItems })
      : null;

    card.appendChild(meta);
    card.appendChild(bodyContent);
    if (stats) {
      card.appendChild(stats);
    }

    return card;
  }

  function renderPosts() {
    const container = document.getElementById('x-latest');
    if (!container) {
      return;
    }

    if (!state.isLoaded) {
      renderMessage(container, 'loading-state', '読み込み中...');
      return;
    }

    if (state.loadError) {
      renderMessage(container, 'empty-state', '最新投稿を取得できませんでした。しばらくお待ちください。');
      return;
    }

    const posts = state.posts.slice(0, 3);
    if (state.useFallback || !posts.length) {
      renderFallback(container);
      return;
    }

    container.innerHTML = '';
    const grid = window.App.createElement('div', { className: 'x-card-grid' });
    posts.forEach((post) => {
      grid.appendChild(createPostCard(post));
    });
    container.appendChild(grid);

    ensureTwitterWidgetsScriptLoaded(() => {
      if (window.twttr && window.twttr.widgets && window.twttr.widgets.load) {
        window.twttr.widgets.load(container);
      }
    });
  }

  async function loadPosts() {
    const csvUrl = window.AppConfig?.xPostsCsvUrl;
    state.useFallback = false;
    if (!csvUrl) {
      state.posts = [];
      state.useFallback = true;
      state.isLoaded = true;
      state.loadError = null;
      renderPosts();
      return;
    }

    try {
      const text = await fetchCsvText(csvUrl);
      state.posts = convertCsvToPosts(text);
      state.loadError = null;
      state.useFallback = state.posts.length === 0;
    } catch (error) {
      state.posts = [];
      state.loadError = error;
      state.useFallback = true;
      console.error('最新X投稿の取得に失敗しました', error);
    } finally {
      state.isLoaded = true;
      renderPosts();
    }
  }

  function ensureTwitterWidgetsScriptLoaded(callback) {
    if (window.twttr && window.twttr.widgets && window.twttr.widgets.load) {
      callback();
      return;
    }

    if (document.querySelector('script[src="https://platform.twitter.com/widgets.js"]')) {
      setTimeout(() => ensureTwitterWidgetsScriptLoaded(callback), 200);
      return;
    }

    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://platform.twitter.com/widgets.js';
    script.onload = () => {
      if (callback) {
        callback();
      }
    };
    script.onerror = () => {
      console.warn('Twitterウィジェットの読み込みに失敗しました');
    };
    document.body.appendChild(script);
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (!hasContainer()) {
      return;
    }
    renderPosts();
    loadPosts();
  });
})();

