import type { CollectionConfig } from 'payload';
import { isAdmin, nobody } from '../access';

/**
 * Anonymous counters (spec, "Anonymous analytics"; CLAUDE.md rule 12): one
 * row per rule, result, rule set version, month, age band, job category,
 * employer kind and — only if the reader picked one — aimag, holding a count.
 * No timestamps, no ids of ratings: no two rows can be joined back into one
 * person's rating. Any figure published from it goes through small-cell
 * suppression.
 */
export const RaterStats: CollectionConfig = {
  slug: 'rater-stats',
  labels: { singular: 'Нэргүй тоолуур / Anonymous count', plural: 'Нэргүй тоолуур / Anonymous counts' },
  timestamps: false,
  admin: { group: 'Үнэлгээ / Raters', defaultColumns: ['month', 'ruleId', 'result', 'count'] },
  access: { read: isAdmin, create: nobody, update: nobody, delete: nobody },
  fields: [
    { name: 'ruleId', type: 'text', required: true, index: true },
    { name: 'result', type: 'select', required: true, options: ['green', 'yellow', 'red'] },
    { name: 'ruleSetVersion', type: 'text', required: true },
    { name: 'month', type: 'text', required: true, index: true },
    { name: 'ageBand', type: 'text', required: true },
    { name: 'jobCategory', type: 'text', required: true },
    { name: 'employerKind', type: 'text', required: true },
    { name: 'aimag', type: 'text' },
    { name: 'count', type: 'number', required: true, min: 1 },
  ],
};
