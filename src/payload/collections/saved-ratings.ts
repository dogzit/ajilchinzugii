import type { CollectionConfig } from 'payload';
import { isAdmin, nobody } from '../access';

/**
 * A rating a member chose to keep. Only the outcome: which rules came out
 * which colour, the score, the rule set version and the date — never the
 * contract, the CV, the answers or any value read from them.
 */
export const SavedRatings: CollectionConfig = {
  slug: 'saved-ratings',
  labels: { singular: 'Хадгалсан үнэлгээ / Saved rating', plural: 'Хадгалсан үнэлгээ / Saved ratings' },
  admin: { group: 'Үнэлгээ / Raters', defaultColumns: ['kind', 'verdict', 'score', 'ratedOn'] },
  access: { read: isAdmin, create: nobody, update: nobody, delete: isAdmin },
  fields: [
    { name: 'member', type: 'relationship', relationTo: 'members', required: true, index: true },
    { name: 'kind', type: 'select', required: true, options: ['contract', 'cv'] },
    { name: 'ruleSetVersion', type: 'text', required: true },
    { name: 'verdict', type: 'select', required: true, options: ['red', 'yellow', 'green'] },
    { name: 'score', type: 'number', required: true, min: 1, max: 100 },
    {
      name: 'results',
      type: 'json',
      required: true,
      admin: { description: 'Дүрэм бүрийн өнгө л. Rule ids and colours only.' },
    },
    { name: 'ratedOn', type: 'date', required: true },
  ],
};
