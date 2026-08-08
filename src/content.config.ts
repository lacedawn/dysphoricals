import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const journalCollection = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/journal' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    pinned: z.boolean().optional(),
  }),
});

export const collections = {
  journal: journalCollection,
};
