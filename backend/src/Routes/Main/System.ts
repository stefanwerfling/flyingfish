import {Router} from 'express';
import {DefaultRoute} from '@stefanwerfling/figtree';
import {SystemConfigServiceDB} from 'flyingfish_core';
import {
    DefaultReturn,
    SchemaDefaultReturn,
    SchemaSystemConfigResponse,
    SchemaSystemConfigSaveRequest,
    StatusCodes,
    SystemConfigResponse
} from 'flyingfish_schemas';
import {FlyingFishRouteCheckUserLogin} from '../../Application/Server/FlyingFishRouteCheckUserLogin.js';

/**
 * System — the node's operating mode + target settings (Attach/Router epic). Reads/writes
 * the node-local `system_config` singleton. Downstream services (DNS auto-records,
 * HTTP-redirect host, self-referential nginx targets) key off this.
 */
export class System extends DefaultRoute {

    /**
     * getExpressRouter
     */
    public override getExpressRouter(): Router {
        this._get(
            '/json/system/config',
            FlyingFishRouteCheckUserLogin,
            async(): Promise<SystemConfigResponse> => {
                const config = await SystemConfigServiceDB.getInstance().getOrCreate();

                return {
                    statusCode: StatusCodes.OK,
                    config: {
                        mode: config.mode,
                        target_ip: config.target_ip,
                        attach_interface: config.attach_interface
                    }
                };
            },
            {
                description: 'Read the node system config (operating mode + targets)',
                responseBodySchema: SchemaSystemConfigResponse
            }
        );

        this._post(
            '/json/system/config/save',
            FlyingFishRouteCheckUserLogin,
            async(_req, _res, data): Promise<DefaultReturn> => {
                const body = data.body!;
                const service = SystemConfigServiceDB.getInstance();
                const config = await service.getOrCreate();

                config.mode = body.mode === 'router' ? 'router' : 'attach';

                if (body.target_ip !== undefined) {
                    config.target_ip = body.target_ip;
                }

                if (body.attach_interface !== undefined) {
                    config.attach_interface = body.attach_interface;
                }

                await service.save(config);

                return {statusCode: StatusCodes.OK};
            },
            {
                description: 'Save the node system config (operating mode + targets)',
                bodySchema: SchemaSystemConfigSaveRequest,
                responseBodySchema: SchemaDefaultReturn
            }
        );

        return super.getExpressRouter();
    }

}
