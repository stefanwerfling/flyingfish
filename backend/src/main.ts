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
})().catch((error: unknown): void => {
    // The logging framework may not be seated yet if boot fails this early,
    // so report to stderr and exit non-zero (lets the container restart).
    console.error('FlyingFish backend failed to start:', error);
    process.exit(1);
});