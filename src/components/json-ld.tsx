import type { Thing, WithContext } from 'schema-dts';

/**
 * Renders structured data. Server-only: the JSON is in the HTML the crawler
 * receives, with no script to execute.
 *
 * `<` is escaped so a string from the CMS cannot close the script tag.
 */
export function JsonLd({ data }: { data: WithContext<Thing> | WithContext<Thing>[] }) {
  const payload = JSON.stringify(data).replace(/</g, '\\u003c');

  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: payload }} />
  );
}
