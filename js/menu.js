/**
 * menu.js — бургер-меню (<1200) и подсветка активной секции (>=1200).
 * Основан на burger.js референса: open/close, aria-expanded, Esc, body.is-locked,
 * возврат фокуса. Дополнено: IntersectionObserver для aria-current="true".
 * Без зависимостей, defer.
 */

(function () {
  'use strict';

  // ---------- Бургер (<1200) ----------
  const burger = document.querySelector('.site-header__burger');
  const nav = document.querySelector('.site-nav');
  const navLinks = nav ? nav.querySelectorAll('.site-nav__link') : [];

  if (!burger || !nav) return;

  let lastFocused = null;

  function openMenu() {
    lastFocused = document.activeElement;
    burger.setAttribute('aria-expanded', 'true');
    burger.setAttribute('aria-label', 'Закрыть меню');
    nav.hidden = false;
    nav.classList.add('is-open');
    document.body.classList.add('is-locked');
    // фокус на первый пункт
    const firstLink = nav.querySelector('.site-nav__link');
    if (firstLink) firstLink.focus();
  }

  function closeMenu() {
    burger.setAttribute('aria-expanded', 'false');
    burger.setAttribute('aria-label', 'Открыть меню');
    nav.hidden = true;
    nav.classList.remove('is-open');
    document.body.classList.remove('is-locked');
    if (lastFocused && typeof lastFocused.focus === 'function') {
      lastFocused.focus();
    }
  }

  burger.addEventListener('click', () => {
    const expanded = burger.getAttribute('aria-expanded') === 'true';
    expanded ? closeMenu() : openMenu();
  });

  // Esc закрывает, фокус на бургер
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && burger.getAttribute('aria-expanded') === 'true') {
      closeMenu();
    }
  });

  // Клик по пункту — закрыть меню (на мобильном)
  function handleNavClick(e) {
    const isMobile = window.matchMedia('(max-width: 1199px)').matches;
    if (isMobile && burger.getAttribute('aria-expanded') === 'true') {
      closeMenu();
      // НЕ отменяем стандартное поведение href="#..." — браузер сам плавно прокрутит к секции
      // благодаря scroll-behavior: smooth в CSS
    }
  }

  navLinks.forEach((link) => {
    link.addEventListener('click', handleNavClick);
  });

  // Resize: если перешли >=1200 — закрыть меню, убрать hidden у nav
  const mqlDesktop = window.matchMedia('(min-width: 1200px)');
  function handleMql(e) {
    if (e.matches) {
      closeMenu();
      nav.hidden = false;
      nav.classList.remove('is-open'); // desktop: меню рабочего состояния, без overlay
    } else {
      nav.hidden = true;
      nav.classList.remove('is-open');
    }
  }
  mqlDesktop.addEventListener ? mqlDesktop.addEventListener('change', handleMql) : mqlDesktop.addListener(handleMql);
  handleMql(mqlDesktop);

  // ---------- Активная секция (>=1200) ----------
  // Наблюдаем за секциями с id, соответствующими href навигации
  const sections = Array.from(navLinks)
    .map((a) => a.getAttribute('href'))
    .filter((h) => h && h.startsWith('#'))
    .map((h) => document.getElementById(h.slice(1)))
    .filter(Boolean);

  if (!sections.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const id = entry.target.id;
        const link = nav.querySelector(`.site-nav__link[href="#${id}"]`);
        if (link) {
          link.setAttribute('aria-current', entry.isIntersecting ? 'true' : 'false');
        }
      });
    },
    {
      rootMargin: '-40% 0px -55% 0px', // срабатывание около середины вьюпорта
      threshold: 0,
    }
  );

  sections.forEach((sec) => observer.observe(sec));
})();