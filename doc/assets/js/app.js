(function appUtilities() {
  const state = {
    currentYear: new Date().getFullYear(),
  };

  function selectActiveNav() {
    const { pathname } = window.location;
    const links = document.querySelectorAll('nav.main-nav a');
    links.forEach((link) => {
      const isMatch = pathname.endsWith(link.getAttribute('href')) || (pathname.endsWith('/') && link.getAttribute('href') === 'index.html');
      link.classList.toggle('active', isMatch);
    });
  }

  function injectFooterYear() {
    const footerYear = document.querySelector('[data-footer-year]');
    if (footerYear) {
      footerYear.textContent = state.currentYear;
    }
  }

  function formatDate(value) {
    if (value === undefined || value === null) {
      return '';
    }

    const raw = String(value).trim();
    if (!raw) {
      return '';
    }

    let date = new Date(raw);

    if (Number.isNaN(date.getTime())) {
      const compactMatch = raw.match(/^([0-9]{4})([0-9]{2})([0-9]{2})$/);
      if (compactMatch) {
        const [, year, month, day] = compactMatch;
        date = new Date(Number(year), Number(month) - 1, Number(day));
      }
    }

    if (Number.isNaN(date.getTime())) {
      return raw;
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}年${month}月${day}日`;
  }

  function formatNumber(value) {
    if (value === undefined || value === null) {
      return '';
    }
    const number = Number(value);
    if (Number.isNaN(number)) {
      return value;
    }
    return new Intl.NumberFormat('ja-JP').format(number);
  }

  function createElement(tag, options = {}) {
    const el = document.createElement(tag);
    if (options.className) {
      el.className = options.className;
    }
    if (options.text) {
      el.textContent = options.text;
    }
    if (options.attrs) {
      Object.entries(options.attrs).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          el.setAttribute(key, value);
        }
      });
    }
    if (options.children) {
      options.children.forEach((child) => {
        if (!child) return;
        el.appendChild(child);
      });
    }
    return el;
  }

  window.App = {
    selectActiveNav,
    injectFooterYear,
    formatDate,
    formatNumber,
    createElement,
  };

  document.addEventListener('DOMContentLoaded', () => {
    selectActiveNav();
    injectFooterYear();
  });
})();

