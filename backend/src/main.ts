import {FlyingFishBackend} from './Application/FlyingFishBackend.js';

/**
 * FlyingFish backend entrypoint.
 *
 * The boot sequence now lives in `FlyingFishBackend` (figtree `BackendApp`):
 * config loading, logging, service lifecycle and graceful shutdown are all
 * owned by the framework. The former hand-wired bootstrap is preserved in
 * git history.
 */
(async(): Promise<void> => {
    const backend = new FlyingFishBackend();
    await backend.start();
})();