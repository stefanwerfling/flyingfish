import {Router} from 'express';
import {aggregateClusterDomains, aggregateClusterNodeGroups, aggregateClusterNodes, aggregateClusterRbac, clusterLiveNodeUids, resolveDomainActiveNode} from 'flyingfish_core';
import {
    ClusterDomainsResponse,
    ClusterLocalStateResponse,
    ClusterNodeGroupSaveResponse,
    ClusterNodeGroupsResponse,
    ClusterNodesResponse,
    ClusterPeersResponse,
    ClusterRbacResponse,
    ClusterRoutesResponse,
    ClusterStateResponse,
    DefaultReturn,
    RegistryPartsResponse,
    RegistryUiContributionsResponse,
    SchemaCapabilityManifest,
    SchemaClusterAggregatePublishRequest,
    SchemaClusterAnnounceRequest,
    SchemaClusterDomainsResponse,
    SchemaClusterLocalStateResponse,
    SchemaClusterNodeGroupDeleteRequest,
    SchemaClusterNodeGroupMembershipRequest,
    SchemaClusterNodeGroupSaveRequest,
    SchemaClusterNodeGroupSaveResponse,
    SchemaClusterNodeGroupShareDeleteRequest,
    SchemaClusterNodeGroupShareRequest,
    SchemaClusterNodeGroupsResponse,
    SchemaClusterNodesResponse,
    SchemaClusterRbacResponse,
    SchemaClusterPeersResponse,
    SchemaClusterRoutesPublishRequest,
    SchemaClusterRoutesResponse,
    SchemaClusterStateResponse,
    SchemaDefaultReturn,
    SchemaRegistryInstanceRequest,
    SchemaRegistryPartsResponse,
    SchemaRegistryUiContributionsResponse,
    StatusCodes,
    ClusterJoinPackageResponse,
    SchemaClusterJoinPackageResponse,
    SchemaClusterJoinRequest
} from 'flyingfish_schemas';
import {ClusterLocalStateProvider} from '../../Application/Hub/ClusterLocalStateProvider.js';
import {ClusterNodeGroupConverger} from '../../Application/Hub/ClusterNodeGroupConverger.js';
import {ClusterNodeGroupManager} from '../../Application/Hub/ClusterNodeGroupManager.js';
import {ClusterRbacConverger} from '../../Application/Hub/ClusterRbacConverger.js';
import {buildClusterJoinPackage} from '../../Application/Hub/ClusterJoinPackage.js';
import {proxyClusterJoin} from '../../Application/Hub/ClusterJoin.js';
import {requirePermission} from '../../Application/Server/FlyingFishRouteCheckPermission.js';
import {DefaultRoute, Logger} from '@stefanwerfling/figtree';
import {FlyingFishRouteCheckUserLogin} from '../../Application/Server/FlyingFishRouteCheckUserLogin.js';
import {FlyingFishRouteCheckServiceOrUserLogin} from '../../Application/Server/FlyingFishRouteCheckServiceOrUserLogin.js';
import {HubRegistryService} from '../../Application/Hub/HubRegistryService.js';

/**
 * Registry
 *
 * HTTP surface of the in-memory Hub registry (v2 modular architecture, DNS
 * pilot). Parts register/heartbeat/deregister; the frontend reads the aggregated
 * UI contributions and the parts list.
 *
 * NOTE: the part-facing register/heartbeat/bye endpoints authenticate either
 * with the shared registry secret (ServiceAuth seam, step 5.3) or a user login;
 * they will move to PKI service-cert auth over the mTLS-WSS transport in a later
 * pilot stage. The read endpoints (parts, ui-contributions) stay user-login only.
 */
export class Registry extends DefaultRoute {

