import * as migration_20261110_161153_initial_d1 from './20261110_161153_initial_d1';
import * as migration_20261124_085310_rater_members from './20261124_085310_rater_members';
import * as migration_20261124_090613_rater_cases from './20261124_090613_rater_cases';

export const migrations = [
  {
    up: migration_20261110_161153_initial_d1.up,
    down: migration_20261110_161153_initial_d1.down,
    name: '20261110_161153_initial_d1',
  },
  {
    up: migration_20261124_085310_rater_members.up,
    down: migration_20261124_085310_rater_members.down,
    name: '20261124_085310_rater_members',
  },
  {
    up: migration_20261124_090613_rater_cases.up,
    down: migration_20261124_090613_rater_cases.down,
    name: '20261124_090613_rater_cases'
  },
];
