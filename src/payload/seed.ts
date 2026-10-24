import { getPayload } from 'payload';
import config from '../payload.config';

/**
 * First-run content, placeholders only.
 *
 * Nothing here is invented: no people, no partners, no figures, no quotes.
 * Every text field is filled with the agreed placeholder so the editor can
 * see where real content belongs (CLAUDE.md: use clearly marked placeholders).
 *
 * Run with: pnpm seed
 * It is safe to run repeatedly — a field that already has content is left alone.
 */

const TBD = '[ХҮЛЭЭГДЭЖ БУЙ / TBD]';
const today = new Date().toISOString().slice(0, 10);

/** Minimal Lexical document holding a single paragraph. */
const paragraph = (text: string) => ({
  root: {
    type: 'root',
    format: '' as const,
    indent: 0,
    version: 1,
    direction: 'ltr' as const,
    children: [
      {
        type: 'paragraph',
        format: '' as const,
        indent: 0,
        version: 1,
        direction: 'ltr' as const,
        textFormat: 0,
        children: [
          {
            type: 'text',
            detail: 0,
            format: 0,
            mode: 'normal',
            style: '',
            text,
            version: 1,
          },
        ],
      },
    ],
  },
});

const seed = async () => {
  const payload = await getPayload({ config });
  const { logger } = payload;

  // ── First admin account ────────────────────────────────────────────────
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;

  if (email && password) {
    const existing = await payload.find({
      collection: 'users',
      where: { email: { equals: email } },
      limit: 1,
      overrideAccess: true,
    });

    if (existing.totalDocs === 0) {
      await payload.create({
        collection: 'users',
        data: { email, password, name: TBD, role: 'admin' },
        overrideAccess: true,
      });
      logger.info(`Created admin user ${email}`);
    } else {
      logger.info(`Admin user ${email} already exists — left untouched`);
    }
  } else {
    logger.info(
      'SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD not set — skipping user creation. ' +
        'The client can create the first admin at /admin.',
    );
  }

  // ── Site ───────────────────────────────────────────────────────────────
  const site = await payload.findGlobal({
    slug: 'site',
    locale: 'mn',
    overrideAccess: true,
  });

  if (!site?.missionLine) {
    for (const locale of ['mn', 'en'] as const) {
      await payload.updateGlobal({
        slug: 'site',
        locale,
        overrideAccess: true,
        data: {
          missionLine: TBD,
          contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'tbd@example.org',
          organization: { legalName: TBD, addressCity: TBD },
          seo: { metaTitle: TBD, metaDescription: TBD },
        },
      });
    }
    logger.info('Seeded Site global with placeholders');
  } else {
    logger.info('Site global already filled in — left untouched');
  }

  // ── Methodology ────────────────────────────────────────────────────────
  const methodology = await payload.findGlobal({
    slug: 'methodology',
    locale: 'mn',
    overrideAccess: true,
  });

  if (!methodology?.definitions?.length) {
    for (const locale of ['mn', 'en'] as const) {
      await payload.updateGlobal({
        slug: 'methodology',
        locale,
        overrideAccess: true,
        data: {
          sources: [{ title: TBD, note: TBD }],
          // Anchor ids are part of published URLs. These two are placeholders
          // and should be replaced before the first real figure links to them.
          definitions: [{ anchorId: 'tbd-definition', term: TBD, definition: TBD }],
          countingRules: [{ anchorId: 'tbd-counting-rule', rule: TBD, detail: TBD }],
          limitations: paragraph(TBD),
          changeLog: [{ date: today, summary: TBD }],
          seo: { metaTitle: TBD, metaDescription: TBD },
        },
      });
    }
    logger.info('Seeded Methodology global with placeholders');
  } else {
    logger.info('Methodology global already filled in — left untouched');
  }

  // ── Policy ─────────────────────────────────────────────────────────────
  const policy = await payload.findGlobal({
    slug: 'policy',
    locale: 'mn',
    overrideAccess: true,
  });

  if (!policy?.summary) {
    for (const locale of ['mn', 'en'] as const) {
      await payload.updateGlobal({
        slug: 'policy',
        locale,
        overrideAccess: true,
        data: {
          summary: TBD,
          fullText: paragraph(TBD),
          status: 'drafted',
          statusDate: today,
          history: [{ date: today, status: 'drafted', note: TBD }],
          seo: { metaTitle: TBD, metaDescription: TBD },
        },
      });
    }
    logger.info('Seeded Policy global with placeholders');
  } else {
    logger.info('Policy global already filled in — left untouched');
  }

  // Papers, Team and Partners are intentionally left empty: a real person,
  // partner or paper must never be invented by a script.
  logger.info('Papers, Team and Partners left empty on purpose.');
  logger.info('Seed complete.');
};

await seed();
process.exit(0);
