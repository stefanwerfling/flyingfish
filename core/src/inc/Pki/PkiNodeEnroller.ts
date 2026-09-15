import {PkiCaPurpose} from './PkiCaTree.js';
import {PkiClock} from './PkiBootstrapTokenStore.js';
import {PkiNodeClient, PkiNodeIdentity} from './PkiNodeClient.js';
import {PkiNodeFileStore} from './PkiNodeFileStore.js';
import {PkiSanEntry} from '../Crypto/PkiCertificateBuilder.js';

/**
 * What a part needs to obtain and keep its identity. The bootstrap token can be
 * a static string or fetched lazily at enroll time via a provider (e.g. the
 * unix-socket bootstrap client) — exactly one of the two must be given.
 */
export type PkiNodeEnrollerOptions = {
    bootstrapToken?: string;
    bootstrapTokenProvider?: (purpose: PkiCaPurpose) => Promise<string>;
    purpose: PkiCaPurpose;
    commonName: string;
    sans?: PkiSanEntry[];
    validityDays?: number;
};

/**
 * The auto-renew driver a part runs at boot (own-PKI epic 9.4, 9.4.3-D): reload
 * the persisted identity, enroll on first boot, or renew when ~2/3 of the
 * lifetime has elapsed — persisting the result each time. This is the piece that
 * lets a part keep a valid certificate without manual steps; the part wires it
 * up opt-in (only when PKI config is present), like the Hub self-registration.
 */
export class PkiNodeEnroller {

    private readonly _client: PkiNodeClient;

    private readonly _store: PkiNodeFileStore;

    private readonly _options: PkiNodeEnrollerOptions;

    private readonly _clock: PkiClock;

    /**
     * @param client - the node client (crypto + transport)
     * @param store - the on-disk identity store
     * @param options - the enrollment options (bootstrap token, purpose, CN)
     * @param clock - epoch-ms clock, defaults to Date.now (injectable for tests)
     */
    public constructor(
        client: PkiNodeClient,
        store: PkiNodeFileStore,
        options: PkiNodeEnrollerOptions,
        clock: PkiClock = (): number => Date.now()
    ) {
        this._client = client;
        this._store = store;
        this._options = options;
        this._clock = clock;
    }

    /**
     * Ensure a valid identity exists and is current: load it, enroll on first
     * boot, or renew if it is due; persist and return the identity.
     */
    public async ensure(): Promise<PkiNodeIdentity> {
        const existing = await this._store.load();

        if (existing === null) {
            const bootstrapToken = this._options.bootstrapTokenProvider
                ? await this._options.bootstrapTokenProvider(this._options.purpose)
                : this._options.bootstrapToken;

            if (bootstrapToken === undefined) {
                throw new Error('PkiNodeEnroller: no bootstrap token or provider configured');
            }

            const enrolled = await this._client.enroll({
                bootstrapToken: bootstrapToken,
                purpose: this._options.purpose,
                commonName: this._options.commonName,
                sans: this._options.sans,
                validityDays: this._options.validityDays
            });

            await this._store.save(enrolled);

            return enrolled;
        }

        if (PkiNodeClient.needsRenew(existing, this._clock())) {
            const renewed = await this._client.renew(existing);

            await this._store.save(renewed);

            return renewed;
        }

        return existing;
    }

}