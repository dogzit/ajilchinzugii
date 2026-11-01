import {
  Skeleton,
  SkeletonLines,
  SkeletonPageHeader,
  SkeletonScreen,
} from '@/components/ui/skeleton';

/** The paper list: the header, then three cards' worth of rows. */
export default function ResearchLoading() {
  return (
    <SkeletonScreen>
      <SkeletonPageHeader />

      <div className="mt-10 flex flex-col">
        {[0, 1, 2].map((row) => (
          <div
            key={row}
            className="border-border bg-surface mb-5 rounded-3xl border p-6 sm:p-7"
          >
            <Skeleton className="h-3 w-32" />
            <Skeleton className="mt-3 h-5 w-5/6 max-w-[34rem]" />
            <SkeletonLines count={2} className="mt-3 max-w-[65ch]" />
            <div className="mt-4 flex gap-2">
              <Skeleton className="h-7 w-20 rounded-full" />
              <Skeleton className="h-7 w-16 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </SkeletonScreen>
  );
}
