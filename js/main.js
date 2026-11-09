/**
 * main.js — ядро: замена placeholder-заглушек на фото, декор плавающих блоков.
 * Jessie не используем; чисто DOM-операции defer.
 */

(function () {
  'use strict';

  // ---------- Заглушки -> фото ----------
  document.querySelectorAll('.works-thumb.is-placeholder').forEach((thumb) => {
    const dataSrc = thumb.getAttribute('data-placeholder');
    if (!dataSrc) return;
    const img = new Image();
    img.src = dataSrc;
    img.alt = '';
    img.classList.add('is-loaded');
    thumb.appendChild(img);
    img.addEventListener('load', () => {
      thumb.classList.remove('is-placeholder');
    });
    img.addEventListener('error', () => {
      thumb.classList.remove('is-placeholder');
      // если src не сработал — оставляем заглушку как fallback
    });
  });
})();

/**
 * reviewsSlider.js — бесконечный слайдер отзывов (4 в ряд, автопрокрутка 3 сек)
 * Сдвиг считается в пикселях от ширины ОДНОЙ карточки (а не в % от списка),
 * поэтому лента не «разрывается» на любых ширинах.
 * При выходе за клоны индекс переносится без анимации — стык незаметен.
 */
(function () {
  'use strict';

  const slider = document.querySelector('.reviews__slider');
  if (!slider) return;

  const list = slider.querySelector('.reviews__list');
  if (!list) return;

  const items = Array.from(list.querySelectorAll('.reviews__item'));
  if (items.length < 2) return;

  const VISIBLE_CLONES = 4;    // столько клонов с каждой стороны (макс. видимых)
  const DURATION = 500;        // мс, длительность анимации
  const AUTOPLAY_MS = 3000;    // интервал автопрокрутки

  // Клонируем крайние карточки для бесшовной петли
  const clonesEnd = items.slice(0, VISIBLE_CLONES).map((n) => n.cloneNode(true));
  const clonesStart = items.slice(-VISIBLE_CLONES).map((n) => n.cloneNode(true));
  clonesStart.forEach((c) => { c.setAttribute('aria-hidden', 'true'); });
  clonesEnd.forEach((c) => { c.setAttribute('aria-hidden', 'true'); });
  clonesStart.forEach((c) => list.prepend(c));
  clonesEnd.forEach((c) => list.appendChild(c));

  const totalReal = items.length;      // реальных карточек
  let current = VISIBLE_CLONES;        // начинаем с первого реального (после клонов)
  let timer = null;
  let locked = false;

  /* --- Сколько карточек видно в ряд (соответствует CSS) --- */
  const DESKTOP = window.matchMedia('(min-width: 1200px)');
  const TABLET = window.matchMedia('(min-width: 768px)');

  function visibleCount() {
    if (DESKTOP.matches) return 4;
    if (TABLET.matches) return 2;
    return 1;
  }

  let visible = visibleCount();

  /** Ширина одной карточки в пикселях (включая border). */
  function stepWidth() {
    const card = list.querySelector('.reviews__item');
    if (!card) return 0;
    const w = card.getBoundingClientRect().width;
    return w > 0 ? w : slider.clientWidth / visible;
  }

  function render(animate) {
    const offset = current * stepWidth();
    list.style.transition = animate ? `transform ${DURATION}ms ease` : 'none';
    list.style.transform = `translate3d(${-offset}px, 0, 0)`;
  }

  /** Перенос индекса через клоны без анимации (бесшовность). */
  function normalize() {
    if (current >= visible + totalReal) {
      current -= totalReal;
      render(false);
    } else if (current < visible) {
      current += totalReal;
      render(false);
    }
  }

  function goTo(index, animate) {
    if (locked) return;
    locked = true;
    current = index;
    render(animate !== false);
    window.setTimeout(() => {
      locked = false;
      normalize();
    }, animate === false ? 0 : DURATION);
  }

  function next() { goTo(current + 1, true); }

  function startTimer() {
    stopTimer();
    timer = window.setInterval(next, AUTOPLAY_MS);
  }
  function stopTimer() {
    if (timer) { window.clearInterval(timer); timer = null; }
  }
  function restartTimer() { startTimer(); }

  slider.addEventListener('mouseenter', stopTimer);
  slider.addEventListener('mouseleave', startTimer);
  slider.addEventListener('focusin', stopTimer);
  slider.addEventListener('focusout', startTimer);

  /* --- Свайп: Pointer Events — работает на тач, мыши и пере (все разрешения) --- */
  const SWIPE_THRESHOLD = 40;   // px, минимальная длина жеста
  const DRAG_RATIO = 0.6;       // доля сдвига во время перетаскивания
  let pointerId = null;
  let startX = 0;
  let startY = 0;
  let deltaX = 0;
  let dragging = false;
  let lockDirection = null;     // 'x' | 'y' — чтобы не мешать вертикальному скроллу

  function dragTo(offsetPx) {
    const base = current * stepWidth();
    list.style.transition = 'none';
    list.style.transform = `translate3d(${-base + offsetPx * DRAG_RATIO}px, 0, 0)`;
  }

  function endDrag(commit) {
    dragging = false;
    pointerId = null;
    lockDirection = null;
    if (commit) {
      render(true);
    } else {
      render(false);
    }
  }

  slider.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    pointerId = e.pointerId;
    startX = e.clientX;
    startY = e.clientY;
    deltaX = 0;
    dragging = true;
    lockDirection = null;
    stopTimer();
  });

  slider.addEventListener('pointermove', (e) => {
    if (!dragging || e.pointerId !== pointerId) return;

    deltaX = e.clientX - startX;
    const deltaY = e.clientY - startY;

    /* Определяем доминирующую ось один раз за жест */
    if (!lockDirection) {
      if (Math.abs(deltaX) < 6 && Math.abs(deltaY) < 6) return;
      lockDirection = Math.abs(deltaX) > Math.abs(deltaY) ? 'x' : 'y';
      if (lockDirection === 'x') {
        slider.setPointerCapture(e.pointerId);
      }
    }
    if (lockDirection !== 'x') return;

    dragTo(deltaX);
  });

  function onPointerEnd(e) {
    if (!dragging || e.pointerId !== pointerId) return;
    const isHorizontal = lockDirection === 'x';
    const distance = deltaX;
    const moved = isHorizontal && Math.abs(distance) >= SWIPE_THRESHOLD;

    if (moved) {
      /* свайп влево (-) → следующая, вправо (+) → предыдущая */
      current += distance < 0 ? 1 : -1;
      endDrag(true);
      /* normalize — после завершения анимации, чтобы не оборвать её */
      window.setTimeout(normalize, DURATION);
    } else {
      endDrag(true);
    }

    startTimer();
  }

  slider.addEventListener('pointerup', onPointerEnd);
  slider.addEventListener('pointercancel', (e) => {
    if (!dragging || e.pointerId !== pointerId) return;
    endDrag(true);
    startTimer();
  });

  /* Пересчёт при ресайзе: меняется число видимых карточек и ширина шага */
  let resizeTimer = null;
  function handleResize() {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      const next_visible = visibleCount();
      if (next_visible !== visible) {
        visible = next_visible;
      }
      render(false);
    }, 150);
  }
  window.addEventListener('resize', handleResize);
  if (DESKTOP.addEventListener) {
    DESKTOP.addEventListener('change', handleResize);
    TABLET.addEventListener('change', handleResize);
  }

  /* Пользователь просил меньше движения — не крутим автоматически */
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  render(false);
  if (!reduceMotion) startTimer();
})();