import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ThemeSwitch, ThemeToggle } from '../../src/components/theme-switch';

const labels = { auto: 'Авто', light: 'Гэрэлтэй', dark: 'Харанхуй' };

const draw = () => render(<ThemeSwitch legend="Харагдац" labels={labels} />);

const button = (name: string) => screen.getByRole('button', { name });

beforeEach(() => {
  document.documentElement.removeAttribute('data-theme');
  localStorage.clear();
});

afterEach(() => {
  document.documentElement.removeAttribute('data-theme');
  localStorage.clear();
});

describe('choosing a theme', () => {
  it('starts on auto when nothing has been chosen', () => {
    draw();
    expect(button('Авто')).toHaveAttribute('aria-pressed', 'true');
    expect(button('Харанхуй')).toHaveAttribute('aria-pressed', 'false');
  });

  it('marks the document and remembers the choice', async () => {
    const user = userEvent.setup();
    draw();

    await user.click(button('Харанхуй'));

    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    expect(localStorage.getItem('theme')).toBe('dark');
    expect(button('Харанхуй')).toHaveAttribute('aria-pressed', 'true');
  });

  it('auto means no mark at all, so the system setting decides again', async () => {
    const user = userEvent.setup();
    draw();

    await user.click(button('Гэрэлтэй'));
    expect(document.documentElement).toHaveAttribute('data-theme', 'light');

    await user.click(button('Авто'));
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
    expect(localStorage.getItem('theme')).toBeNull();
  });

  it('reads the mark the inline script already set', () => {
    document.documentElement.setAttribute('data-theme', 'dark');
    draw();
    expect(button('Харанхуй')).toHaveAttribute('aria-pressed', 'true');
  });

  it('is one labelled group, not three loose buttons', () => {
    draw();
    expect(screen.getByRole('group', { name: 'Харагдац' })).toBeInTheDocument();
  });
});

describe('the header toggle', () => {
  const actions = {
    auto: 'Харагдац: Авто. Дарвал Гэрэлтэй болно.',
    light: 'Харагдац: Гэрэлтэй. Дарвал Харанхуй болно.',
    dark: 'Харагдац: Харанхуй. Дарвал Авто болно.',
  };

  const drawToggle = () => render(<ThemeToggle actions={actions} />);

  it('says where it stands and what pressing it does', () => {
    drawToggle();
    expect(
      screen.getByRole('button', { name: 'Харагдац: Авто. Дарвал Гэрэлтэй болно.' }),
    ).toBeInTheDocument();
  });

  it('steps auto → light → dark → auto', async () => {
    const user = userEvent.setup();
    drawToggle();

    await user.click(screen.getByRole('button'));
    expect(document.documentElement).toHaveAttribute('data-theme', 'light');

    await user.click(screen.getByRole('button'));
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');

    await user.click(screen.getByRole('button'));
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
  });

  it('agrees with the footer control, because both read the document', async () => {
    const user = userEvent.setup();
    render(
      <>
        <ThemeToggle actions={actions} />
        <ThemeSwitch legend="Харагдац" labels={labels} />
      </>,
    );

    // Press "dark" in the footer; the header button must follow, and now
    // offer the step after dark rather than the one after auto.
    await user.click(
      within(screen.getByRole('group')).getByRole('button', {
        name: 'Харанхуй',
      }),
    );

    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    expect(
      screen.getByRole('button', { name: 'Харагдац: Харанхуй. Дарвал Авто болно.' }),
    ).toBeInTheDocument();
  });
});
