import {Response} from 'express';
import {Get, HeaderParam, JsonController, Res} from 'routing-controllers-extended';
import {DBHelper} from '../../inc/Db/DBHelper.js';
import {IpBlacklist as IpBlacklistDB} from '../../inc/Db/MariaDb/Entity/IpBlacklist.js';
import {NginxListen as NginxListenDB} from '../../inc/Db/MariaDb/Entity/NginxListen.js';
import {Logger} from '../../inc/Logger/Logger.js';
import {DateHelper} from '../../inc/Utils/DateHelper.js';

/**
 * AddressAccess
 */
@JsonController()
export class AddressAccess {

    /**
     * access
     * @param response
     * @param listen_id
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
        Logger.getLogger().info(`AddressAccess::access: realip_remote_addr: ${realip_remote_addr} remote_addr: ${remote_addr} type: ${type}`);

        const listenRepository = DBHelper.getRepository(NginxListenDB);
        const ipBlacklistRepository = DBHelper.getRepository(IpBlacklistDB);
        const listenId = parseInt(listen_id, 10) || 0;

        if (listenId === 0) {
            if (realip_remote_addr) {
                const address = await ipBlacklistRepository.findOne({
                    where: {
                        ip: realip_remote_addr,
                        disable: false
                    }
                });

                if (!address) {
                    Logger.getLogger().info(`AddressAccess::access: Address(${realip_remote_addr}) not found in blacklist.`);
                    response.status(200);

                    return true;
                }

                // update and not await
                AddressAccess._updateBlacklistBlock(address.id, address.count_block + 1).then();

                Logger.getLogger().info(`AddressAccess::access: Address(${realip_remote_addr}) found in blacklist!`);
            }
        } else {
            const listen = await listenRepository.findOne({
                where: {
                    id: listenId
                }
            });

            if (listen) {
                if (listen.enable_address_check) {
                    Logger.getLogger().silly('AddressAccess::access: Listen address check is enable ...');

                    if (realip_remote_addr) {
                        const address = await ipBlacklistRepository.findOne({
                            where: {
                                ip: realip_remote_addr,
                                disable: false
                            }
                        });

                        if (!address) {
                            Logger.getLogger().info(`AddressAccess::access: Address(${realip_remote_addr}) not found in blacklist.`);
                            response.status(200);

                            return true;
                        }

                        Logger.getLogger().info(`AddressAccess::access: Address(${realip_remote_addr}) found in blacklist!`);

                        // update and not await
                        AddressAccess._updateBlacklistBlock(address.id, address.count_block + 1).then();
                    }
                } else {
                    response.status(200);

                    return true;
                }
            } else {
                Logger.getLogger().warn(`AddressAccess::access: Listen(${listen_id}) not found!`);
            }
        }

        response.status(401);

        return false;
    }

    /**
     * _updateBlacklistBlock
     * @param ipBlacklistId
     * @param newBlockCount
     * @protected
     */
    protected static async _updateBlacklistBlock(ipBlacklistId: number, newBlockCount: number): Promise<void> {
        const ipBlacklistRepository = DBHelper.getRepository(IpBlacklistDB);

        await ipBlacklistRepository
        .createQueryBuilder()
        .update()
        .set({
            last_block: DateHelper.getCurrentDbTime(),
            count_block: newBlockCount
        })
        .where('id = :id', {id: ipBlacklistId})
        .execute();
    }

}