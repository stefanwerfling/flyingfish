import {Response} from 'express';
import {Get, HeaderParam, JsonController, Res} from 'routing-controllers-extended';
import {DBHelper} from '../../inc/Db/DBHelper.js';
import {IpBlacklist as IpBlacklistDB} from '../../inc/Db/MariaDb/Entity/IpBlacklist.js';
import {IpWhitelist as IpWhitelistDB} from '../../inc/Db/MariaDb/Entity/IpWhitelist.js';
import {ListenAddressCheckType, NginxListen as NginxListenDB} from '../../inc/Db/MariaDb/Entity/NginxListen.js';
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

        const listenId = parseInt(listen_id, 10) || 0;

        if (realip_remote_addr) {
            // global check (blacklist) --------------------------------------------------------------------------------
            if ((listenId === 0) && await this._globalCheckBlacklist(realip_remote_addr)) {
                response.status(200);
                return true;
            } else if ((listenId !== 0) && await this._listCheck(listenId, realip_remote_addr)) {
                // listen check (blacklist & whitelist) ----------------------------------------------------------------
                response.status(200);
                return true;
            }
        } else {
            Logger.getLogger().error('AddressAccess::access: realip_remote_addr is empty!');
        }

        response.status(401);

        return false;
    }

    /**
     * _globalCheckBlacklist
     * @param realip_remote_addr
     * @protected
     */
    protected async _globalCheckBlacklist(realip_remote_addr: string): Promise<boolean> {
        const ipBlacklistRepository = DBHelper.getRepository(IpBlacklistDB);
        const address = await ipBlacklistRepository.findOne({
            where: {
                ip: realip_remote_addr,
                disable: false
            }
        });

        if (!address) {
            Logger.getLogger().info(`AddressAccess::_globalCheckBlacklist: Address(${realip_remote_addr}) not found in blacklist.`);

            return true;
        }

        // update and not await
        AddressAccess._updateBlacklistBlock(address.id, address.count_block + 1).then();

        Logger.getLogger().info(`AddressAccess::_globalCheckBlacklist: Address(${realip_remote_addr}) found in blacklist!`);

        return false;
    }

    /**
     * _listCheck
     * @param listenId
     * @param realip_remote_addr
     * @protected
     */
    protected async _listCheck(listenId: number, realip_remote_addr: string): Promise<boolean> {
        const listenRepository = DBHelper.getRepository(NginxListenDB);

        const listen = await listenRepository.findOne({
            where: {
                id: listenId
            }
        });

        if (listen) {
            if (listen.enable_address_check) {
                Logger.getLogger().silly('AddressAccess::_listCheck: Listen address check is enable ...');

                switch (listen.address_check_type) {
                    case ListenAddressCheckType.white:
                        return this._listCheckWhiteList(listen.id, realip_remote_addr);

                    default:
                        return this._listCheckBlackList(listen.id, realip_remote_addr);
                }
            } else {
                return true;
            }
        } else {
            Logger.getLogger().warn(`AddressAccess::_listCheck: Listen(${listenId}) not found!`);
        }

        return false;
    }

    /**
     * _listCheckBlackList
     * @param listenId
     * @param realip_remote_addr
     * @protected
     */
    protected async _listCheckBlackList(listenId: number, realip_remote_addr: string): Promise<boolean> {
        const ipBlacklistRepository = DBHelper.getRepository(IpBlacklistDB);

        const address = await ipBlacklistRepository.findOne({
            where: {
                ip: realip_remote_addr,
                disable: false
            }
        });

        if (!address) {
            Logger.getLogger().info(`AddressAccess::_listCheckBlackList: Address(${realip_remote_addr}) not found in blacklist.`);

            return true;
        }

        Logger.getLogger().info(`AddressAccess::_listCheckBlackList: Address(${realip_remote_addr}) found in blacklist!`);

        // update and not await
        AddressAccess._updateBlacklistBlock(address.id, address.count_block + 1).then();

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

    /**
     * _listCheckWhiteList
     * @param listenId
     * @param realip_remote_addr
     * @protected
     */
    protected async _listCheckWhiteList(listenId: number, realip_remote_addr: string): Promise<boolean> {
        const ipWhitelistRepository = DBHelper.getRepository(IpWhitelistDB);

        const address = await ipWhitelistRepository.findOne({
            where: {
                ip: realip_remote_addr,
                disable: false
            }
        });

        if (address) {
            Logger.getLogger().info(`AddressAccess::_listCheckWhiteList: Address(${realip_remote_addr}) found in whitelist!`);

            return true;
        }

        Logger.getLogger().info(`AddressAccess::_listCheckWhiteList: Address(${realip_remote_addr}) not found in whitelist.`);

        return false;
    }

}