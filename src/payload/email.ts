import { nodemailerAdapter } from '@payloadcms/email-nodemailer';

/**
 * Outgoing mail for the admin panel.
 *
 * Payload sends exactly one kind of message on this site: the password-reset
 * link. Without a transport it writes that mail to the server log, where an
 * editor will never see it — so "Forgot password" silently does nothing.
 *
 * The variable names are the ones the nightly-backup workflow already uses,
 * so one mailbox serves both and there is one set of credentials to rotate.
 *
 * Nothing is configured unless the host, user and password are all present:
 * `pnpm build`, the tests and a fresh clone must all run without mail
 * credentials.
 */

export type MailSettings = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  fromAddress: string;
  fromName: string;
};

const trimmed = (value: string | undefined): string => value?.trim() ?? '';

export function readMailSettings(
  env: NodeJS.ProcessEnv = process.env,
): MailSettings | null {
  const host = trimmed(env.SMTP_HOST);
  const user = trimmed(env.SMTP_USER);
  const password = trimmed(env.SMTP_PASSWORD);

  if (!host || !user || !password) return null;

  const port = Number(trimmed(env.SMTP_PORT) || '587');
  if (!Number.isInteger(port) || port <= 0 || port > 65535) return null;

  return {
    host,
    port,
    // 465 is implicit TLS; 587 and 25 start in the clear and upgrade.
    secure: port === 465,
    user,
    password,
    // Many providers reject a From that is not the authenticated mailbox.
    fromAddress: trimmed(env.SMTP_FROM) || user,
    fromName: trimmed(env.SMTP_FROM_NAME) || 'Ажилчин Зөгий',
  };
}

export type ResendSettings = {
  apiKey: string;
  fromAddress: string;
  fromName: string;
};

/**
 * Resend settings, when a key is present.
 *
 * The From address still comes from the SMTP variables when they are set, so
 * one mailbox and one signature serve both transports and there is nothing
 * to keep in step by hand.
 */
export function readResendSettings(
  env: NodeJS.ProcessEnv = process.env,
): ResendSettings | null {
  const apiKey = trimmed(env.RESEND_API_KEY);
  if (!apiKey) return null;

  const fromAddress = trimmed(env.RESEND_FROM) || trimmed(env.SMTP_FROM);
  if (!fromAddress) return null;

  return {
    apiKey,
    fromAddress,
    fromName: trimmed(env.RESEND_FROM_NAME) || trimmed(env.SMTP_FROM_NAME) || 'Ажилчин Зөгий',
  };
}

/** True inside workerd, where a TCP socket to an SMTP server is not available. */
export function onWorkers(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    (navigator as { userAgent?: string }).userAgent === 'Cloudflare-Workers'
  );
}

/**
 * Payload inherits nodemailer's address type, which may be a string, an
 * object with a display name, or a list mixing both. Resend wants plain
 * strings, so every shape is flattened to one.
 */
type Address = unknown;

const one = (value: unknown): string | null => {
  if (typeof value === 'string') return value.trim() || null;
  if (value && typeof value === 'object' && 'address' in value) {
    const { address, name } = value as { address?: string; name?: string };
    if (!address) return null;
    return name ? `${name} <${address}>` : address;
  }
  return null;
};

const list = (value: Address): string[] =>
  (Array.isArray(value) ? value : [value])
    .map(one)
    .filter((entry): entry is string => Boolean(entry));

/**
 * Payload's email adapter over Resend's HTTP API.
 *
 * SMTP is a TCP protocol and a Worker cannot open one, so nodemailer stops
 * working the moment the site runs on Cloudflare — and "Forgot password"
 * stops with it, silently, because Payload falls back to writing the mail
 * into a log nobody reads. HTTP works on both runtimes, so this is the
 * transport wherever a key is set.
 */
export function resendAdapter(settings: ResendSettings) {
  return () => ({
    name: 'resend',
    defaultFromAddress: settings.fromAddress,
    defaultFromName: settings.fromName,
    sendEmail: async (message: {
      to?: Address;
      cc?: Address;
      bcc?: Address;
      from?: unknown;
      subject?: unknown;
      html?: unknown;
      text?: unknown;
      replyTo?: unknown;
    }) => {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${settings.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: one(message.from) ?? `${settings.fromName} <${settings.fromAddress}>`,
          to: list(message.to),
          ...(list(message.cc).length ? { cc: list(message.cc) } : {}),
          ...(list(message.bcc).length ? { bcc: list(message.bcc) } : {}),
          subject: typeof message.subject === 'string' ? message.subject : '',
          ...(typeof message.html === 'string' ? { html: message.html } : {}),
          ...(typeof message.text === 'string' ? { text: message.text } : {}),
          ...(one(message.replyTo) ? { reply_to: one(message.replyTo) } : {}),
        }),
      });

      if (!response.ok) {
        // The body can carry the address that was refused; the key never
        // appears in it, and the key is the only secret in this request.
        const detail = await response.text().catch(() => '');
        throw new Error(
          `Resend refused the message (${response.status}): ${detail.slice(0, 300)}`,
        );
      }

      return response.json();
    },
  });
}

export function buildEmailAdapter(env: NodeJS.ProcessEnv = process.env) {
  // HTTP first: it is the only one of the two that works everywhere.
  const resend = readResendSettings(env);
  if (resend) return resendAdapter(resend);

  const settings = readMailSettings(env);
  if (!settings) return undefined;

  // SMTP is configured but unusable here. Returning undefined rather than an
  // adapter that throws on every send keeps Payload's own "no transport"
  // warning as the thing an operator sees.
  if (onWorkers()) return undefined;

  return nodemailerAdapter({
    defaultFromAddress: settings.fromAddress,
    defaultFromName: settings.fromName,
    transportOptions: {
      host: settings.host,
      port: settings.port,
      secure: settings.secure,
      auth: { user: settings.user, pass: settings.password },
    },
  });
}
