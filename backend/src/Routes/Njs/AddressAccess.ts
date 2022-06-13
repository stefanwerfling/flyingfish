import {Response} from 'express';
import {Get, HeaderParam, JsonController, Res} from 'routing-controllers';
import {IpBlacklist as IpBlacklistDB} from '../../inc/Db/MariaDb/Entity/IpBlacklist';
import {NginxListen as NginxListenDB} from '../../inc/Db/MariaDb/Entity/NginxListen';
import {MariaDbHelper} from '../../inc/Db/MariaDb/MariaDbHelper';
import {Logger} from '../../inc/Logger/Logger';

/**
 * AddressAccess
 */
@JsonController()
export class AddressAccess {

    /**
     * access
     * @param realip_remote_addr
     * @param remote_addr
     * @param type
     */
    @Get('/njs/address_access')
    public async access(
        @Res() response: Response,
        @HeaderParam('listen_id') listen_id: string,
        @HeaderParam('realip_remote_addr') realip_remote_addr: string,
        @HeaderParam('remote_addr') remote_addr: string,
        @HeaderParam('type') type: string
    ): Promise<boolean> {
        Logger.getLogger().info(`realip_remote_addr: ${realip_remote_addr} remote_addr: ${remote_addr} type: ${type}`);

        const listenRepository = MariaDbHelper.getRepository(NginxListenDB);
        const ipBlacklistRepository = MariaDbHelper.getRepository(IpBlacklistDB);
        const locationId = Number(listen_id);

        if (locationId === 0) {
            if (realip_remote_addr) {
                const address = await ipBlacklistRepository.findOne({
                    where: {
                        ip: realip_remote_addr
                    }
                });

                if (!address) {
                    Logger.getLogger().info(`Address(${realip_remote_addr}) not found in blacklist.`);
                    response.status(200);
                    return true;
                }

                Logger.getLogger().info(`Address(${realip_remote_addr}) found in blacklist!`);
            }
        } else {
            const listen = await listenRepository.findOne({
                where: {
                    id: locationId
                }
            });

            if (listen) {
                if (listen.enable_address_check) {
                    Logger.getLogger().info('Listen address check is enable ...');

                    if (realip_remote_addr) {
                        const address = await ipBlacklistRepository.findOne({
                            where: {
                                ip: realip_remote_addr
                            }
                        });

                        if (!address) {
                            Logger.getLogger().info(`Address(${realip_remote_addr}) not found in blacklist.`);
                            response.status(200);
                            return true;
                        }

                        Logger.getLogger().info(`Address(${realip_remote_addr}) found in blacklist!`);
                    }
                } else {
                    response.status(200);
                    return true;
                }
            } else {
                Logger.getLogger().warn(`Listen(${listen_id}) nout found!`);
            }
        }

        response.status(401);
        return false;
    }

}