'use client';

import { useEffect } from 'react';

/**
 * A show/hide control on every password field in the admin panel.
 *
 * Payload renders its own login, reset-password and create-first-user forms,
 * so there is no field to override — the button is attached to whatever
 * password inputs are on the page. Typing a long password blind, on a phone,
 * in a second language is where people give up and reuse a weak one.
 *
 * Rendered through `admin.components.afterLogin`.
 */
const LABEL_SHOW = 'Нууц үгийг харах / Show password';
const LABEL_HIDE = 'Нууц үгийг нуух / Hide password';

const EYE = '👁';
const EYE_OFF = '🙈';

export const PasswordToggle = () => {
  useEffect(() => {
    const cleanups: (() => void)[] = [];

    const attach = (input: HTMLInputElement) => {
      if (input.dataset.toggleAttached === 'true') return;
      input.dataset.toggleAttached = 'true';

      const wrapper = input.parentElement;
      if (!wrapper) return;

      const previousPosition = wrapper.style.position;
      if (getComputedStyle(wrapper).position === 'static') {
        wrapper.style.position = 'relative';
      }
      // Keep the typed text clear of the button.
      const previousPadding = input.style.paddingInlineEnd;
      input.style.paddingInlineEnd = '2.75rem';

      const button = document.createElement('button');
      button.type = 'button';
      button.setAttribute('aria-label', LABEL_SHOW);
      button.setAttribute('aria-pressed', 'false');
      button.textContent = EYE;
      Object.assign(button.style, {
        position: 'absolute',
        insetInlineEnd: '0.5rem',
        top: '50%',
        transform: 'translateY(-50%)',
        background: 'transparent',
        border: '0',
        cursor: 'pointer',
        fontSize: '1rem',
        lineHeight: '1',
        padding: '0.35rem',
        borderRadius: '3px',
      } satisfies Partial<CSSStyleDeclaration>);

      const toggle = () => {
        const nowText = input.type === 'password';
        input.type = nowText ? 'text' : 'password';
        button.textContent = nowText ? EYE_OFF : EYE;
        button.setAttribute('aria-label', nowText ? LABEL_HIDE : LABEL_SHOW);
        button.setAttribute('aria-pressed', String(nowText));
        // Typing should carry on where it left off.
        input.focus();
      };

      button.addEventListener('click', toggle);
      wrapper.appendChild(button);

      cleanups.push(() => {
        button.removeEventListener('click', toggle);
        button.remove();
        input.style.paddingInlineEnd = previousPadding;
        wrapper.style.position = previousPosition;
        delete input.dataset.toggleAttached;
      });
    };

    const scan = () => {
      document
        .querySelectorAll<HTMLInputElement>('input[type="password"]')
        .forEach(attach);
    };

    scan();
    // The reset and create-first-user forms mount after this component does.
    const observer = new MutationObserver(scan);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      cleanups.forEach((undo) => undo());
    };
  }, []);

  return null;
};

export default PasswordToggle;
