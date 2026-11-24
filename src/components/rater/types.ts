import type mnMessages from '@messages/mn.json';

/** The `rater` message namespace, handed down from the server as plain strings. */
export type RaterMessages = (typeof mnMessages)['rater'];

/** A rule's reader-facing text, in the page's language. */
export type RuleText = {
  id: string;
  title: string;
  /** rules.yaml's explanation, shown word for word. */
  explain: string;
  article: string | null;
  /** True on the English page: the explanation is an unofficial translation. */
  unofficial: boolean;
};

export type CategoryOption = { id: string; name: string };
