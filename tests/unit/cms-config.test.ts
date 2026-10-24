import { describe, expect, it } from 'vitest';
import type { CollectionConfig, Field, GlobalConfig } from 'payload';
import { Media } from '../../src/payload/collections/media';
import { Papers } from '../../src/payload/collections/papers';
import { Partners } from '../../src/payload/collections/partners';
import { Team } from '../../src/payload/collections/team';
import { Users } from '../../src/payload/collections/users';
import { ImpactSnapshot } from '../../src/payload/globals/impact-snapshot';
import { Methodology } from '../../src/payload/globals/methodology';
import { Policy } from '../../src/payload/globals/policy';
import { Site } from '../../src/payload/globals/site';

const named = (fields: Field[], name: string) =>
  fields.find((field) => 'name' in field && field.name === name);

const publicCollections: CollectionConfig[] = [Papers, Team, Partners, Media];
const globals: GlobalConfig[] = [Site, Methodology, Policy, ImpactSnapshot];

describe('SEO group', () => {
  it.each([...publicCollections, ...globals].map((c) => [c.slug, c] as const))(
    '%s has a localized SEO group with enforced lengths and a counter',
    (_slug, config) => {
      const seo = named(config.fields as Field[], 'seo');
      expect(seo).toBeDefined();
      expect(seo?.type).toBe('group');

      const fields = (seo as { fields: Field[] }).fields;
      const title = named(fields, 'metaTitle') as {
        maxLength?: number;
        localized?: boolean;
        admin?: unknown;
      };
      const description = named(fields, 'metaDescription') as {
        maxLength?: number;
        localized?: boolean;
      };

      expect(title.localized).toBe(true);
      expect(title.maxLength).toBe(60);
      expect(description.localized).toBe(true);
      expect(description.maxLength).toBe(160);
      expect(JSON.stringify(fields)).toContain('MetaCharCount');
    },
  );

  it('leaves Users out: an account is not a public page', () => {
    expect(named(Users.fields as Field[], 'seo')).toBeUndefined();
  });
});

describe('Media', () => {
  it('generates AVIF and WebP at 480/960/1600', () => {
    const sizes = (
      Media.upload as {
        imageSizes: {
          name: string;
          width: number;
          formatOptions?: { format?: string };
        }[];
      }
    ).imageSizes;
    const produced = sizes
      .map((size) => `${size.formatOptions?.format}${size.width}`)
      .sort();
    expect(produced).toEqual(
      ['avif480', 'avif960', 'avif1600', 'webp480', 'webp960', 'webp1600'].sort(),
    );
  });

  it('never carries image metadata over', () => {
    const upload = Media.upload as { withMetadata?: boolean; formatOptions?: unknown };
    expect(upload.withMetadata).toBe(false);
    // The original is re-encoded through sharp, which is what drops EXIF/GPS.
    expect(upload.formatOptions).toEqual({ format: 'webp', options: { quality: 82 } });
  });

  it('requires alt text in both languages explicitly', () => {
    const alt = named(Media.fields as Field[], 'alt') as { fields: Field[] };
    for (const code of ['mn', 'en']) {
      expect((named(alt.fields, code) as { required?: boolean }).required).toBe(true);
    }
  });

  it('rejects a teen photo without consent through the subject validator', async () => {
    const subject = named(Media.fields as Field[], 'subject') as {
      validate: (value: unknown, args: { siblingData: unknown }) => unknown;
    };
    const blocked = await subject.validate('teen-member', { siblingData: {} });
    expect(typeof blocked).toBe('string');
    const allowed = await subject.validate('teen-member', {
      siblingData: {
        consentTeen: true,
        consentParent: true,
        consentDate: '2026-01-01',
        consentRecordRef: 'A-1',
      },
    });
    expect(allowed).toBe(true);
  });

  it('accepts no file type that can carry script', () => {
    const mimeTypes = (Media.upload as { mimeTypes: string[] }).mimeTypes;
    expect(mimeTypes).not.toContain('image/svg+xml');
  });
});

describe('drafts and versions', () => {
  it.each([
    ['papers', Papers],
    ['methodology', Methodology],
    ['policy', Policy],
  ] as const)('%s keeps drafts and version history', (_slug, config) => {
    expect(config.versions).toMatchObject({ drafts: true });
  });

  it('gives the papers status field its own Postgres enum', () => {
    // Payload names the draft-state enum `enum_papers_status`; a field called
    // `status` would otherwise claim the same name.
    const status = named(Papers.fields as Field[], 'status') as { enumName?: string };
    expect(status.enumName).toBe('enum_papers_publication_status');
  });
});

describe('access', () => {
  it('shows anonymous readers only published papers', () => {
    const read = Papers.access?.read;
    expect(read?.({ req: { user: null } } as never)).toEqual({
      _status: { equals: 'published' },
    });
  });

  it('lists only confirmed adults publicly', () => {
    const read = Team.access?.read;
    expect(read?.({ req: { user: null } } as never)).toEqual({
      confirmedAdult18Plus: { equals: true },
    });
  });

  it('refuses a team member who has not been confirmed as an adult', async () => {
    const field = named(Team.fields as Field[], 'confirmedAdult18Plus') as {
      required?: boolean;
      validate: (value: unknown) => unknown;
    };
    expect(field.required).toBe(true);
    expect(typeof (await field.validate(false))).toBe('string');
    expect(await field.validate(true)).toBe(true);
  });

  it('lets nobody write the impact snapshot through the API or admin', () => {
    expect(
      ImpactSnapshot.access?.update?.({ req: { user: { role: 'admin' } } } as never),
    ).toBe(false);
  });

  it('keeps user creation closed to anyone but an admin', () => {
    expect(Users.access?.create?.({ req: { user: null } } as never)).toBe(false);
    expect(Users.access?.create?.({ req: { user: { role: 'editor' } } } as never)).toBe(
      false,
    );
    expect(Users.access?.create?.({ req: { user: { role: 'admin' } } } as never)).toBe(
      true,
    );
  });
});
