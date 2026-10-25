import { describe, expect, it } from 'vitest';
import { resetEmailHtml } from '../../src/payload/collections/users';
import { readMailSettings } from '../../src/payload/email';

const full: NodeJS.ProcessEnv = {
  ...process.env,
  SMTP_HOST: 'smtp.example.net',
  SMTP_USER: 'robot@example.org',
  SMTP_PASSWORD: 'secret',
  SMTP_PORT: '',
  SMTP_FROM: '',
  SMTP_FROM_NAME: '',
};

describe('mail is configured only when it can actually send', () => {
  it('is off when nothing is set', () => {
    expect(
      readMailSettings({
        ...process.env,
        SMTP_HOST: '',
        SMTP_USER: '',
        SMTP_PASSWORD: '',
      }),
    ).toBeNull();
  });

  it.each(['SMTP_HOST', 'SMTP_USER', 'SMTP_PASSWORD'])('is off without %s', (missing) => {
    const env = { ...full, [missing]: '' };
    expect(readMailSettings(env)).toBeNull();
  });

  it('ignores whitespace-only values', () => {
    expect(readMailSettings({ ...full, SMTP_PASSWORD: '   ' })).toBeNull();
  });

  it('defaults to 587 with STARTTLS', () => {
    expect(readMailSettings(full)).toMatchObject({ port: 587, secure: false });
  });

  it('treats 465 as implicit TLS', () => {
    expect(readMailSettings({ ...full, SMTP_PORT: '465' })).toMatchObject({
      port: 465,
      secure: true,
    });
  });

  it('refuses a port that is not a port', () => {
    expect(readMailSettings({ ...full, SMTP_PORT: 'mail' })).toBeNull();
    expect(readMailSettings({ ...full, SMTP_PORT: '70000' })).toBeNull();
  });

  it('sends from the authenticated mailbox unless told otherwise', () => {
    expect(readMailSettings(full)?.fromAddress).toBe('robot@example.org');
    expect(readMailSettings({ ...full, SMTP_FROM: 'hello@zugii.mn' })?.fromAddress).toBe(
      'hello@zugii.mn',
    );
  });
});

describe('the password-reset message', () => {
  it('carries the reset link built from the site URL', () => {
    const previous = process.env.NEXT_PUBLIC_SITE_URL;
    process.env.NEXT_PUBLIC_SITE_URL = 'https://example.org/';

    const html = resetEmailHtml('abc123');
    expect(html).toContain('https://example.org/admin/reset/abc123');

    process.env.NEXT_PUBLIC_SITE_URL = previous;
  });

  it('is written in Mongolian first, with English under it', () => {
    const html = resetEmailHtml('t');
    expect(html).toContain('нууц үгээ');
    expect(html.indexOf('нууц үгээ')).toBeLessThan(html.indexOf('reset your'));
  });

  it('never embeds the password itself', () => {
    expect(resetEmailHtml('t')).not.toMatch(/password\s*[:=]/i);
  });
});
