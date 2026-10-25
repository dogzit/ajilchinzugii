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

export function buildEmailAdapter(env: NodeJS.ProcessEnv = process.env) {
  const settings = readMailSettings(env);
  if (!settings) return undefined;

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
