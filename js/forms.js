/**
 * forms.js — единая логика форм (ui-lead-form).
 * - маска телефона +7 (XXX) XXX-XX-XX
 * - клиентская валидация (имя ≥2, телефон 10 цифр)
 * - fetch POST на send.php, FormData
 * - aria-live статус (успех/ошибка), блокировка кнопки
 * - honeypot поле website (проверяется на сервере, здесь не трогаем)
 * - при ошибке фокус на первое невалидное поле
 * - без JS форма работает обычным POST (R-144)
 */

(function () {
  'use strict';

  // --- Маска телефона ---
  function attachPhoneMask(input) {
    let cursorPos = 0;

    function formatValue(val) {
      const digits = val.replace(/\D/g, '').slice(0, 11);
      if (!digits.length) return '';
      if (digits[0] !== '7' && digits[0] !== '8') return '+7 (' + digits.slice(0, 3);
      const d = digits[0] === '8' ? '7' + digits.slice(1) : digits;
      if (d.length <= 1) return '+7';
      if (d.length <= 4) return '+7 (' + d.slice(1);
      if (d.length <= 7) return '+7 (' + d.slice(1, 4) + ') ' + d.slice(4);
      if (d.length <= 9) return '+7 (' + d.slice(1, 4) + ') ' + d.slice(4, 7) + '-' + d.slice(7);
      return '+7 (' + d.slice(1, 4) + ') ' + d.slice(4, 7) + '-' + d.slice(7, 9) + '-' + d.slice(9, 11);
    }

    function setCursor(pos) {
      try {
        input.setSelectionRange(pos, pos);
      } catch (_) {}
    }

    input.addEventListener('input', () => {
      const start = input.selectionStart;
      const oldVal = input.value;
      const newVal = formatValue(input.value);
      input.value = newVal;
      // грубая коррекция курсора
      const diff = newVal.length - oldVal.length;
      setCursor(Math.max(3, Math.min(newVal.length, start + diff)));
    });

    input.addEventListener('focus', () => {
      if (!input.value) {
        input.value = '+7 (';
        setCursor(4);
      }
    });

    input.addEventListener('blur', () => {
      if (input.value === '+7 (') input.value = '';
    });
  }

  // --- Валидация ---
  function validateForm(form) {
    const errors = [];
    const fields = form.querySelectorAll('[data-validate]');
    fields.forEach((field) => {
      const type = field.getAttribute('data-validate');
      const errorEl = form.querySelector(`[data-error-for="${field.name}"]`);
      let valid = true;
      let msg = '';

      if (type === 'name') {
        const val = field.value.trim();
        if (val && val.length < 2) {
          valid = false;
          msg = 'Имя должно быть не короче 2 символов';
        }
      } else if (type === 'phone') {
        const digits = field.value.replace(/\D/g, '');
        if (digits.length !== 11 || !/^7\d{10}$/.test(digits)) {
          valid = false;
          msg = 'Введите телефон в формате +7 (987) 123-44-67';
        }
      }

      field.classList.toggle('is-invalid', !valid);
      if (errorEl) {
        errorEl.textContent = msg;
        errorEl.hidden = valid;
      }

      if (!valid) errors.push({ field, msg });
    });
    return errors;
  }

  function clearErrors(form) {
    form.querySelectorAll('.is-invalid').forEach((el) => el.classList.remove('is-invalid'));
    form.querySelectorAll('[data-error-for]').forEach((el) => {
      el.textContent = '';
      el.hidden = true;
    });
  }

  // --- Отправка ---
  async function submitForm(form) {
    const submitBtn = form.querySelector('[type="submit"]');
    const statusEl = form.querySelector('[data-form-status]');
    if (!statusEl) return;

    const errors = validateForm(form);
    if (errors.length) {
      errors[0].field.focus();
      return;
    }

    clearErrors(form);
    submitBtn.disabled = true;
    submitBtn.setAttribute('aria-busy', 'true');
    statusEl.textContent = '';
    // Не перетираем секционный класс (ui-callback__status у виджета):
    // снимаем только состояния результата.
    statusEl.classList.remove('is-success', 'is-error');

    try {
      const formData = new FormData(form);
      // R-143: источник заявки берём из data-source, если в форме нет
      // собственного поля source (hidden-input имеет приоритет).
      const source = form.getAttribute('data-source');
      if (source && !formData.get('source')) {
        formData.set('source', source);
      }
      const resp = await fetch(form.action, {
        method: 'POST',
        body: formData,
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
      });

      const data = await resp.json().catch(() => ({}));

      if (resp.ok && data.success) {
        statusEl.textContent = 'Спасибо! Мы свяжемся с вами в ближайшее время';
        statusEl.classList.add('is-success');
        statusEl.setAttribute('role', 'status');
        form.reset();
      } else {
        const msg = data.message || 'Не удалось отправить. Позвоните нам: +7 (987) 123-44-67';
        statusEl.textContent = msg;
        statusEl.classList.add('is-error');
        statusEl.setAttribute('role', 'alert');
      }
    } catch (_) {
      statusEl.textContent = 'Не удалось отправить. Позвоните нам: +7 (987) 123-44-67';
      statusEl.classList.add('is-error');
      statusEl.setAttribute('role', 'alert');
    } finally {
      submitBtn.disabled = false;
      submitBtn.removeAttribute('aria-busy');
    }
  }

  // --- Инициализация всех форм ---
  document.querySelectorAll('[data-lead-form]').forEach((form) => {
    // маска телефона
    form.querySelectorAll('input[type="tel"]').forEach(attachPhoneMask);

    // submit
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      submitForm(form);
    });

    // очистка ошибок при вводе
    form.addEventListener('input', (e) => {
      if (e.target.matches('[data-validate]')) {
        e.target.classList.remove('is-invalid');
        const err = form.querySelector(`[data-error-for="${e.target.name}"]`);
        if (err) {
          err.textContent = '';
          err.hidden = true;
        }
      }
    });
  });
})();