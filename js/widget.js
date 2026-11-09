/**
 * widget.js — плавающий виджет (.ui-callback):
 * - весь виджет появляется только со второго экрана (после hero)
 * - кнопка «Наверх» (класс .is-visible внутри виджета после 600px прокрутки)
 * - попап «Обратный звонок» (360x350, имя не требуется, только телефон)
 * - кнопка Telegram (показ по медиазапросу — правилом в widget.css)
 * - Esc и клик по подложке закрывают попап и возвращают фокус
 * - маска телефона и валидация — общий forms.js (форма помечена data-lead-form),
 *   здесь только открытие/закрытие и закрытие после успешной отправки.
 * Классы/атрибуты — по plan.md §«Виджет» и css/sections/widget.css.
 */

(function () {
  'use strict';

  const widget = document.querySelector('[data-callback]');
  if (!widget) return;

  const totopBtn = widget.querySelector('[data-totop]');
  const callBtn = widget.querySelector('[data-callback-toggle]');
  const popup = widget.querySelector('[data-callback-popup]');
  const popupForm = popup ? popup.querySelector('[data-callback-form]') : null;
  const popupInput = popup ? popup.querySelector('[data-callback-field]') : null;
  const closeBtn = popup ? popup.querySelector('[data-callback-close]') : null;

  const SCROLL_TOP_OFFSET = 600; // px, после которых появляется «Наверх»

  let lastFocused = null;

  // --- Появление виджета только со второго экрана ---
  // «Второй экран» = низ hero ушёл выше верхней кромки вьюпорта.
  // IntersectionObserver следит за hero; fallback — по scrollY, если hero нет.
  const hero = document.querySelector('.hero');

  function setWidgetVisible(visible) {
    widget.classList.toggle('is-visible', visible);
  }

  if (hero && 'IntersectionObserver' in window) {
    const heroObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          // entry.boundingClientRect.top < 0 — hero полностью выше вьюпорта
          setWidgetVisible(entry.boundingClientRect.top < 0);
        });
      },
      // Линия отсчёта — сама верхняя кромка: hero перестаёт пересекаться,
      // когда его низ поднялся выше неё.
      { threshold: 0, rootMargin: '0px' }
    );
    heroObserver.observe(hero);

    // Стартовое состояние: страница могла открыться уже прокрученной
    // (якорь #contacts, возврат со страницы политики, restore scroll).
    setWidgetVisible(hero.getBoundingClientRect().bottom <= 0);
  } else {
    // Без IntersectionObserver: высота hero как порог прокрутки
    const heroHeight = hero ? hero.offsetHeight : window.innerHeight;
    const onScrollFallback = () => {
      setWidgetVisible(window.scrollY > heroHeight);
    };
    window.addEventListener('scroll', onScrollFallback, { passive: true });
    onScrollFallback();
  }

  // --- Кнопка «Наверх» ---
  function updateTotop() {
    if (!totopBtn) return;
    totopBtn.classList.toggle('is-visible', window.scrollY > SCROLL_TOP_OFFSET);
  }

  if (totopBtn) {
    window.addEventListener('scroll', updateTotop, { passive: true });
    updateTotop();

    totopBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // --- Попап звонка ---
  function openPopup() {
    if (!popup) return;
    lastFocused = document.activeElement;
    popup.hidden = false;
    popup.classList.add('is-open');
    document.body.classList.add('is-locked');
    if (callBtn) callBtn.setAttribute('aria-expanded', 'true');
    if (popupInput) {
      window.setTimeout(() => popupInput.focus(), 50);
    }
  }

  function closePopup() {
    if (!popup) return;
    popup.classList.remove('is-open');
    popup.hidden = true;
    document.body.classList.remove('is-locked');
    if (callBtn) callBtn.setAttribute('aria-expanded', 'false');
    if (lastFocused && typeof lastFocused.focus === 'function') {
      lastFocused.focus();
    }
  }

  if (callBtn) {
    callBtn.addEventListener('click', () => {
      // повторный клик по кнопке закрывает открытый попап
      if (popup && !popup.hidden) {
        closePopup();
      } else {
        openPopup();
      }
    });
  }

  if (closeBtn) closeBtn.addEventListener('click', closePopup);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && popup && !popup.hidden) {
      closePopup();
    }
  });

  // --- Отправка и валидация телефона ---
  // Форма размечена как data-lead-form, поэтому маску, проверку полей и
  // отправку на send.php полностью выполняет forms.js (подключён раньше).
  // Здесь остаётся только закрыть попап после успешной отправки.
  if (popupForm) {
    const statusEl = popupForm.querySelector('[data-form-status]');
    if (statusEl && 'MutationObserver' in window) {
      const observer = new MutationObserver(() => {
        if (statusEl.classList.contains('is-success')) {
          observer.disconnect();
          window.setTimeout(closePopup, 1500);
        }
      });
      observer.observe(statusEl, { attributes: true, childList: true, subtree: true });
    }
  }
})();