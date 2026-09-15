import {createRequire} from 'module';
import {Logger} from '@stefanwerfling/figtree';
import {TunNativeBinding} from 'flyingfish_core';

const require = createRequire(import.meta.url);

/**
 * Loads the optional native TUN binding (`flyingfish_clustertun`) for the L3
 * datapath (Cluster/Mesh epic 9.5.1). The addon is a native module built for the
 * running platform, so it is an OPTIONAL dependency and loaded defensively: if it
 * is absent or not built, this returns null and the node runs the mesh transport
 * without the TUN datapath (no L3 forwarding) rather than crashing.
 */
export class TunBindingLoader {

    /**
     * Load the native TUN binding, or null if it is unavailable.
     */
    public static load(): TunNativeBinding | null {
        try {
            const addon = require('flyingfish_clustertun') as Partial<TunNativeBinding>;

            if (typeof addon.TunDevice?.open !== 'function') {
                Logger.getLogger().error('TUN datapath enabled but flyingfish_clustertun exposes no TunDevice.open');

                return null;
            }

            return addon as TunNativeBinding;
        } catch (error) {
            Logger.getLogger().error(
                'TUN datapath enabled but the native binding (flyingfish_clustertun) could not be loaded',
                error
            );

            return null;
        }
    }

}