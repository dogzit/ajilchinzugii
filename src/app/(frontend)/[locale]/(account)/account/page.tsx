import { currentUser } from '@clerk/nextjs/server';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { AccountPanel } from '@/components/accounts/account-panel';
import type { AccountMessages } from '@/components/accounts/sign-up-gate';
import { ScoreGauge } from '@/components/ui/score-gauge';
import { VerdictBadge } from '@/components/ui/verdict-badge';
import type { Locale } from '@/i18n/routing';
import { AIMAGS } from '@/lib/aimags';
import { currentUserId } from '@/lib/accounts/clerk';
import { ensureMember, payload } from '@/lib/accounts/members';
import { formatDate } from '@/lib/format';
import type { RaterMessages } from '@/components/rater/types';
import { raterCategories } from '@/lib/rater/texts';

export const dynamic = 'force-dynamic';

export default async function AccountPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const userId = await currentUserId();
  if (!userId) redirect(`/${locale}/sign-in`);

  const user = await currentUser();
  const member = await ensureMember(userId, user?.unsafeMetadata);
  const messages = (await getMessages({ locale })) as { account: AccountMessages; rater: RaterMessages; common: { aimags: Record<string, string> } };
  const t = messages.account;

  const history = member
    ? (await (await payload()).find({ collection: 'saved-ratings', where: { member: { equals: member.id } }, sort: '-createdAt', limit: 50, depth: 0 })).docs
    : [];

  return (
    <div className="shell py-12 md:py-16">
      <div className="mx-auto grid max-w-[46rem] gap-10">
        <h1 className="text-ink">{t.title}</h1>

        <section aria-labelledby="history">
          <h2 id="history" className="text-ink">
            {t.history}
          </h2>
          {history.length ? (
            <ul className="mt-5 grid gap-4">
              {history.map((rating) => (
                <li key={rating.id} className="border-border bg-surface flex items-center gap-5 rounded-3xl border p-5">
                  <div className="w-24 shrink-0">
                    <ScoreGauge score={rating.score} verdict={rating.verdict} verdictLabel={messages.rater.results.verdict[rating.verdict]} outOf="" />
                  </div>
                  <div>
                    <p className="text-ink font-semibold">{t.kind[rating.kind]}</p>
                    <p className="num text-ink-muted text-sm">{formatDate(rating.ratedOn, locale)}</p>
                    <VerdictBadge verdict={rating.verdict} label={messages.rater.results.verdict[rating.verdict]} className="mt-2" />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-ink-muted mt-4">{t.historyEmpty}</p>
          )}
        </section>

        <AccountPanel
          t={t}
          locale={locale}
          member={member ? { ageBand: member.ageBand, targetJob: member.targetJob ?? null, aimag: member.aimag ?? null } : null}
          categories={raterCategories(locale)}
          aimags={AIMAGS.map((id) => ({ id, name: messages.common.aimags[id] ?? id }))}
        />
      </div>
    </div>
  );
}
