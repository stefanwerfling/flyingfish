import * as fs from 'fs';
import path from 'path';
import {PkiCaPurpose} from './PkiCaTree.js';
import {PkiNodeIdentity} from './PkiNodeClient.js';

/**
 * On-disk store for a node's PKI identity (own-PKI epic 9.4, 9.4.3-D). Persists
 * the identity under `<baseDir>/pki/` so a part reloads its certificate across
 * restarts instead of re-enrolling every boot. `node.json` is the source of
 * truth for reload; `node.key` / `node.crt` / `chain.pem` are written alongside
 * as the usable files a part hands to its TLS stack. The private key file is
 * created 0600.
 */
export class PkiNodeFileStore {

    private readonly _dir: string;

    /**
     * @param baseDir - the base directory (e.g. flyingfish_libpath); the store
     *                   lives under `<baseDir>/pki`
     */
    public constructor(baseDir: string) {
        this._dir = path.join(baseDir, 'pki');
    }

    /**
     * The directory the identity is stored in.
     */
    public getDir(): string {
        return this._dir;
    }

    /**
     * Persist an identity (creates the directory if needed).
     * @param identity - the identity to store
     */
    public async save(identity: PkiNodeIdentity): Promise<void> {
        await fs.promises.mkdir(this._dir, {recursive: true});

        await fs.promises.writeFile(path.join(this._dir, 'node.json'), JSON.stringify(identity));
        await fs.promises.writeFile(path.join(this._dir, 'node.key'), identity.privateKey, {mode: 0o600});
        await fs.promises.writeFile(path.join(this._dir, 'node.crt'), identity.certificate);
        await fs.promises.writeFile(path.join(this._dir, 'chain.pem'), identity.chain.join('\n'));
    }

    /**
     * Load the stored identity, or null if none is persisted (or it is
     * unreadable/corrupt).
     */
    public async load(): Promise<PkiNodeIdentity | null> {
        try {
            const raw = await fs.promises.readFile(path.join(this._dir, 'node.json'), 'utf-8');
            const parsed = JSON.parse(raw) as PkiNodeIdentity;

            // Narrow the persisted purpose back to the enum.
            parsed.purpose = parsed.purpose as PkiCaPurpose;

            return parsed;
        } catch {
            return null;
        }
    }

}