    /**
     * getExpressRouter
     */
    public override getExpressRouter(): Router {
        this._post(
            '/json/registry/register',
            FlyingFishRouteCheckServiceOrUserLogin,
            async(_req, _res, data): Promise<DefaultReturn> => {
                HubRegistryService.getInstance().getRegistry().register(data.body!);

                return {statusCode: StatusCodes.OK};
            },
            {
                description: 'Register a part with the hub registry',
                bodySchema: SchemaCapabilityManifest,
                responseBodySchema: SchemaDefaultReturn
            }
        );

        this._post(
            '/json/registry/heartbeat',
            FlyingFishRouteCheckServiceOrUserLogin,
            async(_req, _res, data): Promise<DefaultReturn> => {
                const known = HubRegistryService.getInstance().getRegistry().heartbeat(data.body!.instanceId);

                return {
                    statusCode: known ? StatusCodes.OK : StatusCodes.INTERNAL_ERROR
                };
            },
            {
                description: 'Heartbeat for a registered part',
                bodySchema: SchemaRegistryInstanceRequest,
                responseBodySchema: SchemaDefaultReturn
            }
        );

        this._post(
            '/json/registry/bye',
            FlyingFishRouteCheckServiceOrUserLogin,
            async(_req, _res, data): Promise<DefaultReturn> => {
                HubRegistryService.getInstance().getRegistry().bye(data.body!.instanceId);

                return {statusCode: StatusCodes.OK};
            },
            {
                description: 'Deregister a part from the hub registry',
                bodySchema: SchemaRegistryInstanceRequest,
                responseBodySchema: SchemaDefaultReturn
            }
        );

        this._get(
            '/json/registry/parts',
            FlyingFishRouteCheckUserLogin,
            async(): Promise<RegistryPartsResponse> => {
                const list = HubRegistryService.getInstance().getRegistry().list().map((part) => {
                    return {
                        id: part.manifest.part.id,
                        name: part.manifest.part.name,
                        instanceId: part.manifest.part.instanceId,
                        status: part.status,
                        registeredAt: part.registeredAt,
                        lastHeartbeat: part.lastHeartbeat,
                        capabilities: part.manifest.capabilities.map((capability) => capability.key)
                    };
                });

                return {statusCode: StatusCodes.OK, list: list};
            },
            {
                description: 'Read the registered parts list',
                responseBodySchema: SchemaRegistryPartsResponse
            }
        );

        this._get(
            '/json/registry/ui-contributions',
            FlyingFishRouteCheckUserLogin,
            async(): Promise<RegistryUiContributionsResponse> => {
                const ui = HubRegistryService.getInstance().getRegistry().uiContributions();

                return {
                    statusCode: StatusCodes.OK,
                    menu: ui.menu,
                    pages: ui.pages,
                    widgets: ui.widgets
                };
            },
            {
                description: 'Read the aggregated UI contributions',
                responseBodySchema: SchemaRegistryUiContributionsResponse
            }
        );

        this._post(
            '/json/registry/cluster/announce',
            FlyingFishRouteCheckServiceOrUserLogin,
            async(_req, _res, data): Promise<DefaultReturn> => {
                HubRegistryService.getInstance().getClusterPeers().announce(
                    data.body!.nodeUid,
                    data.body!.host,
                    data.body!.port,
                    data.body!.overlayIp
                );

                return {statusCode: StatusCodes.OK};
            },
            {
                description: 'Announce a cluster node peer endpoint to the hub',
                bodySchema: SchemaClusterAnnounceRequest,
                responseBodySchema: SchemaDefaultReturn
            }
        );

        this._get(
            '/json/registry/cluster/peers',
            FlyingFishRouteCheckServiceOrUserLogin,
            async(): Promise<ClusterPeersResponse> => {
                return {
                    statusCode: StatusCodes.OK,
                    list: HubRegistryService.getInstance().getClusterPeers().peers()
                };
            },
            {
                description: 'Read the cluster peer roster',
                responseBodySchema: SchemaClusterPeersResponse
            }
        );

        this._post(
            '/json/registry/cluster/routes/publish',
            FlyingFishRouteCheckServiceOrUserLogin,
            async(_req, _res, data): Promise<DefaultReturn> => {
                HubRegistryService.getInstance().getClusterRoutes().publish(
                    data.body!.nodeUid,
                    data.body!.routes
                );

                return {statusCode: StatusCodes.OK};
            },
            {
                description: 'Publish the L4 routes a node owns to the cluster route model',
                bodySchema: SchemaClusterRoutesPublishRequest,
                responseBodySchema: SchemaDefaultReturn
            }
        );

        this._get(
            '/json/registry/cluster/routes',
            FlyingFishRouteCheckServiceOrUserLogin,
            async(): Promise<ClusterRoutesResponse> => {
                return {
                    statusCode: StatusCodes.OK,
                    list: HubRegistryService.getInstance().getClusterRoutes().routes()
                };
            },
            {
                description: 'Read the cluster-wide L4 route set',
                responseBodySchema: SchemaClusterRoutesResponse
            }
        );

        // Cluster gossip sync (9.5.12 phase 2b): the local clusterserver pulls this
        // Hub's publishable resources, owns + gossips them, and pushes the converged
        // cluster-wide aggregate back for the frontend to read.
        this._get(
            '/json/registry/cluster/local-state',
            FlyingFishRouteCheckServiceOrUserLogin,
            async(): Promise<ClusterLocalStateResponse> => {
                return {
                    statusCode: StatusCodes.OK,
                    entries: await new ClusterLocalStateProvider().entries()
                };
            },
            {
                description: 'Read this Hub\'s resources to publish into the cluster gossip',
                responseBodySchema: SchemaClusterLocalStateResponse
            }
        );

        this._post(
            '/json/registry/cluster/aggregate',
            FlyingFishRouteCheckServiceOrUserLogin,
            async(_req, _res, data): Promise<DefaultReturn> => {
                const entries = data.body!.entries;
                HubRegistryService.getInstance().getClusterAggregate().set(entries);

                // The push carries the local clusterserver's own nodeUid — the only
                // self-authoritative node identity the Hub sees. Keep it so the node
                // roster can flag which entry is "this node" (9.5.12).
                HubRegistryService.getInstance().getClusterAggregate().setSelfNodeUid(data.body!.nodeUid);

                // Converge the cluster-global RBAC policy into this node's local DB so
                // LOCAL enforcement sees the shared rights DB (9.5.12, A+C option B).
                // Best-effort: a converge failure must not fail the aggregate push.
                try {
                    await new ClusterRbacConverger().import(aggregateClusterRbac(entries));
                } catch (error) {
                    Logger.getLogger().warn('Cluster RBAC convergence failed (will retry on the next aggregate push)', error);
                }

                // Converge the cluster-global NODE GROUPS into this node's local DB so the
                // grouping is renderable/enforceable on any node (9.5.12.3). Best-effort.
                try {
                    await new ClusterNodeGroupConverger().import(aggregateClusterNodeGroups(entries));
                } catch (error) {
                    Logger.getLogger().warn('Cluster node-group convergence failed (will retry on the next aggregate push)', error);
                }

                return {statusCode: StatusCodes.OK};
            },
            {
                description: 'Push the converged cluster-wide gossip aggregate to this Hub',
                bodySchema: SchemaClusterAggregatePublishRequest,
                responseBodySchema: SchemaDefaultReturn
            }
        );

        this._get(
            '/json/registry/cluster/state',
            FlyingFishRouteCheckUserLogin,
            async(): Promise<ClusterStateResponse> => {
                return {
                    statusCode: StatusCodes.OK,
                    entries: HubRegistryService.getInstance().getClusterAggregate().entries()
                };
            },
            {
                description: 'Read the cluster-wide aggregate view (federated, for the UI)',
                responseBodySchema: SchemaClusterStateResponse
            }
        );

        this._get(
            '/json/registry/cluster/domains',
            FlyingFishRouteCheckServiceOrUserLogin,
            async(): Promise<ClusterDomainsResponse> => {
                const aggregate = HubRegistryService.getInstance().getClusterAggregate().entries();
                const live = clusterLiveNodeUids(aggregate, Date.now());

                return {
                    statusCode: StatusCodes.OK,
                    list: aggregateClusterDomains(aggregate).map((view) => {
                        const active = resolveDomainActiveNode(view, live);

                        return {
                            name: view.name,
                            nodes: view.nodes,
                            activeNodeUid: active?.nodeUid ?? null,
                            activeIp: active?.ip ?? null
                        };
                    })
                };
            },
            {
                description: 'Which nodes manage each domain cluster-wide, with the active (live, highest-priority) node (HA / DNS failover view)',
                responseBodySchema: SchemaClusterDomainsResponse
            }
        );

        // Cluster node roster (9.5.12, Proxmox-style dashboard): the federated node
        // list with each node's online/offline state, projected from the converged
        // gossip aggregate (leaderless — no central directory). Read-only.
        this._get(
            '/json/registry/cluster/nodes',
            FlyingFishRouteCheckUserLogin,
            async(): Promise<ClusterNodesResponse> => {
                const store = HubRegistryService.getInstance().getClusterAggregate();

                return {
                    statusCode: StatusCodes.OK,
                    list: aggregateClusterNodes(store.entries(), Date.now()),
                    selfNodeUid: store.selfNodeUid()
                };
            },
            {
                description: 'The cluster-wide node roster with each node\'s online/offline state (Proxmox-style node dashboard)',
                responseBodySchema: SchemaClusterNodesResponse
            }
        );

        // Cluster join package (9.5.12.2): mint a single-use bootstrap token + return
        // the pkiserver URL and Root CA fingerprint a joining node pins/enrolls with.
        // Sensitive (issues an enrollment credential) → cluster.manage gated. Degrades
        // to a token-less package (configured=false) when minting is not set up.
        this._post(
            '/json/registry/cluster/join-package',
            requirePermission('cluster.manage'),
            async(): Promise<ClusterJoinPackageResponse> => {
                return buildClusterJoinPackage();
            },
            {
                description: 'Mint a join package (bootstrap token + CA pin) for another node to enroll into this cluster',
                responseBodySchema: SchemaClusterJoinPackageResponse
            }
        );

        // Apply a join package on THIS node (9.5.12.2 model (b)): proxy the seed-dial +
        // bootstrap to the co-located clusterserver, which owns the mesh. cluster.manage
        // gated (it changes this node's cluster membership).
        this._post(
            '/json/registry/cluster/join',
            requirePermission('cluster.manage'),
            async(_req, _res, data): Promise<DefaultReturn> => {
                return proxyClusterJoin({
                    meshHost: data.body!.meshHost,
                    meshPort: data.body!.meshPort,
                    bootstrapToken: data.body!.bootstrapToken,
                    caFingerprint: data.body!.caFingerprint
                });
            },
            {
                description: 'Apply a join package on this node to join another cluster (seed-dial + bootstrap)',
                bodySchema: SchemaClusterJoinRequest,
                responseBodySchema: SchemaDefaultReturn
            }
        );

        // Cluster-global RBAC policy (9.5.12, A+C shared rights DB): the shared
        // group/role/permission/grant tables aggregated from the gossip (each keyed by
        // a cluster-stable UUID, published un-namespaced so the cluster shares one
        // policy). Read-only; node-local memberships are not included.
        this._get(
            '/json/registry/cluster/rbac',
            FlyingFishRouteCheckUserLogin,
            async(): Promise<ClusterRbacResponse> => {
                const view = aggregateClusterRbac(HubRegistryService.getInstance().getClusterAggregate().entries());

                return {
                    statusCode: StatusCodes.OK,
                    groups: view.groups,
                    roles: view.roles,
                    permissions: view.permissions,
                    rolePermissions: view.rolePermissions,
                    assignments: view.assignments
                };
            },
            {
                description: 'The cluster-wide shared RBAC policy (groups/roles/permissions/grants) aggregated from the gossip',
                responseBodySchema: SchemaClusterRbacResponse
            }
        );

        // Cluster-global NODE GROUPS (9.5.12.3) + their SHARING RULES (9.5.12.4): the
        // shared grouping of nodes + memberships + which resource types a node exposes to
        // a group, aggregated from the gossip (each keyed by a cluster-stable UUID,
        // published un-namespaced so the cluster shares one set). Read-only.
        this._get(
            '/json/registry/cluster/node-groups',
            FlyingFishRouteCheckUserLogin,
            async(): Promise<ClusterNodeGroupsResponse> => {
                const view = aggregateClusterNodeGroups(HubRegistryService.getInstance().getClusterAggregate().entries());

                return {
                    statusCode: StatusCodes.OK,
                    groups: view.groups,
                    members: view.members,
                    shares: view.shares
                };
            },
            {
                description: 'The cluster-wide node groups + memberships + sharing rules aggregated from the gossip',
                responseBodySchema: SchemaClusterNodeGroupsResponse
            }
        );

        // Create or edit a node group (9.5.12.3). Writes this node's local table; the
        // change gossips cluster-wide on the next sync. cluster.manage gated.
        this._post(
            '/json/registry/cluster/node-group',
            requirePermission('cluster.manage'),
            async(_req, _res, data): Promise<ClusterNodeGroupSaveResponse> => {
                const id = await new ClusterNodeGroupManager().saveGroup({
                    id: data.body!.id,
                    name: data.body!.name,
                    description: data.body!.description,
                    color: data.body!.color
                });

                return {statusCode: StatusCodes.OK, id: id};
            },
            {
                description: 'Create or edit a cluster node group',
                bodySchema: SchemaClusterNodeGroupSaveRequest,
                responseBodySchema: SchemaClusterNodeGroupSaveResponse
            }
        );

        // Delete a node group and its memberships (9.5.12.3). cluster.manage gated.
        this._post(
            '/json/registry/cluster/node-group/delete',
            requirePermission('cluster.manage'),
            async(_req, _res, data): Promise<DefaultReturn> => {
                await new ClusterNodeGroupManager().deleteGroup(data.body!.id);

                return {statusCode: StatusCodes.OK};
            },
            {
                description: 'Delete a cluster node group',
                bodySchema: SchemaClusterNodeGroupDeleteRequest,
                responseBodySchema: SchemaDefaultReturn
            }
        );

        // Add or remove a node's membership in a group (9.5.12.3). cluster.manage gated.
        this._post(
            '/json/registry/cluster/node-group/membership',
            requirePermission('cluster.manage'),
            async(_req, _res, data): Promise<DefaultReturn> => {
                await new ClusterNodeGroupManager().setMembership(data.body!.nodeUid, data.body!.groupUuid, data.body!.member);

                return {statusCode: StatusCodes.OK};
            },
            {
                description: 'Add or remove a node from a cluster node group',
                bodySchema: SchemaClusterNodeGroupMembershipRequest,
                responseBodySchema: SchemaDefaultReturn
            }
        );

        // Grant (or change) a node-group sharing rule (9.5.12.4): node `nodeUid` shares
        // its `resourceType` resources with group `groupUuid` at `level`. cluster.manage
        // gated — this is the exposure boundary, not a per-user RBAC grant.
        this._post(
            '/json/registry/cluster/node-group/share',
            requirePermission('cluster.manage'),
            async(_req, _res, data): Promise<DefaultReturn> => {
                await new ClusterNodeGroupManager().setShare(
                    data.body!.nodeUid,
                    data.body!.groupUuid,
                    data.body!.resourceType,
                    data.body!.level
                );

                return {statusCode: StatusCodes.OK};
            },
            {
                description: 'Grant or change a cluster node group sharing rule',
                bodySchema: SchemaClusterNodeGroupShareRequest,
                responseBodySchema: SchemaDefaultReturn
            }
        );

        // Revoke a node-group sharing rule (9.5.12.4, back to default-deny). cluster.manage
        // gated.
        this._post(
            '/json/registry/cluster/node-group/share/delete',
            requirePermission('cluster.manage'),
            async(_req, _res, data): Promise<DefaultReturn> => {
                await new ClusterNodeGroupManager().removeShare(
                    data.body!.nodeUid,
                    data.body!.groupUuid,
                    data.body!.resourceType
                );

                return {statusCode: StatusCodes.OK};
            },
            {
                description: 'Revoke a cluster node group sharing rule',
                bodySchema: SchemaClusterNodeGroupShareDeleteRequest,
                responseBodySchema: SchemaDefaultReturn
            }
        );

        return super.getExpressRouter();
    }

}