import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { PasswordToggle } from '../../src/payload/components/PasswordToggle';

/**
 * The toggle attaches itself to whatever password fields Payload renders, so
 * the test gives it the same shape: an input inside a wrapper.
 */
function field() {
  const wrapper = document.createElement('div');
  const input = document.createElement('input');
  input.type = 'password';
  input.name = 'password';
  wrapper.appendChild(input);
  document.body.appendChild(wrapper);
  return input;
}

// The fields are appended straight to the body, so they outlive the render
// container that testing-library cleans up on its own.
afterEach(() => {
  document.body.innerHTML = '';
});

describe('the password toggle', () => {
  it('reveals and hides the typed password', async () => {
    const input = field();
    render(<PasswordToggle />);
    const user = userEvent.setup();

    const button = await screen.findByRole('button', { name: /Show password/ });
    expect(input.type).toBe('password');

    await user.click(button);
    expect(input.type).toBe('text');
    expect(button).toHaveAttribute('aria-pressed', 'true');

    await user.click(screen.getByRole('button', { name: /Hide password/ }));
    expect(input.type).toBe('password');
  });

  it('is labelled in both languages', async () => {
    field();
    render(<PasswordToggle />);

    const button = await screen.findByRole('button');
    const label = button.getAttribute('aria-label') ?? '';
    expect(label).toContain('Нууц үгийг харах');
    expect(label).toContain('Show password');
  });

  it('attaches to every password field, and only once', async () => {
    field();
    field();
    const { rerender } = render(<PasswordToggle />);
    rerender(<PasswordToggle />);

    expect(await screen.findAllByRole('button')).toHaveLength(2);
  });

  it('takes itself back off when unmounted', async () => {
    const input = field();
    const { unmount } = render(<PasswordToggle />);
    await screen.findByRole('button');

    unmount();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(input.dataset.toggleAttached).toBeUndefined();
  });
});
