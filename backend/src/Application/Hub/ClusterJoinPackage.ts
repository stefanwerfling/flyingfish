import {Logger} from '@stefanwerfling/figtree';
import {ClusterJoinPackageResponse, StatusCodes} from 'flyingfish_schemas';
import {aggregateClusterNodes} from 'flyingfish_core';
import {X509Certificate} from 'crypto';
import * as fs from 'fs';
import {FlyingFishConfig} from '../Config/FlyingFishConfig.js';
import {HubRegistryService} from './HubRegistryService.js';

/**
 * How long the Hub waits on the pkiserver mint call before giving up.
 */
const MINT_TIMEOUT_MS = 5000;

/**
 * Read the cluster Root CA fingerprint (SHA-256) from the CA pool file the
 * pkiserver exports (the shared, already-mounted `ca-pool.json`). The pool is a
 * JSON array of PEMs, root first; returns an empty string when the file is
 * missing/unreadable so a join package can still carry the token.
 * @param caFile - path to the exported CA pool file
 */
async function readCaFingerprint(caFile: string | undefined): Promise<string> {
    if (!caFile) {
        return '';
    }

    try {
        const raw = await fs.promises.readFile(caFile, 'utf-8');
        const pool = JSON.parse(raw) as unknown;

        if (!Array.isArray(pool) || pool.length === 0 || typeof pool[0] !== 'string') {
            return '';
        }

        return new X509Certificate(pool[0]).fingerprint256;
    } catch (error) {
        Logger.getLogger().warn(`ClusterJoinPackage: CA pool file ${caFile} not readable: ${error}`);

        return '';
    }
}

/**
 * The subset of the pkiserver mint response the Hub consumes.
 */
type MintedToken = {
    token: string;
    expiresAt: number;
    autoApprove: boolean;
};

/**
 * Mint a single-use, queued (non-auto-approve) cluster bootstrap token by calling
 * the pkiserver's authenticated `POST /pki/token` route with the shared admin
 * secret. Returns null on any transport/validation failure (the caller degrades to
 * a token-less package).
 * @param pkiUrl - the pkiserver base URL
 * @param secret - the shared mint secret
 */
async function mintToken(pkiUrl: string, secret: string): Promise<MintedToken | null> {
    try {
        const response = await fetch(`${pkiUrl.replace(/\/+$/, '')}/pki/token`, {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                'x-ff-pki-token-secret': secret
            },
            body: JSON.stringify({purpose: 'cluster', autoApprove: false}),
            signal: AbortSignal.timeout(MINT_TIMEOUT_MS)
        });

        if (!response.ok) {
            Logger.getLogger().warn(`ClusterJoinPackage: mint returned HTTP ${response.status}`);

            return null;
        }

        const body = await response.json() as {token?: unknown; expiresAt?: unknown; autoApprove?: unknown;};

        if (typeof body.token !== 'string' || typeof body.expiresAt !== 'number' ||
            typeof body.autoApprove !== 'boolean') {
            Logger.getLogger().warn('ClusterJoinPackage: malformed mint response');

            return null;
        }

        return {token: body.token, expiresAt: body.expiresAt, autoApprove: body.autoApprove};
    } catch (error) {
        Logger.getLogger().warn(`ClusterJoinPackage: mint call failed: ${error}`);

        return null;
    }
}

/**
 * This node's mesh peer endpoint (advertise host + peer port), read from its own
 * gossip roster descriptor, so a joining node can seed-dial it (9.5.12.2 model (b)).
 * Empty host / 0 port when this node is not meshed yet.
 */
function readMeshEndpoint(): {host: string; port: number;} {
    const store = HubRegistryService.getInstance().getClusterAggregate();
    const selfNodeUid = store.selfNodeUid();

    if (selfNodeUid === null) {
        return {host: '', port: 0};
    }

    const self = aggregateClusterNodes(store.entries(), Date.now()).find((node) => node.nodeUid === selfNodeUid);

    return {host: self?.host ?? '', port: self?.port ?? 0};
}

/**
 * Build a cluster join package (Cluster/Mesh epic 9.5.12.2): the pkiserver URL a
 * joining node enrolls against, the Root CA fingerprint it pins, and a freshly
 * minted single-use bootstrap token. When token minting is not configured (no
 * `pki.tokenSecret`) or the mint call fails, `configured` is false and only the
 * pinning info (pkiUrl + caFingerprint) is returned.
 */
export async function buildClusterJoinPackage(): Promise<ClusterJoinPackageResponse> {
    const pki = FlyingFishConfig.getInstance().get()?.pki;
    const pkiUrl = pki?.url ?? '';
    const caFingerprint = await readCaFingerprint(pki?.caFile);
    const mesh = readMeshEndpoint();

    const base: ClusterJoinPackageResponse = {
        statusCode: StatusCodes.OK,
        configured: false,
        pkiUrl: pkiUrl,
        caFingerprint: caFingerprint,
        bootstrapToken: '',
        expiresAt: 0,
        autoApprove: false,
        meshHost: mesh.host,
        meshPort: mesh.port
    };

    if (!pki?.tokenSecret || pkiUrl === '') {
        return base;
    }

    const minted = await mintToken(pkiUrl, pki.tokenSecret);

    if (minted === null) {
        return base;
    }

    return {
        ...base,
        configured: true,
        bootstrapToken: minted.token,
        expiresAt: minted.expiresAt,
        autoApprove: minted.autoApprove
    };
}
