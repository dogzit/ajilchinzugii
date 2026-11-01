import { Skeleton, SkeletonPageHeader, SkeletonScreen } from '@/components/ui/skeleton';

/**
 * The impact page waits on the sheet, which is the longest wait on the site,
 * so its outline is the most literal: the grid of figure cards and the first
 * chart, in the places they will occupy.
 */
export default function ImpactLoading() {
  return (
    <SkeletonScreen>
      <SkeletonPageHeader />

      <Skeleton className="mt-6 h-3 w-56" />

      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((card) => (
          <div
            key={card}
            className="border-border bg-surface flex flex-col rounded-3xl border p-6"
          >
            <Skeleton className="h-4 w-4/5" />
            {/* Where the figure itself lands: 4xl, leading-none. */}
            <Skeleton className="mt-4 h-10 w-28 sm:h-12" />
            <div className="border-border mt-5 flex flex-col gap-2 border-t pt-4">
              {/* The date it is as of, and the number of cases behind it. */}
              <Skeleton className="h-3 w-40" />
              <Skeleton className="h-3 w-32" />
            </div>
            <Skeleton className="mt-4 h-4 w-36" />
          </div>
        ))}
      </div>

      <div className="border-border mt-16 border-t pt-10">
        <Skeleton className="h-7 w-64" />
        <Skeleton className="mt-6 aspect-[16/7] w-full max-w-[560px] rounded-2xl" />
      </div>
    </SkeletonScreen>
  );
}
