import { getPayload } from 'payload';
import sharp from 'sharp';
import config from '../payload.config';
import { parseSheet } from '../lib/impact/schema';
import { suppressSmallCells } from '../lib/impact/suppress';
import { snapshotHash } from '../lib/impact/index';

/**
 * Demo content, for showing the client a working site before the real content
 * exists.
 *
 * CLAUDE.md says not to invent statistics, names, partners or quotes. This
 * script does invent them — so every single value it writes carries a visible
 * DEMO marker, in both languages, in the text a reader actually sees. Nobody
 * can mistake a demo figure for a published one, and nothing here can quietly
 * survive into the live site.
 *
 *   pnpm seed:demo         add it
 *   pnpm seed:demo:clear   take it all back out
 *
 * The real content replaces it through the admin panel; the real figures
 * arrive from the spreadsheet and overwrite the snapshot on the next fetch.
 */

const MARK_MN = 'ЖИШЭЭ';
const MARK_EN = 'SAMPLE';
const mark = (mn: string, en: string) => ({
  mn: `${MARK_MN}: ${mn}`,
  en: `${MARK_EN}: ${en}`,
});

/** Everything this script creates is tagged so the clear step can find it. */
const DEMO_SLUG_PREFIX = 'demo-';
const DEMO_NAME_PREFIX = `${MARK_MN}:`;

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
const withIds = (
  rows: readonly Row[],
  saved: { id?: string | null }[] | null | undefined,
): Row[] => rows.map((row, index) => ({ ...row, id: saved?.[index]?.id ?? undefined }));

// ── The figures ─────────────────────────────────────────────────────────────
// Shaped exactly like the spreadsheet, so the demo exercises the real
// pipeline: zod validation, small-cell suppression, the chart's gaps.
const demoSheet = {
  totals: [
    [
      'metric_id',
      'label_mn',
      'label_en',
      'value',
      'n_cases',
      'as_of',
      'method_anchor',
      'show_on_home',
    ],
    [
      'demo-cases-resolved',
      `${MARK_MN}: Шийдвэрлэсэн хэрэг`,
      `${MARK_EN}: Cases resolved`,
      128,
      128,
      '2026-09-30',
      'demo-counting-cases',
      'TRUE',
    ],
    [
      'demo-wages-recovered',
      `${MARK_MN}: Нөхөн олгуулсан цалин (₮)`,
      `${MARK_EN}: Wages recovered (MNT)`,
      48_600_000,
      61,
      '2026-09-30',
      'demo-counting-wages',
      'TRUE',
    ],
    [
      'demo-agreements',
      `${MARK_MN}: Байгуулсан хамтын хэлэлцээр`,
      `${MARK_EN}: Collective agreements`,
      9,
      9,
      '2026-08-31',
      'demo-counting-cases',
      'TRUE',
    ],
    // Four cases: the site must refuse to print this one.
    [
      'demo-workplaces',
      `${MARK_MN}: Нөхцөлөө өөрчилсөн ажлын байр`,
      `${MARK_EN}: Workplaces that changed terms`,
      4,
      4,
      '2026-09-30',
      'demo-counting-cases',
      'TRUE',
    ],
    [
      'demo-training',
      `${MARK_MN}: Сургалтад хамрагдсан`,
      `${MARK_EN}: Took part in training`,
      410,
      410,
      '2026-09-30',
      'demo-definition-member',
      'FALSE',
    ],
  ],
  monthly: [
    ['month', 'metric_id', 'value', 'n_cases'],
    ['2026-01', 'demo-cases-resolved', 6, 6],
    ['2026-02', 'demo-cases-resolved', 11, 11],
    ['2026-03', 'demo-cases-resolved', 9, 9],
    // Three cases: a gap in the line, never a zero.
    ['2026-04', 'demo-cases-resolved', 3, 3],
    ['2026-05', 'demo-cases-resolved', 14, 14],
    ['2026-06', 'demo-cases-resolved', 18, 18],
    ['2026-07', 'demo-cases-resolved', 21, 21],
    ['2026-08', 'demo-cases-resolved', 19, 19],
    ['2026-09', 'demo-cases-resolved', 27, 27],
    ['2026-06', 'demo-wages-recovered', 7_450_000, 9],
    ['2026-07', 'demo-wages-recovered', 12_300_000, 16],
    ['2026-08', 'demo-wages-recovered', 9_950_000, 11],
    ['2026-09', 'demo-wages-recovered', 18_900_000, 25],
  ],
};

