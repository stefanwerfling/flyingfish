import {Args, Logger} from '@stefanwerfling/figtree';
import {
    ClusterControl,
    ClusterControlRequestRouter,
    ClusterGossip,
    ClusterGossipStore,
    ClusterMembership,
    ClusterMuxKind,
    ClusterPeerMux,
    ClusterQuicPeerTransport,
    ClusterTlsPeerTransport,
    ClusterWssPeerTransport,
    HubClusterGossipSync,
    HubClusterPeerRoster,
    IClusterPeerTransport,
    PkiBootstrapSocketClient,
    PkiCaPurpose,
    PkiClientIdentity,
    PkiNodeClient,
    PkiNodeEnroller,
    PkiNodeFileStore,
    PkiNodeHttpTransport,
    PkiNodeIdentity,
    aggregateClusterCaSet,
    aggregateClusterNodeGroups,
    clusterGossipNamespaceKey,
    clusterTrustChain,
    nodeStillSharesResource,
    startHubRegistration
} from 'flyingfish_core';
import {SchemaDefaultArgs} from 'figtree-schemas';
import {ClusterControlReplyBody, buildClusterCapabilityManifest} from 'flyingfish_schemas';
import {X509Certificate} from 'crypto';
import * as fs from 'fs';
import os from 'os';
import path from 'path';
import {v4 as uuid} from 'uuid';
import {Config} from './inc/Config/Config.js';
import {QuicBindingLoader} from './inc/Cluster/QuicBindingLoader.js';
import {HttpServer} from './inc/Server/HttpServer.js';
import {Cluster, ClusterControlProxyController, ClusterJoinController, ClusterNodeStatus} from './Routes/Main/Cluster.js';

const HEADER_REGISTRY_SECRET = 'x-flyingfish-registry-secret';
const LOCAL_HUB_TIMEOUT_MS = 8000;

/**
 * Read one of this node's own cluster-shareable resources from its local Hub
 * (Cluster/Mesh epic 9.5.12.6, the responder side of a cross-node resource op — e.g.
 * `/cluster/local-domains`, `/cluster/local-listens`). Same-instance HTTP call,
 * authenticated the same way `HubClusterGossipSync` talks to the Hub.
 * @param hubUrl - this node's Hub base URL
 * @param secret - the shared registry secret
 * @param path - the Hub's local-<resource> path, e.g. '/json/registry/cluster/local-domains'
 */
async function fetchLocalHubResource(hubUrl: string, secret: string | undefined, path: string): Promise<unknown> {
    const response = await fetch(`${hubUrl.replace(/\/+$/u, '')}${path}`, {
        headers: {[HEADER_REGISTRY_SECRET]: secret ?? ''},
        signal: AbortSignal.timeout(LOCAL_HUB_TIMEOUT_MS)
    });

    if (!response.ok) {
        throw new Error(`local Hub returned HTTP ${response.status}`);
    }

    return response.json();
}

/**
 * Apply a mutation to one of this node's own cluster-shareable resources via its local
 * Hub (Cluster/Mesh epic 9.5.12.7, the responder side of a cross-node WRITE — e.g.
 * `/cluster/local-domain-save`, `/cluster/local-domain-delete`). Same auth/shape as
 * {@link fetchLocalHubResource}, just POST with a JSON body.
 * @param hubUrl - this node's Hub base URL
 * @param secret - the shared registry secret
 * @param path - the Hub's local-<resource> write path
 * @param body - the request body to relay verbatim
 */
async function postLocalHubResource(hubUrl: string, secret: string | undefined, path: string, body: unknown): Promise<unknown> {
    const response = await fetch(`${hubUrl.replace(/\/+$/u, '')}${path}`, {
        method: 'POST',
        headers: {[HEADER_REGISTRY_SECRET]: secret ?? '', 'content-type': 'application/json'},
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(LOCAL_HUB_TIMEOUT_MS)
    });

    if (!response.ok) {
        throw new Error(`local Hub returned HTTP ${response.status}`);
    }

    return response.json();
}

const SESSION_MAX_AGE = 6000000;
const DEFAULT_PEER_PORT = 5336;
const DEFAULT_SYNC_INTERVAL_MS = 30000;
const JOIN_TOKEN_VALIDATE_TIMEOUT_MS = 5000;

