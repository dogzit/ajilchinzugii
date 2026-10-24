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

  return (
    <div
      className="field-description"
      style={{ color: over ? 'var(--theme-error-500)' : undefined }}
    >
      <span style={{ fontVariantNumeric: 'tabular-nums' }}>
        {max > 0 ? `${length}/${max}` : length}
      </span>{' '}
      тэмдэгт / characters
      {over ? ' — хэт урт / too long' : ''}
    </div>
  );
};

export default MetaCharCount;
