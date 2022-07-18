import {Body, Get, JsonController, Post, Session} from 'routing-controllers';
import {NginxListen as NginxListenDB} from '../../inc/Db/MariaDb/Entity/NginxListen';
import {NginxStream as NginxStreamDB} from '../../inc/Db/MariaDb/Entity/NginxStream';
import {NginxHttp as NginxHttpDB} from '../../inc/Db/MariaDb/Entity/NginxHttp';
import {MariaDbHelper} from '../../inc/Db/MariaDb/MariaDbHelper';

/**
 * ListenData
 */
export type ListenData = {
    id: number;
    type: number;
    port: number;
    protocol: number;
    enable_ipv6: boolean;
    check_address: boolean;
    name: string;
    routeless: boolean;
    description: string;
    fix?: boolean;
};

/**
 * ListenResponse
 */
export type ListenResponse = {
    status: string;
    msg?: string;
    list: ListenData[];
};

/**
 * ListenSaveResponse
 */
export type ListenSaveResponse = {
    status: string;
    error?: string;
};

/**
 * ListenDeleteResponse
 */
export type ListenDeleteResponse = {
    status: string;
    error?: string;
};

/**
 * Listen
 */
@JsonController()
export class Listen {

    /**
     * looked ports
     * @protected
     */
    protected _lookedPorts = [53];

    /**
     * getListens
     * @param session
     */
    @Get('/json/listen/list')
    public async getListens(@Session() session: any): Promise<ListenResponse> {
        const list: ListenData[] = [];

        if ((session.user !== undefined) && session.user.isLogin) {
            const listenRepository = MariaDbHelper.getRepository(NginxListenDB);

            const listens = await listenRepository.find();

            if (listens) {
                for (const listen of listens) {
                    list.push({
                        id: listen.id,
                        type: listen.listen_type,
                        port: listen.listen_port,
                        protocol: listen.listen_protocol,
                        enable_ipv6: listen.enable_ipv6,
                        check_address: listen.enable_address_check,
                        name: listen.name,
                        routeless: listen.routeless,
                        description: listen.description,
                        fix: listen.fixlisten
                    });
                }
            }
        } else {
            return {
                status: 'error',
                msg: 'Please login first!',
                list
            };
        }

        return {
            status: 'ok',
            list
        };
    }

    /**
     * saveListen
     * @param session
     * @param request
     */
    @Post('/json/listen/save')
    public async saveListen(
        @Session() session: any,
        @Body() request: ListenData
    ): Promise<ListenSaveResponse> {
        if ((session.user !== undefined) && session.user.isLogin) {
            const listenRepository = MariaDbHelper.getRepository(NginxListenDB);

            let aListen: NginxListenDB|null = null;

            if (request.id !== 0) {
                const tListen = await listenRepository.findOne({
                    where: {
                        id: request.id
                    }
                });

                if (tListen) {
                    aListen = tListen;
                } else {
                    return {
                        status: 'error',
                        error: `entry not found by id: ${request.id}`
                    };
                }
            }

            if (aListen === null) {
                aListen = new NginxListenDB();
            }

            if (this._lookedPorts.indexOf(request.port) !== -1) {
                return {
                    status: 'error',
                    error: `port is already used for system: ${request.port}`
                };
            }

            if (aListen.listen_port !== request.port) {
                const count = await listenRepository.count({
                    where: {
                        listen_port: request.port
                    }
                });

                if (count > 0) {
                    return {
                        status: 'error',
                        error: `port is already used for listen: ${request.port}`
                    };
                }
            }

            aListen.name = request.name;
            aListen.listen_type = request.type;
            aListen.listen_port = request.port;
            aListen.listen_protocol = request.protocol;
            aListen.description = request.description;
            aListen.enable_ipv6 = request.enable_ipv6;
            aListen.enable_address_check = request.check_address;

            await MariaDbHelper.getConnection().manager.save(aListen);

            return {
                status: 'ok'
            };
        }

        return {
            status: 'error',
            error: 'user not login!'
        };
    }

    /**
     * deleteListen
     * @param session
     * @param request
     */
    @Post('/json/listen/delete')
    public async deleteListen(
        @Session() session: any,
        @Body() request: ListenData
    ): Promise<ListenDeleteResponse> {
        if ((session.user !== undefined) && session.user.isLogin) {
            const listenRepository = MariaDbHelper.getRepository(NginxListenDB);
            const streamRepository = MariaDbHelper.getRepository(NginxStreamDB);
            const httpRepository = MariaDbHelper.getRepository(NginxHttpDB);

            const tListen = await listenRepository.findOne({
                where: {
                    id: request.id
                }
            });

            if (tListen) {
                if (tListen.fixlisten) {
                    return {
                        status: 'error',
                        error: 'This Listen can not deleted!'
                    };
                }

                const countStream = await streamRepository.count({
                    where: {
                        listen_id: tListen.id
                    }
                });

                const countHttp = await httpRepository.count({
                    where: {
                        listen_id: tListen.id
                    }
                });

                if ((countStream > 0) || (countHttp > 0)) {
                    return {
                        status: 'error',
                        error: 'Listen can not deleted, please remove all routes!'
                    };
                }

                const resulte = await listenRepository.delete({
                    id: tListen.id
                });

                if (resulte) {
                    return {
                        status: 'ok'
                    };
                }

                return {
                    status: 'error',
                    error: 'Listen can not deleted, db error by operation.'
                };
            }

            return {
                status: 'error',
                error: 'Listen not found by Id!'
            };
        }

        return {
            status: 'error',
            error: 'user not login!'
        };
    }

}