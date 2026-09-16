import {Router} from 'express';
import {aggregateClusterDomains} from 'flyingfish_core';
import {
    ClusterDomainsResponse,
    ClusterLocalStateResponse,
    ClusterPeersResponse,
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
    SchemaClusterPeersResponse,
    SchemaClusterRoutesPublishRequest,
    SchemaClusterRoutesResponse,
    SchemaClusterStateResponse,
    SchemaDefaultReturn,
    SchemaRegistryInstanceRequest,
    SchemaRegistryPartsResponse,
    SchemaRegistryUiContributionsResponse,
    StatusCodes
} from 'flyingfish_schemas';
import {ClusterLocalStateProvider} from '../../Application/Hub/ClusterLocalStateProvider.js';
import {DefaultRoute} from '@stefanwerfling/figtree';
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
                HubRegistryService.getInstance().getClusterAggregate().set(data.body!.entries);

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
            FlyingFishRouteCheckUserLogin,
            async(): Promise<ClusterDomainsResponse> => {
                return {
                    statusCode: StatusCodes.OK,
                    list: aggregateClusterDomains(HubRegistryService.getInstance().getClusterAggregate().entries())
                };
            },
            {
                description: 'Which nodes manage each domain cluster-wide (HA / DNS failover view)',
                responseBodySchema: SchemaClusterDomainsResponse
            }
        );

        return super.getExpressRouter();
    }

}