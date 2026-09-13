import {Request, Response} from 'express';
import {TLSSocket} from 'tls';
import {DefaultRouteCheckUserLogin} from 'figtree';
import {ServiceAuth} from 'flyingfish_core';
import {FlyingFishConfig} from '../Config/FlyingFishConfig.js';
import {FlyingFishRouteCheckUserLogin} from './FlyingFishRouteCheckUserLogin.js';
import {PkiTrust} from '../Hub/PkiTrust.js';

/**
 * Wrap a DER certificate (from the TLS peer) as a PEM string.
 * @param {Buffer} der - the raw DER certificate
 * @returns {string}
 */
const derToPem = (der: Buffer): string => {
    const body = der.toString('base64').match(/.{1,64}/gu)?.join('\n') ?? '';

    return `-----BEGIN CERTIFICATE-----\n${body}\n-----END CERTIFICATE-----`;
};

/**
 * Authenticate the request by its mTLS client certificate against the Hub trust,
 * if a peer certificate was presented and PKI is configured. Returns true when
 * the certificate verifies to a (non-revoked) node identity.
 * @param {Request} request
 * @returns {Promise<boolean>}
 */
const verifyClientCert = async(request: Request): Promise<boolean> => {
    const trust = PkiTrust.get();

    if (trust === null || !(request.socket instanceof TLSSocket)) {
        return false;
    }

    const peer = request.socket.getPeerCertificate();

    if (!peer || !peer.raw || peer.raw.length === 0) {
        return false;
    }

    return await trust.authenticate(derToPem(peer.raw)) !== null;
};

/**
 * Request header a part passes its shared registry secret in.
 */
export const REGISTRY_SECRET_HEADER = 'x-flyingfish-registry-secret';

/**
 * FlyingFishRouteCheckServiceOrUserLogin
 *
 * Auth guard for the part-facing Hub registry endpoints (register/heartbeat/bye).
 * Auth order: first the part's mTLS client certificate (own-PKI epic 9.4 —
 * verified to a non-revoked node identity via the Hub trust), then the shared
 * registry secret via the `x-flyingfish-registry-secret` header (verified in
 * constant time through the ServiceAuth seam, kept as the migration fallback),
 * then the normal user-login check so an admin session in the browser keeps
 * working too. The shared secret is retired once every part authenticates by
 * certificate.
 */
export const FlyingFishRouteCheckServiceOrUserLogin: DefaultRouteCheckUserLogin = async(
    request: Request,
    response: Response
): Promise<boolean> => {
    // Preferred: authenticate the part by its mTLS client certificate (own-PKI
    // epic 9.4). Falls through to the shared secret during the migration.
    if (await verifyClientCert(request)) {
        return true;
    }

    const provided = request.headers[REGISTRY_SECRET_HEADER];
    const expected = FlyingFishConfig.getInstance().get()?.registry?.secret;

    if (typeof provided === 'string' && expected && ServiceAuth.verifySecret(provided, expected)) {
        return true;
    }

    return FlyingFishRouteCheckUserLogin(request, response);
};