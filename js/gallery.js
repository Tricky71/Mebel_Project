/**
 * gallery.js — лайтбокс для секции Works.
 * Один <dialog class="ui-lightbox"> на страницу.
 * - data-gallery-item: ссылка на большое фото + data-caption
 * - show(i), предзагрузка i±1, клавиши (Esc/Стрелки), свайп (40px),
 *   клик по подложке, возврат фокуса, body.is-locked
 * - ошибку загрузки ловим через addEventListener('error')
 */

(function () {
  'use strict';

  const dialog = document.querySelector('.ui-lightbox');
  if (!dialog) return;

  const items = Array.from(document.querySelectorAll('[data-gallery-item]'));
  if (!items.length) return;

  const imgEl = dialog.querySelector('.ui-lightbox__img');
  const captionEl = dialog.querySelector('.ui-lightbox__caption');
  const counterEl = dialog.querySelector('.ui-lightbox__counter');
  // Кнопки ищем по data-атрибутам (так размечено в index.html), с фолбэком на классы
  const closeBtn = dialog.querySelector('[data-close], .ui-lightbox__btn--close');
  const prevBtn = dialog.querySelector('[data-prev], .ui-lightbox__btn--prev');
  const nextBtn = dialog.querySelector('[data-next], .ui-lightbox__btn--next');
  const errorEl = dialog.querySelector('.ui-lightbox__error');

  let current = 0;
  let lastFocused = null;

  function preload(i) {
    if (i < 0 || i >= items.length) return;
    const item = items[i];
    const src = item.getAttribute('data-gallery-src') || item.getAttribute('href');
    if (!src) return;
    const img = new Image();
    img.src = src;
  }

  function show(i) {
    if (i < 0 || i >= items.length) return;
    current = i;
    const item = items[i];
    const src = item.getAttribute('data-gallery-src') || item.getAttribute('href');
    const caption = item.getAttribute('data-caption') || '';

    captionEl.textContent = caption;
    counterEl.textContent = `${i + 1} / ${items.length}`;
    errorEl.hidden = true;
    imgEl.hidden = false;
    imgEl.alt = caption;

    // Обработчики ставим ДО присвоения src: иначе onload может не сработать
    // при мгновенной загрузке из кеша.
    imgEl.onload = () => {
      imgEl.hidden = false;
      errorEl.hidden = true;
    };
    imgEl.onerror = () => {
      imgEl.hidden = true;
      errorEl.hidden = false;
      errorEl.textContent = 'Не удалось загрузить изображение';
    };

    // Сброс и присвоение адреса — именно это запускает загрузку.
    imgEl.removeAttribute('src');
    imgEl.src = src;

    // предзагрузка соседей
    preload(i - 1);
    preload(i + 1);
  }

  function open(i) {
    lastFocused = document.activeElement;
    show(i);
    dialog.showModal();
    document.body.classList.add('is-locked');
    imgEl.focus();
  }

  function close() {
    dialog.close();
    document.body.classList.remove('is-locked');
    if (lastFocused && typeof lastFocused.focus === 'function') {
      lastFocused.focus();
    }
  }

  // клики
  items.forEach((item, i) => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      open(i);
    });
  });

  closeBtn.addEventListener('click', close);
  prevBtn.addEventListener('click', () => show(current - 1));
  nextBtn.addEventListener('click', () => show(current + 1));

  // клик по подложке ( backdrop )
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) close();
  });

  // клавиши
  document.addEventListener('keydown', (e) => {
    if (dialog.open) {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        show(current - 1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        show(current + 1);
      }
    }
  });

  /* ---------- Свайп ----------
   * Pointer Events вместо touchstart/touchend: работает одинаково на тач-экранах,
   * мышью и пером. Направление определяется один раз за жест, чтобы вертикальное
   * движение (прокрутка) не перехватывалось.
   * Жест НЕ начинается на кнопках: иначе кнопка «съедала» бы начало свайпа.
   */
  const SWIPE_THRESHOLD = 40; // px — минимальная длина жеста
  let pointerId = null;
  let startX = 0;
  let startY = 0;
  let lockAxis = null; // 'x' | 'y'

  function endSwipe() {
    pointerId = null;
    lockAxis = null;
  }

  dialog.addEventListener('pointerdown', (e) => {
    // только основная кнопка мыши, не тач-скролл двумя пальцами
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    // жест по кнопке управления — отдаём кнопке
    if (e.target.closest('.ui-lightbox__btn')) return;

    pointerId = e.pointerId;
    startX = e.clientX;
    startY = e.clientY;
    lockAxis = null;
  });

  dialog.addEventListener('pointermove', (e) => {
    if (pointerId === null || e.pointerId !== pointerId) return;

    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    if (!lockAxis) {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return; // ещё не определились
      lockAxis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
      if (lockAxis === 'x') dialog.setPointerCapture(e.pointerId);
    }
  });

  function onPointerEnd(e) {
    if (pointerId === null || e.pointerId !== pointerId) return;

    const dx = e.clientX - startX;
    const horizontal = lockAxis === 'x';
    endSwipe();

    if (!horizontal || Math.abs(dx) < SWIPE_THRESHOLD) return;

    // свайп влево (dx < 0) — следующее фото, вправо — предыдущее
    if (dx < 0) show(current + 1);
    else show(current - 1);
  }

  /* pointerup слушаем на document, а не на dialog: после setPointerCapture
     браузер замыкает доставку событий на захвативший элемент, и всплытие
     до слушателя на dialog может не дойти (жест «зависает»). */
  document.addEventListener('pointerup', onPointerEnd);
  document.addEventListener('pointercancel', endSwipe);

  // одна работа — стрелки не показываем
  if (items.length === 1) {
    dialog.setAttribute('data-single', '');
    if (prevBtn) prevBtn.hidden = true;
    if (nextBtn) nextBtn.hidden = true;
  }
})();