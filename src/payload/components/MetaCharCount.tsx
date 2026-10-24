'use client';

import { useField } from '@payloadcms/ui';

type Props = {
  path: string;
  field?: { maxLength?: number | null };
};

/**
 * Live character counter under the SEO meta fields. Search engines truncate
 * long titles and descriptions, so the editor needs to see the count while
 * typing rather than discovering it after saving.
 */
export const MetaCharCount = ({ path, field }: Props) => {
  const { value } = useField<string>({ path });
  const length = (value ?? '').length;
  const max = field?.maxLength ?? 0;
  const over = max > 0 && length > max;

  // One text node, not several: the description element is a flex container,
  // so a leading space inside a second span would be trimmed away.
  const label =
    (max > 0 ? `${length}/${max}` : `${length}`) +
    ' тэмдэгт / characters' +
    (over ? ' — хэт урт / too long' : '');

  return (
    <div
      className="field-description"
      style={{
        color: over ? 'var(--theme-error-500)' : undefined,
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      {label}
    </div>
  );
};

export default MetaCharCount;
