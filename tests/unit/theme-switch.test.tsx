import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ThemeKeeper } from '../../src/components/theme-keeper';
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
  it('starts on light when nothing has been chosen', () => {
    draw();
    expect(button('Гэрэлтэй')).toHaveAttribute('aria-pressed', 'true');
    expect(button('Авто')).toHaveAttribute('aria-pressed', 'false');
    expect(button('Харанхуй')).toHaveAttribute('aria-pressed', 'false');
  });

  it('offers light, then dark, then auto', () => {
    draw();
    const names = within(screen.getByRole('group'))
      .getAllByRole('button')
      .map((element) => element.textContent);

    expect(names).toEqual(['Гэрэлтэй', 'Харанхуй', 'Авто']);
  });

  it('marks the document and remembers the choice', async () => {
    const user = userEvent.setup();
    draw();

    await user.click(button('Харанхуй'));

    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    expect(localStorage.getItem('theme')).toBe('dark');
    expect(button('Харанхуй')).toHaveAttribute('aria-pressed', 'true');
  });

  it('auto hands the decision to the system setting', async () => {
    const user = userEvent.setup();
    draw();

    await user.click(button('Авто'));

    expect(document.documentElement).toHaveAttribute('data-theme', 'auto');
    expect(localStorage.getItem('theme')).toBe('auto');
  });

  it('light is the absence of a mark, and still a recorded choice', async () => {
    const user = userEvent.setup();
    draw();

    await user.click(button('Харанхуй'));
    await user.click(button('Гэрэлтэй'));

    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
    // Recorded, so the reader is not handed a new default later on.
    expect(localStorage.getItem('theme')).toBe('light');
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
      screen.getByRole('button', { name: 'Харагдац: Гэрэлтэй. Дарвал Харанхуй болно.' }),
    ).toBeInTheDocument();
  });

  it('steps light → dark → auto → light', async () => {
    const user = userEvent.setup();
    drawToggle();

    await user.click(screen.getByRole('button'));
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');

    await user.click(screen.getByRole('button'));
    expect(document.documentElement).toHaveAttribute('data-theme', 'auto');

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
    // offer the step after dark rather than the one after light.
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

/**
 * Switching language re-mounts <html>, and React strips every attribute off
 * it on the way out. This is that loss, and the recovery.
 */
describe('after a language switch', () => {
  it('puts the chosen theme back on the document', () => {
    localStorage.setItem('theme', 'dark');
    document.documentElement.removeAttribute('data-theme');

    render(<ThemeKeeper />);

    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
  });

  it('leaves a reader who has chosen nothing on light', () => {
    render(<ThemeKeeper />);
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
  });

  it('brings the switch back in step with the page', async () => {
    const user = userEvent.setup();
    draw();
    await user.click(button('Авто'));

    // What the re-mount costs us.
    document.documentElement.removeAttribute('data-theme');
    render(<ThemeKeeper />);

    expect(document.documentElement).toHaveAttribute('data-theme', 'auto');
    expect(button('Авто')).toHaveAttribute('aria-pressed', 'true');
  });
});
