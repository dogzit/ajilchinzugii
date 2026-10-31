import * as migration_20261024_130934 from './20261024_130934';
import * as migration_20261025_124254_add_site_logo from './20261025_124254_add_site_logo';

export const migrations = [
  {
    up: migration_20261024_130934.up,
    down: migration_20261024_130934.down,
    name: '20261024_130934',
  },
  {
    up: migration_20261025_124254_add_site_logo.up,
    down: migration_20261025_124254_add_site_logo.down,
    name: '20261025_124254_add_site_logo'
  },
];
