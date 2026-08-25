import {NginxStreamServiceDB, NginxUpstreamServiceDB} from 'flyingfish_core';
import {DefaultReturn, RouteStreamDelete, SshConfigChangeAction, StatusCodes} from 'flyingfish_schemas';
import {SshConfigChannel} from '../../../../inc/Ssh/SshConfigChannel.js';
import {Save} from './Save.js';

/**
 * DeleteStream
 */
export class Delete {

    /**
     * deleteStreamRoute
     * @param data
     */
    public static async deleteStreamRoute(data: RouteStreamDelete): Promise<DefaultReturn> {
        if (data.id === 0) {
            return {
                statusCode: StatusCodes.INTERNAL_ERROR,
                msg: 'id is null!'
            };
        }

        const stream = await NginxStreamServiceDB.getInstance().findOne(data.id);

        if (stream) {
            if (stream.isdefault) {
                return {
                    statusCode: StatusCodes.INTERNAL_ERROR,
                    msg: 'Stream route can not delete, this is a default route!'
                };
            }

            if (stream.sshport_id > 0) {
                if (!await Save.removeOldSshPort(stream.sshport_id)) {
                    return {
                        statusCode: StatusCodes.INTERNAL_ERROR,
                        msg: 'SSH Server is currently in use, please remove Ssh port outgoning link!'
                    };
                }

                // Notify consumers (ssh server) that the SSH port was removed, so a
                // long-lived tunnel can be closed. Best-effort IPC (no-op without Redis).
                await SshConfigChannel.publish(stream.sshport_id, SshConfigChangeAction.deleted);
            }

            // delete upstreams ------------------------------------------------------------------------------------

            await NginxUpstreamServiceDB.getInstance().removeAllStreams(stream.id);

            // delete stream ---------------------------------------------------------------------------------------

            const result = await NginxStreamServiceDB.getInstance().remove(stream.id);

            if (result) {
                return {
                    statusCode: StatusCodes.OK
                };
            }

            return {
                statusCode: StatusCodes.INTERNAL_ERROR,
                msg: `stream route can not delete by id: ${data.id}`
            };
        }

        return {
            statusCode: StatusCodes.INTERNAL_ERROR,
            msg: `stream route not found by id: ${data.id}`
        };
    }

}