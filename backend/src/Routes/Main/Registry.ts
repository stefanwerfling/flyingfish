import {Router} from 'express';
import {DefaultRoute} from 'flyingfish_core';
import {SchemaCapabilityManifest, SchemaRegistryInstanceRequest, StatusCodes} from 'flyingfish_schemas';
import {HubRegistryService} from '../../Application/Hub/HubRegistryService.js';

/**
 * Registry
 *
 * HTTP surface of the in-memory Hub registry (v2 modular architecture, DNS
 * pilot). Parts register/heartbeat/deregister; the frontend reads the aggregated
 * UI contributions and the parts list.
 *
 * NOTE: all endpoints are user-login guarded for now. The part-facing
 * register/heartbeat/bye endpoints will move to PKI service-cert auth over the
 * mTLS-WSS transport in a later pilot stage.
 */
export class Registry extends DefaultRoute {

    /**
     * getExpressRouter
     */
    public getExpressRouter(): Router {
        this._post(
            '/json/registry/register',
            async(req, res) => {
                if (this.isUserLogin(req, res)) {
                    if (this.isSchemaValidate(SchemaCapabilityManifest, req.body, res)) {
                        HubRegistryService.getInstance().getRegistry().register(req.body);

                        res.status(200).json({statusCode: StatusCodes.OK});
                    }
                }
            }
        );

        this._post(
            '/json/registry/heartbeat',
            async(req, res) => {
                if (this.isUserLogin(req, res)) {
                    if (this.isSchemaValidate(SchemaRegistryInstanceRequest, req.body, res)) {
                        const known = HubRegistryService.getInstance().getRegistry().heartbeat(req.body.instanceId);

                        res.status(200).json({
                            statusCode: known ? StatusCodes.OK : StatusCodes.INTERNAL_ERROR
                        });
                    }
                }
            }
        );

        this._post(
            '/json/registry/bye',
            async(req, res) => {
                if (this.isUserLogin(req, res)) {
                    if (this.isSchemaValidate(SchemaRegistryInstanceRequest, req.body, res)) {
                        HubRegistryService.getInstance().getRegistry().bye(req.body.instanceId);

                        res.status(200).json({statusCode: StatusCodes.OK});
                    }
                }
            }
        );

        this._get(
            '/json/registry/parts',
            async(req, res) => {
                if (this.isUserLogin(req, res)) {
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

                    res.status(200).json({statusCode: StatusCodes.OK, list: list});
                }
            }
        );

        this._get(
            '/json/registry/ui-contributions',
            async(req, res) => {
                if (this.isUserLogin(req, res)) {
                    const ui = HubRegistryService.getInstance().getRegistry().uiContributions();

                    res.status(200).json({
                        statusCode: StatusCodes.OK,
                        menu: ui.menu,
                        pages: ui.pages,
                        widgets: ui.widgets
                    });
                }
            }
        );

        return super.getExpressRouter();
    }

}