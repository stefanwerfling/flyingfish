import {Router} from 'express';
import {
    DefaultReturn,
    RegistryPartsResponse,
    RegistryUiContributionsResponse,
    SchemaCapabilityManifest,
    SchemaDefaultReturn,
    SchemaRegistryInstanceRequest,
    SchemaRegistryPartsResponse,
    SchemaRegistryUiContributionsResponse,
    StatusCodes
} from 'flyingfish_schemas';
import {DefaultRoute} from 'figtree';
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

        return super.getExpressRouter();
    }

}