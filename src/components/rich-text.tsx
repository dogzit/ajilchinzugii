import {
  RichText as LexicalRichText,
  type JSXConvertersFunction,
} from '@payloadcms/richtext-lexical/react';
import { headingId, lexicalText, type RichTextValue } from '@/lib/format';

/**
 * Renders a Lexical field on the server — no editor, no client bundle.
 *
 * Headings carry an id derived from their text so a table of contents can link
 * to them, and so a reader can link to a section of the policy.
 */
const converters: JSXConvertersFunction = ({ defaultConverters }) => ({
  ...defaultConverters,
  heading: ({ node, nodesToJSX }) => {
    const Tag = (/^h[1-6]$/.test(node.tag) ? node.tag : 'h2') as 'h2';
    return (
      <Tag id={headingId(lexicalText(node).trim())}>
        {nodesToJSX({ nodes: node.children })}
      </Tag>
    );
  },
});

export function RichText({
  data,
  className,
}: {
  data: RichTextValue;
  className?: string;
}) {
  if (!data) return null;

  return (
    <div
      className={[
        'text-ink-soft max-w-[65ch] space-y-4',
        '[&_h2]:text-ink [&_h2]:mt-10 [&_h2]:mb-3 [&_h2]:scroll-mt-24',
        '[&_h3]:text-ink [&_h3]:mt-8 [&_h3]:mb-2 [&_h3]:scroll-mt-24',
        '[&_h4]:text-ink [&_h4]:mt-6 [&_h4]:mb-2 [&_h4]:font-semibold',
        '[&_a]:text-accent [&_a]:underline [&_a]:underline-offset-4',
        '[&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:ps-5',
        '[&_ol]:list-decimal [&_ol]:space-y-1 [&_ol]:ps-5',
        '[&_blockquote]:border-accent-mark [&_blockquote]:text-ink-muted [&_blockquote]:border-s-2 [&_blockquote]:ps-4',
        className ?? '',
      ].join(' ')}
    >
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <LexicalRichText converters={converters} data={data as any} disableContainer />
    </div>
  );
}
