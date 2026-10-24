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

/**
 * The surveys the figures are read against. Named, but with no link: a URL is
 * a fact to be checked, not guessed, so the editor adds it from the
 * publisher's own page.
 */
const sources = {
  mn: [
    {
      title: 'Хүүхдийн хөдөлмөрийн судалгаа 2021–2022 (ҮСХ / ОУХБ)',
      note: `Үндэсний түвшний судалгаа. Эх холбоосыг нэмнэ үү: ${TBD}`,
    },
    {
      title: 'Хөдөлмөр эрхлэлтийн судалгаа 2022 (ҮСХ)',
      note: `Хөдөлмөрийн зах зээлийн суурь үзүүлэлт. Эх холбоосыг нэмнэ үү: ${TBD}`,
    },
    {
      title: 'Байгууллагын хэргийн бүртгэл',
      note: 'Зөвхөн нэгтгэсэн тоо. Хэрэг тус бүрийн мэдээлэл вэб рүү хэзээ ч гардаггүй.',
    },
  ],
  en: [
    {
      title: 'Child Labour Survey 2021–22 (NSO / ILO)',
      note: `National survey. Add the publisher's link: ${TBD}`,
    },
    {
      title: 'Labour Force Survey 2022 (NSO)',
      note: `Baseline labour market statistics. Add the publisher's link: ${TBD}`,
    },
    {
      title: "The organisation's own case log",
      note: 'Aggregates only. Case-level data never leaves the spreadsheet.',
    },
  ],
} as const;

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

type Row = Record<string, unknown>;

/**
 * Writes a localized array in two passes without losing the first language.
 *
 * Payload keys a localized array's values to its row ids. Sending rows with no
 * ids on the second pass creates new rows and silently drops what the first
 * pass wrote, which is how the Mongolian text went missing the first time this
 * seed ran. So: write Mongolian, read the ids back, then write English onto
 * those same rows.
 */
const withIds = (
  rows: readonly Row[],
  saved: { id?: string | null }[] | null | undefined,
): Row[] => rows.map((row, index) => ({ ...row, id: saved?.[index]?.id ?? undefined }));

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
    const definitions = [{ anchorId: 'tbd-definition', term: TBD, definition: TBD }];
    const countingRules = [{ anchorId: 'tbd-counting-rule', rule: TBD, detail: TBD }];
    const changeLog = [{ date: today, summary: TBD }];

    await payload.updateGlobal({
      slug: 'methodology',
      locale: 'mn',
      overrideAccess: true,
      data: {
        sources: [...sources.mn],
        definitions,
        countingRules,
        limitations: paragraph(TBD),
        changeLog,
        seo: { metaTitle: TBD, metaDescription: TBD },
      },
    });

    const saved = await payload.findGlobal({
      slug: 'methodology',
      locale: 'mn',
      overrideAccess: true,
    });

    await payload.updateGlobal({
      slug: 'methodology',
      locale: 'en',
      overrideAccess: true,
      data: {
        sources: withIds(sources.en, saved?.sources) as never,
        definitions: withIds(definitions, saved?.definitions) as never,
        countingRules: withIds(countingRules, saved?.countingRules) as never,
        limitations: paragraph(TBD),
        changeLog: withIds(changeLog, saved?.changeLog) as never,
        seo: { metaTitle: TBD, metaDescription: TBD },
      },
    });

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
    const history = [{ date: today, status: 'drafted' as const, note: TBD }];

    await payload.updateGlobal({
      slug: 'policy',
      locale: 'mn',
      overrideAccess: true,
      data: {
        summary: TBD,
        fullText: paragraph(TBD),
        status: 'drafted',
        statusDate: today,
        history,
        seo: { metaTitle: TBD, metaDescription: TBD },
      },
    });

    const saved = await payload.findGlobal({
      slug: 'policy',
      locale: 'mn',
      overrideAccess: true,
    });

    await payload.updateGlobal({
      slug: 'policy',
      locale: 'en',
      overrideAccess: true,
      data: {
        summary: TBD,
        fullText: paragraph(TBD),
        status: 'drafted',
        statusDate: today,
        history: withIds(history, saved?.history) as never,
        seo: { metaTitle: TBD, metaDescription: TBD },
      },
    });

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
