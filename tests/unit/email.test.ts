import { describe, expect, it } from 'vitest';
import { resetEmailHtml } from '../../src/payload/collections/users';
import {
  buildEmailAdapter,
  readMailSettings,
  readResendSettings,
  resendAdapter,
} from '../../src/payload/email';

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

describe('the Resend transport', () => {
  const settings = {
    apiKey: 'test-key',
    fromAddress: 'post@example.org',
    fromName: 'Ажилчин Зөгий',
  };

  const sendWith = async (response: Response, message: Record<string, unknown>) => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const original = globalThis.fetch;
    globalThis.fetch = (async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return response;
    }) as unknown as typeof fetch;
    try {
      const adapter = resendAdapter(settings)();
      const result = await adapter.sendEmail(message).catch((error: Error) => error);
      return { calls, result };
    } finally {
      globalThis.fetch = original;
    }
  };

  const ok = () => new Response(JSON.stringify({ id: 'sent' }), { status: 200 });

  it('posts the message to Resend with the key as a bearer token', async () => {
    const { calls } = await sendWith(ok(), {
      to: 'editor@example.org',
      subject: 'Нууц үг сэргээх',
      html: '<p>link</p>',
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]!.url).toBe('https://api.resend.com/emails');
    const headers = calls[0]!.init.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer test-key');

    const body = JSON.parse(calls[0]!.init.body as string);
    expect(body.to).toEqual(['editor@example.org']);
    expect(body.subject).toBe('Нууц үг сэргээх');
    expect(body.from).toBe('Ажилчин Зөгий <post@example.org>');
  });

  it('flattens the address shapes Payload may hand it', async () => {
    const { calls } = await sendWith(ok(), {
      to: [{ address: 'a@example.org', name: 'A' }, 'b@example.org'],
      subject: 'x',
    });

    const body = JSON.parse(calls[0]!.init.body as string);
    expect(body.to).toEqual(['A <a@example.org>', 'b@example.org']);
  });

  it('throws when Resend refuses, so the failure is not silent', async () => {
    const refused = new Response('domain not verified', { status: 403 });
    const { result } = await sendWith(refused, { to: 'x@example.org', subject: 'x' });

    expect(result).toBeInstanceOf(Error);
    expect((result as Error).message).toContain('403');
    expect((result as Error).message).toContain('domain not verified');
  });

  it('never puts the API key in the error it throws', async () => {
    const refused = new Response('nope', { status: 500 });
    const { result } = await sendWith(refused, { to: 'x@example.org', subject: 'x' });

    expect((result as Error).message).not.toContain('test-key');
  });
});

describe('choosing a transport', () => {
  const smtp: NodeJS.ProcessEnv = {
    ...process.env,
    SMTP_HOST: 'smtp.example.org',
    SMTP_USER: 'post@example.org',
    SMTP_PASSWORD: 'secret',
    RESEND_API_KEY: '',
    RESEND_FROM: '',
  };

  it('prefers Resend, which is the one that works on both runtimes', () => {
    const adapter = buildEmailAdapter({
      ...smtp,
      RESEND_API_KEY: 'k',
      RESEND_FROM: 'post@example.org',
    });

    // Only the Resend adapter is a plain function; nodemailer's is a promise.
    expect(typeof adapter).toBe('function');
    expect((adapter as () => { name: string })().name).toBe('resend');
  });

  it('falls back to the SMTP From address when Resend has none of its own', () => {
    const settings = readResendSettings({
      ...smtp,
      RESEND_API_KEY: 'k',
      SMTP_FROM: 'post@example.org',
      SMTP_FROM_NAME: 'Зөгий',
    });

    expect(settings?.fromAddress).toBe('post@example.org');
    expect(settings?.fromName).toBe('Зөгий');
  });

  it('is off when a key is set but there is no address to send from', () => {
    expect(
      readResendSettings({ ...smtp, RESEND_API_KEY: 'k', SMTP_FROM: '' }),
    ).toBeNull();
  });
});
