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

  function formatDate(dateString) {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) {
      return dateString;
    }
    return new Intl.DateTimeFormat('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
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
    createElement,
  };

  document.addEventListener('DOMContentLoaded', () => {
    selectActiveNav();
    injectFooterYear();
  });
})();

