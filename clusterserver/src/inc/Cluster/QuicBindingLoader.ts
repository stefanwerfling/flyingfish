import {createRequire} from 'module';
import {Logger} from '@stefanwerfling/figtree';
import {QuicNativeBinding} from 'flyingfish_core';

const require = createRequire(import.meta.url);

/**
 * Loads the optional native QUIC binding (`flyingfish_clusterquic`) for the QUIC
 * peer transport (Cluster/Mesh epic 9.5.1). The addon is a native module that has
 * to be built for the running platform, so it is an OPTIONAL dependency and loaded
 * defensively: if it is absent or not built (e.g. an image without the prebuild),
 * this returns null and the caller falls back to a non-native transport instead of
 * crashing the control node.
 */
export class QuicBindingLoader {

    /**
     * Load the native QUIC binding, or null if it is unavailable.
     */
    public static load(): QuicNativeBinding | null {
        try {
            const addon = require('flyingfish_clusterquic') as Partial<QuicNativeBinding>;

            if (typeof addon.QuicTransport !== 'function') {
                Logger.getLogger().error(
                    'QUIC transport selected but flyingfish_clusterquic exposes no QuicTransport'
                );

                return null;
            }

            return addon as QuicNativeBinding;
        } catch (error) {
            Logger.getLogger().error(
                'QUIC transport selected but the native binding (flyingfish_clusterquic) could not be loaded',
                error
            );

            return null;
        }
    }

}