/**
 * ui.js — общие утилиты: вкладки (WAI-ARIA tabs).
 * Кнопка «Наверх» переехала в widget.js — чтобы не было двух обработчиков
 * на одном [data-totop] (дублирование scrollTo и конфликт hidden/opacity).
 */

(function () {
  'use strict';

  // ---------- Вкладки ----------
  const tabSets = document.querySelectorAll('.ui-tabs');
  tabSets.forEach((tabs) => {
    const list = tabs.querySelector('.ui-tabs__list');
    const tabsList = Array.from(tabs.querySelectorAll('.ui-tabs__tab'));
    const panels = Array.from(tabs.querySelectorAll('.ui-tabs__panel'));

    if (!tabsList.length || !panels.length) return;

    tabs.classList.add('is-ready');

    tabsList.forEach((tab, i) => {
      tab.addEventListener('click', () => activate(i));
    });

    // стрелки ←/→ переключают вкладки
    document.addEventListener('keydown', (e) => {
      if (!tabs.contains(document.activeElement)) return;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const idx = tabsList.indexOf(document.activeElement);
        activate((idx - 1 + tabsList.length) % tabsList.length);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        const idx = tabsList.indexOf(document.activeElement);
        activate((idx + 1) % tabsList.length);
      }
    });

    function activate(i) {
      tabsList.forEach((t, j) => {
        const on = j === i;
        t.setAttribute('aria-selected', on ? 'true' : 'false');
        t.setAttribute('tabindex', on ? '0' : '-1');
      });
      panels.forEach((p, j) => {
        p.hidden = j !== i;
      });
      tabsList[i].focus();
    }

    // активируем первую
    activate(0);
  });
})();