/**
 * Validate (and consume) a joining peer's bootstrap token against the CA-holder's
 * pkiserver (Cluster/Mesh epic 9.5.12.2, model (b) accept side). Returns false on any
 * missing config, transport failure, or an invalid/expired/used token — so an
 * unauthenticated peer is never admitted.
 * @param pkiUrl - this node's pkiserver base URL
 * @param secret - the shared admin token secret
 * @param token - the peer's presented join token
 */
async function validateJoinToken(pkiUrl: string | undefined, secret: string | undefined, token: string): Promise<boolean> {
    if (pkiUrl === undefined || secret === undefined || secret === '') {
        return false;
    }

    try {
        const response = await fetch(`${pkiUrl.replace(/\/+$/u, '')}/pki/token/validate`, {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                'x-ff-pki-token-secret': secret
            },
            body: JSON.stringify({token: token}),
            signal: AbortSignal.timeout(JOIN_TOKEN_VALIDATE_TIMEOUT_MS)
        });

        if (!response.ok) {
            return false;
        }

        const body = await response.json() as {valid?: unknown;};

        return body.valid === true;
    } catch (error) {
        Logger.getLogger().warn(`Cluster join: token validation failed: ${error}`);

        return false;
    }
}

/**
 * Main
 */
(async(): Promise<void> => {
    const argv = Args.get(SchemaDefaultArgs);
    let configfile = null;

    if (argv.config) {
        configfile = argv.config;

        try {
            if (!fs.existsSync(configfile)) {
                console.log(`Config not found: ${configfile}, exit.`);
                return;
            }
        } catch (err) {
            console.log(`Config is not load: ${configfile}, exit.`);
            console.error(err);
            return;
        }
    } else {
        const defaultConfig = path.join(path.resolve(), `/${Config.DEFAULT_CONFIG_FILE}`);

        if (fs.existsSync(defaultConfig)) {
            console.log(`Found and use setup config: ${defaultConfig} ....`);
            configfile = defaultConfig;
        }
    }

    let useEnv = false;

    if (argv.envargs && argv.envargs === '1') {
        useEnv = true;
    }

    const tConfig = await Config.getInstance().load(configfile, useEnv);

    if (tConfig === null) {
        console.log(`Configloader is return empty config, please check your configfile: ${configfile}`);
        return;
    }

    // -----------------------------------------------------------------------------------------------------------------

    Logger.getLogger();

    Logger.getLogger().info('Start FlyingFish Cluster Server ...');

    // Node PKI (Cluster/Mesh epic 9.5.9): enroll + auto-renew this node's own
    // cluster certificate under the `cluster` CA purpose, BEFORE Hub registration
    // so the registration authenticates over mTLS with it. Optional and non-fatal
    // — without pki config the cluster node simply runs without an identity yet.
    const commonName = tConfig.pki?.commonName ?? `cluster@${os.hostname()}`;

    const status: ClusterNodeStatus = {
        nodeUid: '',
        purpose: PkiCaPurpose.cluster,
        commonName: commonName,
        enrolled: false
    };

    let nodeIdentity: PkiClientIdentity | undefined;
    let enrolledIdentity: PkiNodeIdentity | undefined;

    if (tConfig.pki) {
        try {
            const store = new PkiNodeFileStore(
                tConfig.pki.storeDir ?? tConfig.flyingfish_libpath ?? Config.DEFAULT_FF_DIR
            );

            const bootstrapSocket = tConfig.pki.bootstrapSocket;
            const bootstrapTokenProvider = bootstrapSocket
                ? (purpose: PkiCaPurpose): Promise<string> => new PkiBootstrapSocketClient(bootstrapSocket).fetchToken(purpose)
                : undefined;

            const enroller = new PkiNodeEnroller(
                new PkiNodeClient(new PkiNodeHttpTransport(tConfig.pki.url)),
                store,
                {
                    bootstrapToken: tConfig.pki.bootstrapToken,
                    bootstrapTokenProvider: bootstrapTokenProvider,
                    purpose: PkiCaPurpose.cluster,
                    commonName: commonName
                }
            );

            const identity = await enroller.ensure();

            enrolledIdentity = identity;
            nodeIdentity = {cert: identity.certificate, key: identity.privateKey};
            status.nodeUid = identity.nodeUid;
            status.enrolled = true;

            Logger.getLogger().info(`Cluster node PKI identity ready (nodeUid ${identity.nodeUid})`);
        } catch (error) {
            Logger.getLogger().error('Cluster node PKI enrollment failed (continuing without a node certificate)', error);
        }
    }

    // start server ----------------------------------------------------------------------------------------------------

    const aport = tConfig.clusterserver?.port ?? Config.DEFAULT_CLUSTERSERVER_PORT;

    // The join action is filled in by the mesh block below (once membership + trust are
    // up); until then POST /cluster/join reports the mesh is inactive (9.5.12.2).
    const joinController: ClusterJoinController = {};

    // Same pattern, for the outbound control-request proxy (9.5.12.4/.6): filled in
    // once `ClusterControl` exists, so the local Hub can dial a mesh peer.
    const controlController: ClusterControlProxyController = {};

    const mServer = new HttpServer({
        realm: 'FlyingFish',
        port: aport,
        session: {
            secret: uuid(),
            ssl_path: '',
            cookie_path: '/',
            max_age: SESSION_MAX_AGE
        },
        routes: [
            new Cluster(status, joinController, controlController)
        ]
    });

    await mServer.setupAndListen();

    // Announce this node to the Hub registry. Optional: without registry config the
    // cluster node simply does not self-register. When a node certificate was
    // obtained above, the registration authenticates over mTLS with it.
    if (tConfig.registry) {
        await startHubRegistration(
            tConfig.registry.url,
            tConfig.registry.secret,
            buildClusterCapabilityManifest(`cluster@${os.hostname()}`),
            {identity: nodeIdentity}
        );
    }

    // Mesh peer transport (Cluster/Mesh epic 9.5.1): with a cluster node identity
    // and the Hub registry both present, bring up the authenticated peer transport,
    // announce our endpoint to the Hub roster and periodically sync — dialing the
    // other cluster nodes so every pair holds exactly one channel. Best-effort and
    // non-fatal: without either an identity or the registry the control part still
    // runs, just without the mesh. The data plane lives in the dedicated
    // clusterdatapath node, so clusterserver only joins the mesh when explicitly
    // opted in (cluster.mesh) — it is control-only by default.
    if (enrolledIdentity && tConfig.registry && tConfig.cluster?.mesh === true) {
        try {
            // Created up-front so the transport's trust provider can read the live
            // member-CA set from it (model (b) cross-trust): peers are verified against
            // the union of all members' CAs, re-evaluated at each handshake, so a
            // newly-joined node's peers become trusted without a restart.
            const gossipStore = new ClusterGossipStore(enrolledIdentity.nodeUid);
            const ownChain = enrolledIdentity.chain;

            // CAs of peers admitted through the bootstrap join, before their own
            // `ca:<uid>` descriptor gossips back — unioned into the live trust set so a
            // freshly-joined peer authenticates without a restart (model (b)).
            const bootstrapTrust: string[] = [];
            const pkiUrl = tConfig.pki?.url;
            const pkiTokenSecret = tConfig.pki?.tokenSecret;

            const transportOptions = {
                certificate: enrolledIdentity.certificate,
                privateKey: enrolledIdentity.privateKey,
                caChain: ownChain,
                trustProvider: (): string[] => clusterTrustChain(aggregateClusterCaSet(gossipStore.liveEntries()), [...ownChain, ...bootstrapTrust]),
                // Accept side of the one-port join: admit a not-yet-trusted inbound peer
                // just far enough to validate its join token; on success its CA joins the
                // bootstrap trust set so its next (normal) connection authenticates.
                bootstrap: {
                    ownCaChain: ownChain,
                    validateToken: async(token: string): Promise<boolean> => validateJoinToken(pkiUrl, pkiTokenSecret, token),
                    onAcceptedCa: (chain: string[]): void => {
                        bootstrapTrust.push(...chain);
                    }
                }
            };

            // Pick the peer transport wire. 'quic' is the NAT-friendly, connection-
            // migrating primary over our own native binding; 'wss' carries the channel
            // over HTTPS/443; 'tls' (default) is the raw TCP-TLS transport. All three
            // authenticate identically with the cluster node-cert. If 'quic' is
            // selected but the native binding is unavailable (not built for this
            // platform), fall back to TLS rather than dropping out of the mesh.
            let transportName = tConfig.cluster?.transport ?? 'tls';
            let transport: IClusterPeerTransport;

            if (transportName === 'quic') {
                const quicBinding = QuicBindingLoader.load();

                if (quicBinding === null) {
                    Logger.getLogger().warn('QUIC binding unavailable — falling back to the TLS peer transport');
                    transportName = 'tls';
                    transport = new ClusterTlsPeerTransport(transportOptions);
                } else {
                    transport = new ClusterQuicPeerTransport(transportOptions, quicBinding);
                }
            } else if (transportName === 'wss') {
                transport = new ClusterWssPeerTransport(transportOptions);
            } else {
                transportName = 'tls';
                transport = new ClusterTlsPeerTransport(transportOptions);
            }

            const membership = new ClusterMembership(transport, enrolledIdentity.nodeUid);

            // Cluster gossip (Cluster/Mesh epic 9.5.12): each node gossips its state
            // over the mesh's Gossip mux sub-channel; anti-entropy convergence gives
            // every node the cluster-wide view with NO central Hub. Each peer channel
            // is multiplexed (as for L3/L4) so gossip rides the one authenticated link.
            const gossip = new ClusterGossip(gossipStore);

            // Cluster control (Cluster/Mesh epic 9.5.12, A+C): the synchronous cross-node
            // write path rides its own Control mux sub-channel. Inbound requests are
            // routed by method to the registered write handlers (registered in a later
            // sub-slice); node A enforces before calling, node B trusts the mesh peer.
            const control = new ClusterControl();
            const controlRouter = new ClusterControlRequestRouter();
            control.onRequest(controlRouter.handle);

            // Let the local Hub dial a mesh peer through this clusterserver (9.5.12.4/.6).
            // The Hub has already authorized the call before ever reaching here — this
            // proxy just relays; `control.request` throwing (no peer / timeout) surfaces
            // as a normal rejection, caught by the `/cluster/control` route.
            controlController.handler = async(nodeUid, method, payload): Promise<ClusterControlReplyBody> =>
                control.request(nodeUid, method, payload);

            // Responder side of the first cross-node resource op (9.5.12.6): a peer
            // asking for our domains. Defense-in-depth only — the REAL authorization
            // (does the requester's user hold a matching grant) already happened on
            // their end, node-locally, before they ever dialed us (no cross-node SSO,
            // "B trusts A's mesh peer"). We only re-check that WE still currently share
            // `domain` with some node group at all; if so, read our own Hub's domains
            // and relay them. `payload`/`fromNodeUid` are unused (there's only one thing
            // to share today); kept in the signature for the next resource type.
            const registryUrl = tConfig.registry.url;
            const registrySecret = tConfig.registry.secret;
            const selfUidForControl = enrolledIdentity.nodeUid;

            controlRouter.register('domain.list', async(): Promise<{ok: boolean; payload?: unknown; error?: string;}> => {
                const stillShared = nodeStillSharesResource(
                    aggregateClusterNodeGroups(gossipStore.liveEntries()).shares, selfUidForControl, 'domain'
                );

                if (!stillShared) {
                    return {ok: false, error: 'domain is not currently shared by this node'};
                }

                try {
                    return {ok: true, payload: await fetchLocalHubResource(registryUrl, registrySecret, '/json/registry/cluster/local-domains')};
                } catch (error) {
                    return {ok: false, error: `${error}`};
                }
            });

            // Second cross-node resource type (9.5.12.6 follow-up): our nginx listens,
            // same defense-in-depth re-check + relay shape as domain.list above.
            controlRouter.register('listen.list', async(): Promise<{ok: boolean; payload?: unknown; error?: string;}> => {
                const stillShared = nodeStillSharesResource(
                    aggregateClusterNodeGroups(gossipStore.liveEntries()).shares, selfUidForControl, 'listen'
                );

                if (!stillShared) {
                    return {ok: false, error: 'listen is not currently shared by this node'};
                }

                try {
                    return {ok: true, payload: await fetchLocalHubResource(registryUrl, registrySecret, '/json/registry/cluster/local-listens')};
                } catch (error) {
                    return {ok: false, error: `${error}`};
                }
            });

            // First cross-node WRITE (9.5.12.7): a peer asking us to save/delete a domain
            // in OUR OWN database. Same defense-in-depth shape as the reads above, but
            // level-gated ('write', not just any share) since this mutates our data — a
            // read-only share must not reach here (the requester already checked this
            // before dialing us; we only re-confirm WE still currently grant write).
            controlRouter.register('domain.save', async(payload): Promise<{ok: boolean; payload?: unknown; error?: string;}> => {
                const stillShared = nodeStillSharesResource(
                    aggregateClusterNodeGroups(gossipStore.liveEntries()).shares, selfUidForControl, 'domain', 'write'
                );

                if (!stillShared) {
                    return {ok: false, error: 'domain is not currently shared for write by this node'};
                }

                try {
                    return {ok: true, payload: await postLocalHubResource(registryUrl, registrySecret, '/json/registry/cluster/local-domain-save', payload)};
                } catch (error) {
                    return {ok: false, error: `${error}`};
                }
            });

            controlRouter.register('domain.delete', async(payload): Promise<{ok: boolean; payload?: unknown; error?: string;}> => {
                const stillShared = nodeStillSharesResource(
                    aggregateClusterNodeGroups(gossipStore.liveEntries()).shares, selfUidForControl, 'domain', 'write'
                );

                if (!stillShared) {
                    return {ok: false, error: 'domain is not currently shared for write by this node'};
                }

                try {
                    return {ok: true, payload: await postLocalHubResource(registryUrl, registrySecret, '/json/registry/cluster/local-domain-delete', payload)};
                } catch (error) {
                    return {ok: false, error: `${error}`};
                }
            });

            // Wire gossip + control onto every peer (set before start so none is missed).
            membership.onPeer((channel) => {
                const nodeUid = channel.identity.nodeUid;
                const mux = new ClusterPeerMux(channel);

                // The nodeUid here is read from the peer's TLS-verified client cert, so
                // this line is proof the peer authenticated against the cross-trusted CA
                // set (model (b)). Logged at info as a mesh membership event.
                Logger.getLogger().info(`Cluster mesh peer connected (authenticated nodeUid ${nodeUid})`);

                gossip.addPeer(nodeUid, mux.channel(ClusterMuxKind.Gossip));
                control.addPeer(nodeUid, mux.channel(ClusterMuxKind.Control));
                mux.onClose((): void => {
                    Logger.getLogger().info(`Cluster mesh peer disconnected (nodeUid ${nodeUid})`);
                    gossip.removePeer(nodeUid);
                    control.removePeer(nodeUid);
                });
            });

            const peerPort = await membership.start(tConfig.cluster?.peerPort ?? DEFAULT_PEER_PORT);

            const roster = new HubClusterPeerRoster({
                hubUrl: tConfig.registry.url,
                selfNodeUid: enrolledIdentity.nodeUid,
                secret: tConfig.registry.secret
            });

            // Hub↔clusterserver config sync (9.5.12 phase 2b): pull this Hub's
            // publishable resources into the gossip store, push the converged aggregate
            // back for the frontend.
            const gossipSync = new HubClusterGossipSync({
                hubUrl: tConfig.registry.url,
                selfNodeUid: enrolledIdentity.nodeUid,
                secret: tConfig.registry.secret
            });

            const selfNodeUid = enrolledIdentity.nodeUid;
            const advertiseHost = tConfig.cluster?.advertiseHost ?? os.hostname();
            const syncIntervalMs = tConfig.cluster?.syncIntervalMs ?? DEFAULT_SYNC_INTERVAL_MS;

            // This node's leaf-cert SHA-256 fingerprint — a stable mesh identity we
            // publish alongside the descriptor (9.5.12.2). Computed once (the cert does
            // not change within a run).
            const certFingerprint = enrolledIdentity
                ? new X509Certificate(enrolledIdentity.certificate).fingerprint256
                : undefined;

            // Seed this node's own descriptor (with a heartbeat) so the federated node
            // roster + liveness emerge via gossip (no central directory). The heartbeat
            // is refreshed each sync; peers treat a stale heartbeat as the node being
            // down and fail domains over off it (9.5.14). Also carries this node's cluster
            // identity + chosen transport so the Cluster page can render it (9.5.12.2).
            const heartbeat = (): void => {
                gossipStore.set(`node:${selfNodeUid}`, {
                    nodeUid: selfNodeUid,
                    host: advertiseHost,
                    port: peerPort,
                    heartbeat: Date.now(),
                    commonName: enrolledIdentity?.commonName,
                    transport: transportName,
                    certFingerprint: certFingerprint,
                    enrolled: enrolledIdentity !== null
                });
            };

            heartbeat();

            // Publish this node's own CA chain into the gossip so the cluster converges
            // on the full member-CA set (Cluster/Mesh 9.5.12.2, model (b) cross-trust):
            // every node trusts every member's CA — no node re-homes under a founder CA.
            // Seeded once; the CA is stable within a run.
            if (enrolledIdentity && enrolledIdentity.chain.length > 0) {
                gossipStore.set(`ca:${selfNodeUid}`, {
                    nodeUid: selfNodeUid,
                    chain: enrolledIdentity.chain,
                    rootFingerprint: new X509Certificate(enrolledIdentity.chain[enrolledIdentity.chain.length - 1]).fingerprint256
                });
            }

            // Refresh our announcement (TTL), re-sync the membership, pull the Hub's
            // resources into the gossip store (owned by this node, keys namespaced by
            // nodeUid), run a gossip anti-entropy round, then push the converged
            // aggregate back to the Hub — all best-effort so a transient outage is not
            // fatal.
            const syncOnce = async(): Promise<void> => {
                heartbeat();

                // The Hub-facing steps (roster announce/pull/push) are each best-effort:
                // a Hub outage — or, in a fresh cluster, a Hub cert not yet valid for this
                // node's address — must NOT stop the peer mesh from forming. The datapath
                // is clusterserver↔clusterserver (seed dial + gossip anti-entropy below);
                // the Hub only mirrors the converged view for the frontend.
                try {
                    await roster.announce(advertiseHost, peerPort);
                } catch (error) {
                    Logger.getLogger().warn('Cluster roster announce failed (continuing; will retry next interval)', error);
                }

                await membership.sync(roster);

                try {
                    for (const entry of await gossipSync.pullLocalState()) {
                        // Global entries (cluster-shared, UUID-keyed — the RBAC policy) keep
                        // their key so every node converges on it; per-node resources are
                        // namespaced by this node's uid (Cluster/Mesh 9.5.12, A+C).
                        const storeKey = entry.global === true ? entry.key : clusterGossipNamespaceKey(selfNodeUid, entry.key);
                        gossipStore.setIfChanged(storeKey, entry.value);
                    }
                } catch (error) {
                    Logger.getLogger().warn('Cluster Hub state pull failed (continuing; will retry next interval)', error);
                }

                gossip.sync();

                try {
                    await gossipSync.pushAggregate(gossipStore.liveEntries().map((entry) => ({key: entry.key, value: entry.value})));
                } catch (error) {
                    Logger.getLogger().warn('Cluster Hub aggregate push failed (continuing; will retry next interval)', error);
                }
            };

            // Wire the join action BEFORE the first sync so a join that arrives early is
            // honoured: applying a join package registers the target as a bootstrap seed
            // (token + CA pin) and runs a sync so the one-port bootstrap pre-flight fires
            // promptly; the mesh channel then forms on a following sync (model (b),
            // 9.5.12.2). Independent of the first sync's Hub reachability.
            joinController.handler = async(request): Promise<void> => {
                membership.addSeedPeer(request.meshHost, request.meshPort, {
                    token: request.bootstrapToken,
                    pinFingerprint: request.caFingerprint,
                    ownCaChain: ownChain,
                    onAcceptedCa: (chain: string[]): void => {
                        bootstrapTrust.push(...chain);
                    }
                });

                await syncOnce();
            };

            // Initial sync is best-effort: syncOnce already guards each Hub step, but a
            // wrap keeps any unexpected error from tearing down the (already-listening)
            // mesh transport and the periodic sync below.
            await syncOnce().catch((error: unknown): void => {
                Logger.getLogger().warn('Cluster mesh initial sync failed (will retry next interval)', error);
            });

            setInterval((): void => {
                syncOnce().catch((error: unknown): void => {
                    Logger.getLogger().warn('Cluster mesh sync failed (will retry next interval)', error);
                });
            }, syncIntervalMs).unref();

            Logger.getLogger().info(`Cluster mesh transport (${transportName}) listening on peer port ${peerPort} (advertising ${advertiseHost})`);
        } catch (error) {
            Logger.getLogger().error('Cluster mesh transport failed to start (continuing without the mesh)', error);
        }
    }
})().catch((error: unknown): void => {
    // The logging framework may not be seated yet if boot fails this early,
    // so report to stderr and exit non-zero (lets the container restart).
    console.error('FlyingFish cluster server failed to start:', error);
    process.exit(1);
});