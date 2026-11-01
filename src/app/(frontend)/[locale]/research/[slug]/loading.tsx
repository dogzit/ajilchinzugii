import { Skeleton, SkeletonLines, SkeletonScreen } from '@/components/ui/skeleton';

/** One paper: the way back, the title block, the abstract, the downloads. */
export default function PaperLoading() {
  return (
    <SkeletonScreen>
      <Skeleton className="mb-8 h-4 w-36" />

      <div className="border-border border-b pb-8">
        <Skeleton className="h-3 w-40" />
        <Skeleton className="mt-3 h-8 w-full max-w-[40rem] sm:h-10" />
        <Skeleton className="mt-4 h-4 w-2/3 max-w-[28rem]" />
      </div>

      <div className="mt-10">
        <Skeleton className="h-6 w-40" />
        <SkeletonLines count={5} className="mt-5 max-w-[65ch]" />
      </div>

      <div className="mt-10 flex flex-wrap gap-3">
        <Skeleton className="h-11 w-36 rounded-full" />
        <Skeleton className="h-11 w-32 rounded-full" />
      </div>
    </SkeletonScreen>
  );
}
