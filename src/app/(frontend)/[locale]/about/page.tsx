import type { Metadata } from 'next';
import Image from 'next/image';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { CopyButton } from '@/components/copy-button';
import { Link } from '@/components/link';
import { PageHeader } from '@/components/page-header';
import { Icon } from '@/components/ui/icon';
import type { Locale } from '@/i18n/routing';
import { getPartners, getSite, getTeam } from '@/lib/cms';
import { formatDate, isRichTextEmpty } from '@/lib/format';
import { localeHref } from '@/lib/locale-href';
import { mediaSrc } from '@/lib/media';
import { JsonLd } from '@/components/json-ld';
import { breadcrumbJsonLd, personJsonLd } from '@/lib/seo/jsonld';
import { buildPageMetadata } from '@/lib/seo/metadata';
import { contactEmail as contactEmailFromEnv } from '@/lib/site';

type Props = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const [t, doc] = await Promise.all([getTranslations({ locale }), getSite(locale)]);

  return buildPageMetadata({
    locale,
    path: '/about',
    title: t('pages.about.title'),
    description: t('pages.about.description'),
    seo: doc.seo,
  });
}

export default async function AboutPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [t, site, team, partners] = await Promise.all([
    getTranslations(),
    getSite(locale),
    getTeam(locale),
    getPartners(locale),
  ]);

  const email = site.contactEmail || contactEmailFromEnv;
  const founded = formatDate(site.organization?.foundingDate, locale);

  return (
    <div className="shell max-w-[62rem] py-14 md:py-20">
      {/* Only confirmed adults reach this page, so only adults are described. */}
      {team.length > 0 ? (
        <JsonLd data={team.map((member) => personJsonLd(member, locale))} />
      ) : null}
      <JsonLd
        data={breadcrumbJsonLd(
          [
            { name: t('nav.home'), path: '/' },
            { name: t('pages.about.title'), path: '/about' },
          ],
          locale,
        )}
      />

      <PageHeader title={t('pages.about.title')} lead={site.missionLine} />

      <section aria-labelledby="organisation" className="mt-10">
        <h2 id="organisation" className="sr-only">
          {t('pages.about.title')}
        </h2>
        <dl className="grid max-w-[65ch] gap-x-8 gap-y-3 sm:grid-cols-[10rem_minmax(0,1fr)]">
          {site.organization?.legalName ? (
            <>
              <dt className="text-ink-muted text-sm">{t('about.legalName')}</dt>
              <dd className="text-ink">{site.organization.legalName}</dd>
            </>
          ) : null}
          {founded ? (
            <>
              <dt className="text-ink-muted text-sm">{t('about.founded')}</dt>
              <dd className="num text-ink">{founded}</dd>
            </>
          ) : null}
          {site.organization?.addressCity ? (
            <>
              <dt className="text-ink-muted text-sm">{t('about.city')}</dt>
              <dd className="text-ink">{site.organization.addressCity}</dd>
            </>
          ) : null}
        </dl>
      </section>

      <section aria-labelledby="team" className="mt-14">
        <h2 id="team" className="text-xl">
          {t('about.teamHeading')}
        </h2>
        <p className="text-ink-muted mt-2 max-w-[65ch] text-sm">
          {t('about.minorsNote')}
        </p>

        {team.length === 0 ? (
          <p className="text-ink-muted mt-6 max-w-[65ch]">{t('common.nothingYet')}</p>
        ) : (
          <ul className="mt-6 grid gap-x-8 gap-y-10 sm:grid-cols-2">
            {team.map((member) => {
              const photo = typeof member.photo === 'object' ? member.photo : null;
              const photoSrc = mediaSrc(photo?.url);
              const profiles = (member.profiles ?? []).filter(
                (profile) => profile.label && profile.url,
              );
              return (
                <li
                  key={member.id}
                  className="border-border bg-surface flex items-center gap-4 rounded-3xl border p-5"
                >
                  {photoSrc ? (
                    <Image
                      src={photoSrc}
                      alt={photo?.alt?.[locale] ?? ''}
                      width={96}
                      height={96}
                      sizes="96px"
                      className="border-border h-24 w-24 shrink-0 rounded-full border object-cover"
                    />
                  ) : null}
                  <div className="flex min-w-0 flex-col gap-1">
                    {/* The name is the link to the person's own page. The
                        whole card is not: the card already holds profile
                        links of its own, and a link inside a link is not a
                        thing a browser can represent. */}
                    <p className="font-semibold">
                      <Link
                        href={localeHref(locale, `/team/${member.slug}`)}
                        className="text-ink decoration-accent-mark underline-offset-4 hover:underline"
                      >
                        {member.name}
                      </Link>
                    </p>
                    <p className="text-ink-muted text-sm">{member.role}</p>

                    {/* The biography is deliberately not here. These run to
                        several hundred words each, and three of them turned
                        this section into a wall nobody reads. The name goes
                        to the person's own page, which is what that page is
                        for; this stays a list of who is here. */}
                    {!isRichTextEmpty(member.bio) ? (
                      <p className="mt-1">
                        <Link
                          href={localeHref(locale, `/team/${member.slug}`)}
                          className="text-accent-text hover:text-ink inline-flex items-center gap-1.5 text-sm font-medium"
                        >
                          {t('about.readMember')}
                          <Icon name="arrow-right" className="h-4 w-4" />
                        </Link>
                      </p>
                    ) : null}

                    {/* Where a reader can go and check this person's work for
                        themselves. The same instinct as the citations on the
                        research page: a claim about expertise should be
                        followed, not taken. A row with no label in this
                        language would be a link with nothing to click on, so
                        it is left out rather than shown empty. */}
                    {profiles.length > 0 ? (
                      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                        {profiles.map((profile) => (
                          <li key={profile.id ?? profile.url}>
                            <a
                              href={profile.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-accent-text decoration-accent-mark hover:text-ink text-sm underline underline-offset-4"
                            >
                              {profile.label}
                              <span className="sr-only"> {t('common.openInNewTab')}</span>
                            </a>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="partners" className="mt-14">
        <h2 id="partners" className="text-xl">
          {t('about.partnersHeading')}
        </h2>

        {partners.length === 0 ? (
          <p className="text-ink-muted mt-6 max-w-[65ch]">{t('common.nothingYet')}</p>
        ) : (
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {partners.map((partner) => {
              const logo = typeof partner.logo === 'object' ? partner.logo : null;
              const logoSrc = mediaSrc(logo?.url);

              return (
                <li
                  key={partner.id}
                  className="border-border bg-surface flex items-center gap-4 rounded-3xl border p-5"
                >
                  {/* Every mark gets the same box, whatever shape its file
                      is. The logos are drawn on canvases of their own — some
                      square, some wide, each with its own padding — so left
                      to size themselves they landed at a different place and
                      a different size in every card. A fixed box with
                      `object-contain` puts them all on one line.

                      The box is kept even when there is no logo yet, so the
                      names still line up across the row, but it carries no
                      background: an empty grey tile would read as a broken
                      image rather than as a logo nobody has sent us. */}
                  <span className="flex h-12 w-16 shrink-0 items-center justify-start">
                    {logoSrc ? (
                      <Image
                        src={logoSrc}
                        alt={logo?.alt?.[locale] ?? partner.name}
                        width={128}
                        height={96}
                        sizes="64px"
                        className="max-h-12 w-auto max-w-16 rounded-md object-contain object-left"
                      />
                    ) : null}
                  </span>

                  {partner.url ? (
                    <a
                      href={partner.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-ink decoration-accent-mark text-sm underline-offset-4 hover:underline"
                    >
                      {partner.name}
                      <span className="sr-only"> {t('common.openInNewTab')}</span>
                    </a>
                  ) : (
                    <span className="text-ink text-sm">{partner.name}</span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="contact" className="border-border mt-14 border-t pt-10">
        <h2 id="contact" className="text-xl">
          {t('about.contactHeading')}
        </h2>
        <p className="text-ink-muted mt-2 max-w-[65ch] text-sm">
          {t('about.noFormNote')}
        </p>

        {email ? (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {/* Selectable text, never a form (CLAUDE.md rule 5). */}
            <span className="num border-border bg-surface-tint text-ink rounded-2xl border px-3 py-1.5 select-all">
              {email}
            </span>
            <CopyButton
              value={email}
              label={t('common.copy')}
              copiedLabel={t('common.copied')}
              failedLabel={t('common.copyFailed')}
            />
          </div>
        ) : (
          <p className="num text-ink-muted mt-4">{t('placeholder.tbd')}</p>
        )}
      </section>
    </div>
  );
}