/** A flat wordmark, so the partner logos exercise the image pipeline. */
async function logoPng(label: string, tint: string): Promise<Buffer> {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="180">
    <rect width="480" height="180" fill="#f2efe9"/>
    <rect x="24" y="78" width="64" height="24" fill="${tint}"/>
    <text x="104" y="104" font-family="sans-serif" font-size="34" fill="#3a352d">${label}</text>
  </svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

const clearing = process.argv.includes('--clear');

const run = async () => {
  const payload = await getPayload({ config });
  const { logger } = payload;

  // ── Clear ────────────────────────────────────────────────────────────────
  if (clearing) {
    for (const collection of ['papers', 'team', 'partners'] as const) {
      const { docs } = await payload.find({
        collection,
        limit: 200,
        draft: true,
        overrideAccess: true,
      });
      for (const doc of docs) {
        const label = String(
          (doc as { slug?: string; name?: string }).slug ??
            (doc as { name?: string }).name ??
            '',
        );
        if (label.startsWith(DEMO_SLUG_PREFIX) || label.startsWith(DEMO_NAME_PREFIX)) {
          await payload.delete({ collection, id: doc.id, overrideAccess: true });
          logger.info(`removed demo ${collection}: ${label}`);
        }
      }
    }

    const { docs: media } = await payload.find({
      collection: 'media',
      limit: 200,
      overrideAccess: true,
    });
    for (const file of media) {
      if (file.alt?.mn?.startsWith(DEMO_NAME_PREFIX)) {
        await payload.delete({ collection: 'media', id: file.id, overrideAccess: true });
        logger.info(`removed demo media: ${file.filename}`);
      }
    }

    await payload.updateGlobal({
      slug: 'impact-snapshot',
      overrideAccess: true,
      data: { data: null, fetchedAt: null },
    });
    logger.info('cleared the demo figures');
    logger.info(
      'Site, Methodology and Policy keep whatever text they hold — edit those in /admin.',
    );
    process.exit(0);
  }

  // ── Figures ──────────────────────────────────────────────────────────────
  const suppressed = suppressSmallCells(parseSheet(demoSheet));
  await payload.updateGlobal({
    slug: 'impact-snapshot',
    overrideAccess: true,
    data: {
      data: {
        version: 1,
        fetchedAt: new Date().toISOString(),
        hash: snapshotHash(suppressed),
        ...suppressed,
      },
      fetchedAt: new Date().toISOString(),
    },
  });
  logger.info(
    `figures: ${suppressed.metrics.length} metrics, ${suppressed.monthly.length} months ` +
      `(${suppressed.metrics.filter((m) => m.suppressed).length} suppressed)`,
  );

  // ── Site ─────────────────────────────────────────────────────────────────
  const mission = mark(
    'Хөдөлмөр эрхэлж байгаа хүүхэд, залуучуудын хөдөлмөрийн эрхийг хамтын хэлэлцээр, тохиролцоо, бодлогын ажлаар хамгаална.',
    'We protect the labour rights of working children and teens through collective bargaining, negotiation and policy work.',
  );
  for (const locale of ['mn', 'en'] as const) {
    await payload.updateGlobal({
      slug: 'site',
      locale,
      overrideAccess: true,
      data: {
        missionLine: mission[locale],
        organization: {
          legalName:
            locale === 'mn'
              ? `${MARK_MN}: "Ажилчин Зөгий" ТББ`
              : `${MARK_EN}: Ajilchin Zögii NGO`,
          foundingDate: '2021-04-15',
          addressCity: locale === 'mn' ? 'Улаанбаатар' : 'Ulaanbaatar',
        },
      },
    });
  }
  logger.info('site: mission line and organisation');

  // ── Methodology ──────────────────────────────────────────────────────────
  const definitions = [
    {
      anchorId: 'demo-definition-member',
      term: mark('Гишүүн', 'Member'),
      definition: mark(
        'Байгууллагад бүртгүүлсэн, хөдөлмөр эрхэлж байгаа 14–24 насны хүн.',
        'A working person aged 14–24 registered with the organisation.',
      ),
    },
  ];
  const countingRules = [
    {
      anchorId: 'demo-counting-cases',
      rule: mark('Шийдвэрлэсэн хэрэг', 'Cases resolved'),
      detail: mark(
        'Ажил олгогчтой бичгээр тохиролцсон, эсвэл хөдөлмөрийн маргаан таслах комиссын шийдвэр гарсан хэргийг нэг удаа тоолно.',
        'A case counts once, when a written agreement is reached with the employer or a labour dispute commission has ruled.',
      ),
    },
    {
      anchorId: 'demo-counting-wages',
      rule: mark('Нөхөн олгуулсан цалин', 'Wages recovered'),
      detail: mark(
        'Гишүүнд бодитоор олгогдсон дүнг тухайн сард нь бүртгэнэ. Амлалт, тооцоог оруулахгүй.',
        'Only money actually paid to a member, recorded in the month it was paid. Promises are not counted.',
      ),
    },
  ];
  const changeLog = [
    {
      date: '2026-09-01',
      summary: mark(
        '"Шийдвэрлэсэн хэрэг"-ийн тодорхойлолтод зуучлалаар эцэслэсэн тохиолдлыг нэмж тооцохоор болов.',
        'Cases settled through mediation now count as resolved.',
      ),
    },
    {
      date: '2026-06-15',
      summary: mark(
        'Сарын тоог нийтэлж эхлэв.',
        'Monthly figures published for the first time.',
      ),
    },
  ];
  const limitations = {
    mn: `${MARK_MN}: Эдгээр тоо нь зөвхөн бидэнд хандсан хүмүүсийг хамарна. Хөдөлмөрийн эрхийн зөрчлийн нийт тоог харуулахгүй. 5-аас цөөн хэрэгт тулгуурласан тоог нийтлэхгүй.`,
    en: `${MARK_EN}: These figures cover only the people who came to us. They do not show the total number of labour rights violations. Figures resting on fewer than five cases are not published.`,
  };

  await payload.updateGlobal({
    slug: 'methodology',
    locale: 'mn',
    overrideAccess: true,
    data: {
      definitions: definitions.map((d) => ({
        ...d,
        term: d.term.mn,
        definition: d.definition.mn,
      })),
      countingRules: countingRules.map((r) => ({
        ...r,
        rule: r.rule.mn,
        detail: r.detail.mn,
      })),
      changeLog: changeLog.map((c) => ({ ...c, summary: c.summary.mn })),
      limitations: paragraph(limitations.mn),
    } as never,
  });
  const savedMethodology = await payload.findGlobal({
    slug: 'methodology',
    locale: 'mn',
    overrideAccess: true,
  });
  await payload.updateGlobal({
    slug: 'methodology',
    locale: 'en',
    overrideAccess: true,
    data: {
      definitions: withIds(
        definitions.map((d) => ({ ...d, term: d.term.en, definition: d.definition.en })),
        savedMethodology?.definitions,
      ),
      countingRules: withIds(
        countingRules.map((r) => ({ ...r, rule: r.rule.en, detail: r.detail.en })),
        savedMethodology?.countingRules,
      ),
      changeLog: withIds(
        changeLog.map((c) => ({ ...c, summary: c.summary.en })),
        savedMethodology?.changeLog,
      ),
      limitations: paragraph(limitations.en),
    } as never,
  });
  logger.info('methodology: definitions, counting rules, change log, limitations');

  // ── Policy ───────────────────────────────────────────────────────────────
  const summary = mark(
    '14–17 насны хөдөлмөр эрхлэгчдийн ажлын цагийг тодорхой болгох, хөдөлмөрийн гэрээг заавал бичгээр байгуулах тухай хуулийн нэмэлт, өөрчлөлтийн санал.',
    'A proposal to define working hours for 14–17 year olds and to require a written contract.',
  );
  const history = [
    {
      date: '2026-02-10',
      status: 'drafted' as const,
      note: mark('Анхны төсөл боловсруулав.', 'First draft prepared.'),
    },
    {
      date: '2026-05-20',
      status: 'submitted' as const,
      note: mark('Яаманд албан бичгээр хүргүүлэв.', 'Submitted to the ministry.'),
    },
    {
      date: '2026-09-08',
      status: 'under-review' as const,
      note: mark('Ажлын хэсэг хэлэлцэж эхлэв.', 'A working group began its review.'),
    },
  ];

  await payload.updateGlobal({
    slug: 'policy',
    locale: 'mn',
    overrideAccess: true,
    data: {
      summary: summary.mn,
      status: 'under-review',
      statusDate: '2026-09-08',
      history: history.map((h) => ({ ...h, note: h.note.mn })),
      fullText: paragraph(
        `${MARK_MN}: Саналын бүрэн эхийг энд байрлуулна. Админ дотроос засварлана.`,
      ),
    } as never,
  });
  const savedPolicy = await payload.findGlobal({
    slug: 'policy',
    locale: 'mn',
    overrideAccess: true,
  });
  await payload.updateGlobal({
    slug: 'policy',
    locale: 'en',
    overrideAccess: true,
    data: {
      summary: summary.en,
      status: 'under-review',
      statusDate: '2026-09-08',
      history: withIds(
        history.map((h) => ({ ...h, note: h.note.en })),
        savedPolicy?.history,
      ),
      fullText: paragraph(`${MARK_EN}: The full text of the proposal goes here.`),
    } as never,
  });
  logger.info('policy: summary, status and a three-step history');

  // ── Partners, with logos, so the media pipeline shows ────────────────────
  for (const [label, tint] of [
    ['Partner A', '#b06e07'],
    ['Partner B', '#5c564b'],
  ] as const) {
    const png = await logoPng(label, tint);
    const logo = await payload.create({
      collection: 'media',
      overrideAccess: true,
      data: {
        alt: {
          mn: `${MARK_MN}: ${label}-ийн лого`,
          en: `${MARK_EN}: ${label} logo`,
        },
        subject: 'none',
      },
      file: { data: png, mimetype: 'image/png', name: 'logo.png', size: png.length },
    });

    await payload.create({
      collection: 'partners',
      overrideAccess: true,
      data: {
        name: `${MARK_MN}: ${label}`,
        logo: logo.id,
        url: 'https://example.org',
      },
    });
  }
  logger.info('partners: 2, with logos');

  // ── Team: adults only, and plainly not real people ───────────────────────
  for (const [name, roleMn, roleEn] of [
    ['А. Жишээбаатар', 'Үүсгэн байгуулагч, захирал', 'Founder and director'],
    ['Б. Жишээмаа', 'Хуулийн зөвлөх', 'Legal adviser'],
  ] as const) {
    const created = await payload.create({
      collection: 'team',
      locale: 'mn',
      overrideAccess: true,
      data: {
        name: `${MARK_MN}: ${name}`,
        role: roleMn,
        confirmedAdult18Plus: true,
      },
    });
    await payload.update({
      collection: 'team',
      id: created.id,
      locale: 'en',
      overrideAccess: true,
      data: { role: roleEn },
    });
  }
  logger.info('team: 2 adults');

  // ── Papers ───────────────────────────────────────────────────────────────
  const papers = [
    {
      slug: `${DEMO_SLUG_PREFIX}child-labour-ub-2026`,
      year: 2026,
      status: 'published' as const,
      venue: 'Journal of Labour Studies',
      doi: '10.1234/demo.2026.01',
      mn: {
        title: `${MARK_MN}: Улаанбаатар дахь хүүхдийн хөдөлмөр: хамрах хүрээ ба нөхцөл`,
        abstract: 'Энэ бол жишээ хураангуй. Жинхэнэ судалгааг админ дотроос оруулна.',
      },
      en: {
        title: `${MARK_EN}: Child labour in Ulaanbaatar: scope and conditions`,
        abstract: 'This is a sample abstract. Real papers are added in the admin panel.',
      },
    },
    {
      slug: `${DEMO_SLUG_PREFIX}collective-bargaining-teens`,
      year: 2025,
      status: 'working-paper' as const,
      venue: null,
      doi: null,
      mn: {
        title: `${MARK_MN}: Өсвөр насныхны хамтын хэлэлцээрийн туршлага`,
        abstract: 'Энэ бол жишээ хураангуй.',
      },
      en: {
        title: `${MARK_EN}: Collective bargaining by teenagers: early experience`,
        abstract: 'This is a sample abstract.',
      },
    },
  ];

  for (const paper of papers) {
    const created = await payload.create({
      collection: 'papers',
      locale: 'mn',
      overrideAccess: true,
      data: {
        title: paper.mn.title,
        slug: paper.slug,
        year: paper.year,
        status: paper.status,
        venue: paper.venue,
        doi: paper.doi,
        abstract: paragraph(paper.mn.abstract),
        authors: [
          { name: `${MARK_MN}: А. Жишээбаатар` },
          { name: `${MARK_MN}: Б. Жишээмаа` },
        ],
        _status: 'published',
      } as never,
    });
    await payload.update({
      collection: 'papers',
      id: created.id,
      locale: 'en',
      overrideAccess: true,
      data: {
        title: paper.en.title,
        abstract: paragraph(paper.en.abstract),
        _status: 'published',
      } as never,
    });
  }
  logger.info('papers: 2, published');

  logger.info('');
  logger.info(`Demo content is in. Every value is prefixed ${MARK_MN}: / ${MARK_EN}:.`);
  logger.info('Remove it with: pnpm seed:demo:clear');
  process.exit(0);
};

await run();
