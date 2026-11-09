/**
 * works.js — пошаговое раскрытие мозаики «Наши работы».
 *
 * Структура:
 *   ul.works__list[data-works-list]  →  li[data-works-item] × N
 *   .works__more  →  button[data-works-more]
 *
 * Логика:
 * - при загрузке видно ДВА полных ряда плиток, остальные получают hidden;
 * - кнопка открывает ровно ОДИН следующий ряд;
 * - ряд считается по колонко-местам: горизонталь (--wide) = 2 места,
 *   остальные = 1, поэтому справа не остаётся пустот;
 * - когда фото закончились — кнопка прячется.
 *
 * Пропорции плиток фиксированы в CSS (grid-auto-rows + object-fit: cover),
 * поэтому фото любых размеров из админки встают ровно.
 *
 * columns() совпадает с сеткой works.css: <768 — 2, >=768 — 4.
 *
 * Без JS все фото видны сразу (безопасная деградация, R-144).
 * CSP-safe: внешний файл, без inline-обработчиков (AGENT.md).
 */

(function () {
  'use strict';

  const INITIAL_ROWS = 2; // сколько рядов показывать при загрузке

  const list = document.querySelector('[data-works-list]');
  const moreBtn = document.querySelector('[data-works-more]');
  if (!list || !moreBtn) return;

  const items = Array.from(list.querySelectorAll('[data-works-item]'));
  if (!items.length) return;

  const moreWrap = moreBtn.parentElement;

  const TABLET = window.matchMedia('(min-width: 768px)');

  /** Ширина плитки в колонках: горизонталь занимает 2, остальные 1. */
  function spanOf(item) {
    return item.classList.contains('works__item--wide') ? 2 : 1;
  }

  /** Сколько колонок в ряду (= число колонок в works.css). */
  function columns() {
    return TABLET.matches ? 4 : 2;
  }

  let shown = 0;

  /**
   * Сколько плиток нужно, чтобы заполнить N полных рядов.
   * Считаем по колонко-местам: горизонталь = 2 места.
   */
  function countForRows(rows) {
    const limit = columns() * rows;
    let used = 0;
    let count = 0;
    for (const item of items) {
      const span = spanOf(item);
      if (used + span > limit) break;
      used += span;
      count += 1;
    }
    return Math.max(count, 1);
  }

  /** Пересчитать видимость: показать первые `shown` плиток. */
  function apply() {
    items.forEach((item, i) => {
      item.hidden = i >= shown;
    });
    moreWrap.hidden = shown >= items.length;
  }

  /** Показать ещё один полный ряд. */
  function reveal() {
    const limit = columns();
    let used = 0;
    let next = shown;
    while (next < items.length) {
      const span = spanOf(items[next]);
      if (used + span > limit) break;
      used += span;
      next += 1;
    }
    // если не удалось набрать ни одной плитки — берём одну
    shown = next > shown ? next : Math.min(shown + 1, items.length);
    apply();
  }

  // Стартовое состояние: два полных ряда. Без JS — видны все.
  shown = countForRows(INITIAL_ROWS);
  apply();

  moreBtn.addEventListener('click', reveal);

  // При смене ширины досчитываем видимость под новое число колонок,
  // но никогда не прячем уже показанные плитки.
  function onResize() {
    const min = countForRows(INITIAL_ROWS);
    if (shown < min) {
      shown = min;
      apply();
    }
  }

  window.addEventListener('resize', onResize);
  if (TABLET.addEventListener) {
    TABLET.addEventListener('change', onResize);
  }
})();

