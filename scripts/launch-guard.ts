/**
 * The check that stands between a misconfigured deployment and Google.
 *
 * It lives here rather than under src/ for two reasons: it is build tooling,
 * not site code, and it has to name the platform hostnames that must never be
 * indexed — which is exactly what tests/unit/seo-launch.test.ts forbids inside
 * src/.
 *
 * next.config.ts calls it at the top, so it runs however the build was
 * started: `pnpm build`, `next build`, or Vercel's own command. The npm
 * `prebuild` hook cannot make that promise — a build command that calls
 * `next build` directly skips it, which is how a deployment once went out
 * with indexing open and the wrong hostname in every canonical link.
 *
 * It only speaks up when indexing is open. Until then the site is a private
 * draft and may say whatever it likes about itself.
 */

export type LaunchProblem = { kind: 'error' | 'warning'; message: string };

/** Just the variables this reads — `process.env` satisfies it. */
type Env = Record<string, string | undefined>;

/**
 * Hosts a platform hands out. A site indexed under one of these teaches a
 * search engine that the deployment is the site; moving to the real domain
 * afterwards means asking it to unlearn that.
 */
const PLATFORM_SUFFIXES = [
  '.vercel.app',
  '.netlify.app',
  '.pages.dev',
  '.fly.dev',
  '.workers.dev',
];

/**
 * Variables without which the build cannot finish, and the one-line reason
 * each is needed. They are checked together so a misconfigured deployment
 * fails once with the whole list, rather than once per variable across four
 * builds — which is exactly how the first Cloudflare build went.
 *
 * `NEXT_PUBLIC_SITE_URL` would otherwise fail deep inside page collection,
 * from `src/lib/site.ts`, naming only itself. The other two fail later still,
 * when a prerendered page reaches for the database.
 */
const REQUIRED_TO_BUILD: Array<{ name: string; why: string }> = [
  {
    name: 'NEXT_PUBLIC_SITE_URL',
    why: 'every canonical, hreflang, sitemap and OG URL is built from it',
  },
  {
    name: 'PAYLOAD_SECRET',
    why: 'Payload refuses to start without it, and the build renders CMS pages',
  },
  {
    name: 'DATABASE_URL',
    why: 'the research and team pages read their slugs from Postgres at build time',
  },
];

/** Missing build-time variables, or an empty list. */
export function missingBuildEnv(env: Env): Array<{ name: string; why: string }> {
  return REQUIRED_TO_BUILD.filter(({ name }) => !env[name]?.trim());
}

const isPlatformHost = (host: string) =>
  PLATFORM_SUFFIXES.some((suffix) => host.endsWith(suffix));

const isLocalHost = (host: string) =>
  host === 'localhost' ||
  host.endsWith('.localhost') ||
  /^\d{1,3}(\.\d{1,3}){3}$/.test(host) ||
  host === '::1';

const hostOf = (url: string): string | null => {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
};

/** Everything wrong with this environment, in the order it should be fixed. */
export function launchProblems(env: Env): LaunchProblem[] {
  const indexing =
    (env.DEPLOY_ENV?.trim() === 'production' || env.VERCEL_ENV === 'production') &&
    env.NEXT_PUBLIC_ALLOW_INDEXING?.trim() === 'true';

  // A draft deployment is allowed to be anything at all.
  if (!indexing) return [];

  const problems: LaunchProblem[] = [];
  const siteUrl = env.NEXT_PUBLIC_SITE_URL?.trim();
  const host = siteUrl ? hostOf(siteUrl) : null;

  if (!siteUrl || !host) {
    problems.push({
      kind: 'error',
      message:
        'NEXT_PUBLIC_SITE_URL тохируулаагүй эсвэл буруу байна / is missing or is ' +
        'not a URL. Canonical, hreflang, sitemap, og:url бүгд эндээс бүтдэг.',
    });
    return problems;
  }

  if (isPlatformHost(host) || isLocalHost(host)) {
    problems.push({
      kind: 'error',
      message:
        `NEXT_PUBLIC_SITE_URL нь ${host} гэсэн байна — энэ бол сайтын жинхэнэ ` +
        'домэйн биш. Canonical, hreflang, sitemap, og:url бүгд энэ хаягаар ' +
        'бичигдэж, Google жинхэнэ домэйныг тусдаа сайт гэж үзнэ.\n' +
        `  NEXT_PUBLIC_SITE_URL is ${host}, which is a platform or local host, ` +
        'not the site’s own domain. Every canonical link, hreflang, sitemap ' +
        'entry and share card would name it.',
    });
  }

  const canonical = env.SITE_CANONICAL_HOST?.trim().toLowerCase();
  if (canonical && canonical !== host) {
    problems.push({
      kind: 'error',
      message:
        `SITE_CANONICAL_HOST (${canonical}) ба NEXT_PUBLIC_SITE_URL-ийн хост ` +
        `(${host}) зөрж байна. Хүсэлтүүд нэг хост руу, canonical нь нөгөө рүү ` +
        'заана — canonical бүр redirect болж, нэг ч хуудас индексэд орохгүй.\n' +
        '  The two name different hosts, so every canonical URL would redirect.',
    });
  }

  const plausible = env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN?.trim().toLowerCase();
  if (plausible && plausible !== host) {
    problems.push({
      kind: 'warning',
      message:
        `NEXT_PUBLIC_PLAUSIBLE_DOMAIN (${plausible}) нь сайтын хост (${host}) ` +
        'биш байна — тоолуур нэг ч зочин бүртгэхгүй. / Analytics would record ' +
        'nothing.',
    });
  }

  return problems;
}

/**
 * Fails the build on anything that would be published wrong, and prints the
 * rest. Warnings do not stop a build: a counter that records nothing is worth
 * saying out loud, but it is not worth refusing to ship over.
 */
export function assertBuildEnv(env: Env): void {
  const missing = missingBuildEnv(env);
  if (missing.length === 0) return;

  throw new Error(
    [
      '',
      'Build хийхэд дараах хувьсагчид дутуу байна / This build is missing:',
      '',
      ...missing.map(({ name, why }) => `  ✖ ${name} — ${why}`),
      '',
      'Бүгдийг нь нэг дор тохируулна уу / Set all of them, then build again.',
      'Cloudflare Workers:  pnpm exec wrangler secret put <NAME>',
      'Vercel:              Settings → Environment Variables',
      'Дэлгэрэнгүй / details: CLOUDFLARE_BUILD_SETUP.md',
      '',
    ].join('\n'),
  );
}

export function assertLaunchReady(env: Env): void {
  const problems = launchProblems(env);
  const errors = problems.filter((problem) => problem.kind === 'error');

  for (const { message } of problems.filter((problem) => problem.kind === 'warning')) {
    console.warn(`\n⚠ ${message}\n`);
  }

  if (errors.length === 0) return;

  throw new Error(
    [
      '',
      'Индексжилт нээлттэй байхад энэ тохиргоогоор build хийж болохгүй.',
      'This build may be indexed, and this environment would publish it wrong.',
      '',
      ...errors.map(({ message }) => `  ✖ ${message}`),
      '',
      'Платформынхаа орчны хувьсагчийг засаад дахин deploy хий.',
      'Fix them in the platform’s environment variables and deploy again.',
      'Эсвэл агуулга бэлэн болтол NEXT_PUBLIC_ALLOW_INDEXING=false болго.',
      '',
    ].join('\n'),
  );
}
