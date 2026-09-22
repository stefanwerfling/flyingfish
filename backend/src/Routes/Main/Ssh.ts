import {Router} from 'express';
import {DefaultRoute} from '@stefanwerfling/figtree';
import {
    SchemaSshConfigChangesRequest,
    SchemaSshConfigChangesResponse,
    SchemaSshPortListResponse,
    SshConfigChangesResponse,
    SshPortListResponse,
    StatusCodes
} from 'flyingfish_schemas';
import {FlyingFishRouteCheckServiceOrUserLogin} from '../../Application/Server/FlyingFishRouteCheckServiceOrUserLogin.js';
import {FlyingFishRouteCheckUserLogin} from '../../Application/Server/FlyingFishRouteCheckUserLogin.js';
import {SshConfigChangeLog} from '../../inc/Ssh/SshConfigChangeLog.js';
import {List} from './Ssh/List.js';

/**
 * Ssh
 */
export class Ssh extends DefaultRoute {

    /**
     * getExpressRouter
     */
    public override getExpressRouter(): Router {
        this._get(
            '/json/ssh/list',
            FlyingFishRouteCheckUserLogin,
            async(): Promise<SshPortListResponse> => {
                return List.getList();
            },
            {
                description: 'Read the SSH port list',
                responseBodySchema: SchemaSshPortListResponse
            }
        );

        // The ssh server part polls this for SSH config changes (saved/deleted)
        // since its last processed sequence, so long-lived tunnels are reloaded
        // or closed. Replaces the former SSH_CONFIG_CHANGED Redis channel; guarded
        // by the registry secret (service) or a user login.
        this._post(
            '/json/ssh/config-changes',
            FlyingFishRouteCheckServiceOrUserLogin,
            async(_req, _res, data): Promise<SshConfigChangesResponse> => {
                const result = SshConfigChangeLog.since(data.body!.since);

                return {
                    statusCode: StatusCodes.OK,
                    changes: result.changes,
                    lastSeq: result.lastSeq,
                    reset: result.reset
                };
            },
            {
                description: 'Poll SSH config changes since a sequence id (ssh server part)',
                bodySchema: SchemaSshConfigChangesRequest,
                responseBodySchema: SchemaSshConfigChangesResponse
            }
        );

        return super.getExpressRouter();
    }

}
