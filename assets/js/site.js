/* Glyceryl Developer Hub — UI behavior only; no analytics or remote tracking. */
(function () {
  'use strict';

  var themeButton = document.getElementById('theme-toggle');
  var searchButton = document.getElementById('search-shortcut');
  var progress = document.getElementById('scroll-progress');
  var navLinks = Array.prototype.slice.call(document.querySelectorAll('.site-topnav a'));

  function setTheme(theme) {
    document.documentElement.dataset.theme = theme;
    themeButton.setAttribute('aria-pressed', String(theme === 'dark'));
    themeButton.setAttribute('aria-label', theme === 'dark' ? '切换到浅色主题' : '切换到深色主题');
    themeButton.title = themeButton.getAttribute('aria-label');
    try { localStorage.setItem('glyceryl-theme', theme); } catch (_) { /* disabled storage */ }
  }

  function currentSection() {
    var route = decodeURIComponent((location.hash || '#/').replace(/^#\//, ''));
    if (!route || route === '/') return 'home';
    if (/^(0序章|1基础|2进阶|3杂七杂八|minecraft)\//.test(route)) return 'minecraft';
    var section = route.split('/')[0];
    return ['unity', 'sdk', 'tools'].indexOf(section) !== -1 ? section : 'home';
  }

  function updateNavigation() {
    var active = currentSection();
    navLinks.forEach(function (link) {
      if (link.getAttribute('data-section') === active) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
  }

  function updateProgress() {
    var root = document.documentElement;
    var maxScroll = Math.max(0, root.scrollHeight - root.clientHeight);
    var value = maxScroll ? Math.min(100, Math.max(0, (window.scrollY / maxScroll) * 100)) : 0;
    progress.style.width = value.toFixed(2) + '%';
  }

  function focusSearch() {
    var box = document.querySelector('.sidebar .search input');
    if (!box) return;
    if (document.body.classList.contains('close')) {
      var sidebarButton = document.querySelector('.sidebar-toggle');
      if (sidebarButton) sidebarButton.click();
    }
    box.focus();
    box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  themeButton.addEventListener('click', function () {
    setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
  });
  searchButton.addEventListener('click', focusSearch);

  document.addEventListener('keydown', function (event) {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      focusSearch();
    }
  });

  var scheduled = false;
  window.addEventListener('scroll', function () {
    if (!scheduled) {
      scheduled = true;
      window.requestAnimationFrame(function () { updateProgress(); scheduled = false; });
    }
  }, { passive: true });

  window.addEventListener('hashchange', updateNavigation);
  window.GlycerylSite = {
    onRouteChange: function () {
      updateNavigation();
      updateProgress();
      document.title = 'Glyceryl\'s Developer Hub · 开发笔记';
    }
  };
  setTheme(document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');
  updateNavigation();
  updateProgress();
}());
