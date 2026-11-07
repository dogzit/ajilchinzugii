import * as migration_20261024_130934 from './20261024_130934';
import * as migration_20261025_124254_add_site_logo from './20261025_124254_add_site_logo';
import * as migration_20261102_142158 from './20261102_142158';
import * as migration_20261104_154007 from './20261104_154007';
import * as migration_20261104_161754_paper_findings_policy_proposals from './20261104_161754_paper_findings_policy_proposals';
import * as migration_20261104_162639_localize_finding_value from './20261104_162639_localize_finding_value';
import * as migration_20261104_204321_site_hero_image from './20261104_204321_site_hero_image';
import * as migration_20261104_205225_team_profiles from './20261104_205225_team_profiles';
import * as migration_20261106_054542_team_slug from './20261106_054542_team_slug';
import * as migration_20261107_131511_site_logo_restore from './20261107_131511_site_logo_restore';

export const migrations = [
  {
    up: migration_20261024_130934.up,
    down: migration_20261024_130934.down,
    name: '20261024_130934',
  },
  {
    up: migration_20261025_124254_add_site_logo.up,
    down: migration_20261025_124254_add_site_logo.down,
    name: '20261025_124254_add_site_logo',
  },
  {
    up: migration_20261102_142158.up,
    down: migration_20261102_142158.down,
    name: '20261102_142158',
  },
  {
    up: migration_20261104_154007.up,
    down: migration_20261104_154007.down,
    name: '20261104_154007',
  },
  {
    up: migration_20261104_161754_paper_findings_policy_proposals.up,
    down: migration_20261104_161754_paper_findings_policy_proposals.down,
    name: '20261104_161754_paper_findings_policy_proposals',
  },
  {
    up: migration_20261104_162639_localize_finding_value.up,
    down: migration_20261104_162639_localize_finding_value.down,
    name: '20261104_162639_localize_finding_value',
  },
  {
    up: migration_20261104_204321_site_hero_image.up,
    down: migration_20261104_204321_site_hero_image.down,
    name: '20261104_204321_site_hero_image',
  },
  {
    up: migration_20261104_205225_team_profiles.up,
    down: migration_20261104_205225_team_profiles.down,
    name: '20261104_205225_team_profiles',
  },
  {
    up: migration_20261106_054542_team_slug.up,
    down: migration_20261106_054542_team_slug.down,
    name: '20261106_054542_team_slug',
  },
  {
    up: migration_20261107_131511_site_logo_restore.up,
    down: migration_20261107_131511_site_logo_restore.down,
    name: '20261107_131511_site_logo_restore'
  },
];
