import {DBSetupHook} from 'figtree';
import {DBSetup} from '../../../inc/Db/MariaDb/DBSetup.js';

/**
 * FirstInitSetupHook
 *
 * Runs FlyingFish's `DBSetup.firstInit()` after the database is initialized and
 * migrated. This seeds the initial data — most importantly the default admin
 * user — so a fresh install has a login. It replaces the explicit
 * `DBSetup.firstInit()` call the former `main.ts` made right after the DB init.
 *
 * `mode: 'always'` mirrors the old behaviour (it ran on every boot);
 * `firstInit()` is idempotent, so re-running it is a no-op on an existing DB.
 */
export class FirstInitSetupHook implements DBSetupHook {

    /**
     * Hook identifier.
     */
    public readonly id = 'flyingfish-db-first-init';

    /**
     * Run on every boot (firstInit is idempotent).
     */
    public readonly mode = 'always' as const;

    /**
     * Execute the first-init seed.
     */
    public async run(): Promise<void> {
        await DBSetup.firstInit();
    }

}