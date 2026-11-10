/* Glyceryl Developer Hub — UI behavior only; no analytics or remote tracking. */
(function () {
  'use strict';

  var root = document.documentElement;
  var themeButton = document.getElementById('theme-toggle');
  var themeMenu = document.getElementById('theme-menu');
  var themeColorMeta = document.getElementById('theme-color');
  var header = document.querySelector('.site-header');
  var progress = document.getElementById('scroll-progress');
  var headerSearch = document.getElementById('header-search');
  var navLinks = Array.prototype.slice.call(document.querySelectorAll('.site-topnav a'));
  var MODES = ['auto', 'light', 'dark'];
  var MODE_LABELS = { auto: '跟随系统', light: '浅色', dark: '深色' };
  var media = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  var themeOptions = Array.prototype.slice.call(document.querySelectorAll('.theme-option'));

  /* ---------- colour mode: auto follows the operating system ---------- */

  function systemTheme() {
    return media && media.matches ? 'dark' : 'light';
  }

  function readMode() {
    try {
      var stored = localStorage.getItem('glyceryl-theme-mode');
      if (MODES.indexOf(stored) !== -1) return stored;
      var legacy = localStorage.getItem('glyceryl-theme');
      if (legacy === 'light' || legacy === 'dark') return legacy;
    } catch (_) { /* storage disabled */ }
    return 'auto';
  }

  function storeMode(mode) {
    try { localStorage.setItem('glyceryl-theme-mode', mode); } catch (_) { /* storage disabled */ }
  }

  function syncThemeUi() {
    var mode = root.dataset.themeMode || 'auto';
    var resolved = root.dataset.theme === 'dark' ? 'dark' : 'light';
    if (themeButton) {
      var hint = mode === 'auto' ? MODE_LABELS[mode] + '（当前' + MODE_LABELS[resolved] + '）' : MODE_LABELS[mode];
      themeButton.title = '配色模式：' + hint;
      themeButton.setAttribute('aria-label', '配色模式：' + hint + '，点击选择');
    }
    themeOptions.forEach(function (option) {
      option.setAttribute('aria-checked', String(option.getAttribute('data-select-mode') === mode));
    });
    if (themeColorMeta) themeColorMeta.setAttribute('content', resolved === 'dark' ? '#0a1120' : '#f5f7fb');
  }

  function applyMode(mode, persist) {
    if (MODES.indexOf(mode) === -1) mode = 'auto';
    root.dataset.themeMode = mode;
    root.dataset.theme = mode === 'auto' ? systemTheme() : mode;
    if (persist) storeMode(mode);
    syncThemeUi();
  }

  function openMenu() {
    if (!themeMenu) return;
    themeMenu.hidden = false;
    themeButton.setAttribute('aria-expanded', 'true');
    var checked = themeOptions.filter(function (option) { return option.getAttribute('aria-checked') === 'true'; })[0];
    if (checked) checked.focus();
  }

  function closeMenu(refocus) {
    if (!themeMenu || themeMenu.hidden) return;
    themeMenu.hidden = true;
    themeButton.setAttribute('aria-expanded', 'false');
    if (refocus) themeButton.focus();
  }

  if (themeButton && themeMenu) {
    themeButton.addEventListener('click', function (event) {
      event.stopPropagation();
      if (themeMenu.hidden) openMenu();
      else closeMenu(true);
    });

    themeOptions.forEach(function (option, index) {
      option.addEventListener('click', function () {
        applyMode(option.getAttribute('data-select-mode'), true);
        closeMenu(true);
      });
      option.addEventListener('keydown', function (event) {
        var next = null;
        if (event.key === 'ArrowDown') next = themeOptions[(index + 1) % themeOptions.length];
        else if (event.key === 'ArrowUp') next = themeOptions[(index - 1 + themeOptions.length) % themeOptions.length];
        else if (event.key === 'Home') next = themeOptions[0];
        else if (event.key === 'End') next = themeOptions[themeOptions.length - 1];
        if (next) { event.preventDefault(); next.focus(); }
      });
    });

    document.addEventListener('click', function (event) {
      if (themeMenu.hidden) return;
      if (themeMenu.contains(event.target) || themeButton.contains(event.target)) return;
      closeMenu(false);
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') closeMenu(true);
    });
  }

  if (media) {
    var onSystemThemeChange = function () {
      if ((root.dataset.themeMode || 'auto') === 'auto') applyMode('auto', false);
    };
    if (typeof media.addEventListener === 'function') media.addEventListener('change', onSystemThemeChange);
    else if (typeof media.addListener === 'function') media.addListener(onSystemThemeChange);
  }

  /* ---------- navigation state ---------- */

  function currentRoute() {
    var route = decodeURIComponent((location.hash || '#/').replace(/^#\//, ''));
    if (!route || route === '/' || route === 'home.md' || route === 'history.md') return 'home';
    return route;
  }

  function updateNavigation() {
    var route = currentRoute();
    var section = route === 'home' ? 'home' : route.split('/')[0];
    navLinks.forEach(function (link) {
      var exact = link.getAttribute('data-route');
      var active = exact
        ? route === exact.replace(/^\//, '')
        : link.getAttribute('data-section') === section;
      if (active) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
  }

  /* ---------- scroll progress and header shadow ---------- */

  function updateProgress() {
    var maxScroll = Math.max(0, root.scrollHeight - root.clientHeight);
    var value = maxScroll ? Math.min(100, Math.max(0, (window.scrollY / maxScroll) * 100)) : 0;
    if (progress) progress.style.width = value.toFixed(2) + '%';
    if (header) header.classList.toggle('is-scrolled', window.scrollY > 8);
  }

  /* ---------- search: the header box drives docsify's sidebar search ---------- */

  function sidebarSearch() {
    return document.querySelector('.sidebar .search input');
  }

  function openSidebar() {
    if (!document.body.classList.contains('close')) return;
    var sidebarButton = document.querySelector('.sidebar-toggle');
    if (sidebarButton) sidebarButton.click();
  }

  function pushSearchValue(value) {
    var box = sidebarSearch();
    if (!box) return null;
    openSidebar();
    box.value = value;
    box.dispatchEvent(new Event('input', { bubbles: true }));
    return box;
  }

  if (headerSearch) {
    headerSearch.addEventListener('input', function () {
      pushSearchValue(headerSearch.value);
    });
    headerSearch.addEventListener('keydown', function (event) {
      if (event.key === 'Enter') {
        event.preventDefault();
        focusSearch();
      } else if (event.key === 'Escape') {
        headerSearch.blur();
      }
    });
  }

  function focusSearch() {
    closeMenu(false);
    var box = pushSearchValue(headerSearch ? headerSearch.value : '');
    if (!box) return;
    box.focus();
    box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  document.addEventListener('keydown', function (event) {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      if (headerSearch && headerSearch.offsetParent !== null) {
        headerSearch.focus();
        headerSearch.select();
      } else {
        focusSearch();
      }
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
      closeMenu(false);
      updateNavigation();
      updateProgress();
      document.title = document.body.getAttribute('data-site-title')
        || 'Glyceryl\'s Developer Hub · 开发笔记';
    }
  };

  applyMode(readMode(), false);
  updateNavigation();
  updateProgress();
}());
