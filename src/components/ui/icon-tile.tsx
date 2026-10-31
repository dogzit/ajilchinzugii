import { Icon, type IconName } from '@/components/ui/icon';

/** A rounded honey tile holding one icon. Decorative: the label says what it is. */
export function IconTile({
  name,
  tone = 'accent',
}: {
  name: IconName;
  tone?: 'accent' | 'tint';
}) {
  const colours =
    tone === 'accent'
      ? 'bg-accent text-accent-ink border-accent-mark'
      : 'bg-surface-tint text-ink border-border';

  return (
    <span
      className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl border ${colours}`}
    >
      <Icon name={name} />
    </span>
  );
}
