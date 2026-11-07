import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { JsonLd } from '@/components/json-ld';
import { Link } from '@/components/link';
import { RichText } from '@/components/rich-text';
import { routing, type Locale } from '@/i18n/routing';
import { getTeamMember, getTeamSlugs } from '@/lib/cms';
import { isRichTextEmpty, lexicalText } from '@/lib/format';
import { localeHref } from '@/lib/locale-href';
import { mediaSrc } from '@/lib/media';
import { breadcrumbJsonLd, personJsonLd } from '@/lib/seo/jsonld';
import { buildPageMetadata } from '@/lib/seo/metadata';

/**
 * One person's page.
 *
 * Only confirmed adults are ever listed (rule 4), and `getTeamMember` applies
 * that filter itself rather than relying on the link that led here — a page
 * reachable by typing a slug has to enforce the rule on its own.
 *
 * The page is deliberately thin when the CMS is thin: with no biography and
 * no photograph it is a name, a role and whatever profiles are on file. That
 * is honest, and it fills in on its own as the client writes the content.
 */

type Props = { params: Promise<{ locale: Locale; slug: string }> };

export async function generateStaticParams() {
  const slugs = await getTeamSlugs();
  return routing.locales.flatMap((locale) => slugs.map((slug) => ({ locale, slug })));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const member = await getTeamMember(slug, locale);
  if (!member) return {};

  const bio = lexicalText(member.bio?.root as never).trim();

  return buildPageMetadata({
    locale,
    path: `/team/${slug}`,
    title: `${member.name} — ${member.role}`,
    description: bio || undefined,
    seo: member.seo,
  });
}

export default async function TeamMemberPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const [t, member] = await Promise.all([
    getTranslations(),
    getTeamMember(slug, locale),
  ]);
  if (!member) notFound();

  const photo = typeof member.photo === 'object' ? member.photo : null;
  const photoSrc = mediaSrc(photo?.url);
  const profiles = (member.profiles ?? []).filter(
    (profile) => profile.label && profile.url,
  );

  return (
    <div className="shell max-w-[62rem] py-14 md:py-20">
      <JsonLd
        data={[
          personJsonLd(member, locale),
          breadcrumbJsonLd(
            [
              { name: t('nav.home'), path: '/' },
              { name: t('pages.about.title'), path: '/about' },
              { name: member.name, path: `/team/${slug}` },
            ],
            locale,
          ),
        ]}
      />

      <p className="mb-8">
        <Link
          href={localeHref(locale, '/about#team')}
          className="text-accent-text decoration-accent-mark hover:text-ink text-sm underline underline-offset-4"
        >
          ← {t('team.backToAbout')}
        </Link>
      </p>

      <article>
        <header className="border-border flex flex-col gap-5 border-b pb-8 sm:flex-row sm:items-center sm:gap-6">
          {photoSrc ? (
            <Image
              src={photoSrc}
              alt={photo?.alt?.[locale] ?? ''}
              width={128}
              height={128}
              sizes="128px"
              className="border-border h-32 w-32 shrink-0 rounded-full border object-cover"
            />
          ) : null}
          <div>
            <h1 className="text-3xl sm:text-4xl">{member.name}</h1>
            <p className="text-ink-muted mt-2">{member.role}</p>
          </div>
        </header>

        {!isRichTextEmpty(member.bio) ? (
          <section aria-labelledby="bio" className="mt-10">
            <h2 id="bio" className="sr-only">
              {t('team.bioHeading')}
            </h2>
            <RichText data={member.bio} />
          </section>
        ) : null}

        {profiles.length > 0 ? (
          <section aria-labelledby="profiles" className="mt-10">
            <h2 id="profiles" className="text-xl">
              {t('team.profilesHeading')}
            </h2>
            <ul className="mt-4 flex flex-wrap gap-3">
              {profiles.map((profile) => (
                <li key={profile.id ?? profile.url}>
                  <a
                    href={profile.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="border-border-strong text-ink-soft hover:bg-surface-tint hover:text-ink inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-medium"
                  >
                    {profile.label}
                    <span aria-hidden="true" className="text-accent-mark">
                      ↗
                    </span>
                    <span className="sr-only">{t('common.openInNewTab')}</span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </article>
    </div>
  );
}
