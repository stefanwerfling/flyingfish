import {Router} from 'express';
import {DefaultReturn, DefaultRoute, Logger, StatusCodes} from 'flyingfish_core';
import {ExtractSchemaResultType, Vts} from 'vts';
import {DBHelper} from '../../inc/Db/MariaDb/DBHelper.js';
import {NginxHttp as NginxHttpDB} from '../../inc/Db/MariaDb/Entity/NginxHttp.js';
import {NginxListen as NginxListenDB} from '../../inc/Db/MariaDb/Entity/NginxListen.js';
import {NginxStream as NginxStreamDB} from '../../inc/Db/MariaDb/Entity/NginxStream.js';

/**
 * ListenData
 */
export const SchemaListenData = Vts.object({
    id: Vts.number(),
    type: Vts.number(),
    port: Vts.number(),
    protocol: Vts.number(),
    enable_ipv6: Vts.boolean(),
    check_address: Vts.boolean(),
    check_address_type: Vts.number(),
    name: Vts.string(),
    routeless: Vts.boolean(),
    description: Vts.string(),
    fix: Vts.optional(Vts.boolean()),
    disable: Vts.boolean()
});

export type ListenData = ExtractSchemaResultType<typeof SchemaListenData>;

/**
 * ListenResponse
 */
export type ListenResponse = DefaultReturn & {
    list: ListenData[];
};

/**
 * ListenSaveResponse
 */
export type ListenSaveResponse = DefaultReturn;

/**
 * ListenDelete
 */
export const SchemaListenDelete = Vts.object({
    id: Vts.number()
});

export type ListenDelete = ExtractSchemaResultType<typeof SchemaListenDelete>;

/**
 * ListenDeleteResponse
 */
export type ListenDeleteResponse = DefaultReturn;

/**
 * Listen
 */
export class Listen extends DefaultRoute {

    /**
     * constructor
     */
    public constructor() {
        super();
    }

    /**
     * looked ports
     * @protected
     */
    protected _lookedPorts = [53];

    /**
     * getListens
     */
    public async getListens(): Promise<ListenResponse> {
        const list: ListenData[] = [];
        const listenRepository = DBHelper.getRepository(NginxListenDB);

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
                    check_address_type: listen.address_check_type,
                    name: listen.name,
                    routeless: listen.routeless,
                    description: listen.description,
                    fix: listen.fixlisten,
                    disable: listen.disable
                });
            }
        }

        return {
            statusCode: StatusCodes.OK,
            list: list
        };
    }

    /**
     * saveListen
     * @param data
     */
    public async saveListen(data: ListenData): Promise<ListenSaveResponse> {
        const listenRepository = DBHelper.getRepository(NginxListenDB);

        let aListen: NginxListenDB|null = null;

        if (data.id !== 0) {
            const tListen = await listenRepository.findOne({
                where: {
                    id: data.id
                }
            });

            if (tListen) {
                aListen = tListen;

                if (aListen) {
                    Logger.getLogger().silly(`Listen::saveListen: Found listen by id: ${aListen.id}`);
                } else {
                    Logger.getLogger().error(`Listen::saveListen: Not found listen by id: ${data.id}`);
                }
            } else {
                return {
                    statusCode: StatusCodes.INTERNAL_ERROR,
                    msg: `entry not found by id: ${data.id}`
                };
            }
        }

        if (aListen === null) {
            aListen = new NginxListenDB();

            if (this._lookedPorts.indexOf(data.port) !== -1) {
                return {
                    statusCode: StatusCodes.INTERNAL_ERROR,
                    msg: `port is already used for system: ${data.port}`
                };
            }
        }

        if (aListen.listen_port !== data.port) {
            Logger.getLogger().silly(`Listen::saveListen: Port diff by: DB Port: ${aListen.listen_port} and request: ${data.port}`);

            const count = await listenRepository.count({
                where: {
                    listen_port: data.port
                }
            });

            if (count > 0) {
                return {
                    statusCode: StatusCodes.INTERNAL_ERROR,
                    msg: `port is already used for listen: ${data.port}`
                };
            }
        }

        aListen.name = data.name;
        aListen.listen_type = data.type;
        aListen.listen_port = data.port;
        aListen.listen_protocol = data.protocol;
        aListen.description = data.description;
        aListen.enable_ipv6 = data.enable_ipv6;
        aListen.enable_address_check = data.check_address;
        aListen.address_check_type = data.check_address_type;
        aListen.disable = data.disable;

        await DBHelper.getDataSource().manager.save(aListen);

        return {
            statusCode: StatusCodes.OK
        };
    }

    /**
     * deleteListen
     * @param data
     */
    public async deleteListen(data: ListenDelete): Promise<ListenDeleteResponse> {
        const listenRepository = DBHelper.getRepository(NginxListenDB);
        const streamRepository = DBHelper.getRepository(NginxStreamDB);
        const httpRepository = DBHelper.getRepository(NginxHttpDB);

        const tListen = await listenRepository.findOne({
            where: {
                id: data.id
            }
        });

        if (tListen) {
            if (tListen.fixlisten) {
                return {
                    statusCode: StatusCodes.INTERNAL_ERROR,
                    msg: 'This Listen can not deleted!'
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
                    statusCode: StatusCodes.INTERNAL_ERROR,
                    msg: 'Listen can not deleted, please remove all routes!'
                };
            }

            const result = await listenRepository.delete({
                id: tListen.id
            });

            if (result) {
                return {
                    statusCode: StatusCodes.OK
                };
            }

            return {
                statusCode: StatusCodes.INTERNAL_ERROR,
                msg: 'Listen can not deleted, db error by operation.'
            };
        }

        return {
            statusCode: StatusCodes.INTERNAL_ERROR,
            msg: 'Listen not found by Id!'
        };
    }

    /**
     * getExpressRouter
     */
    public getExpressRouter(): Router {
        this._routes.get(
            '/json/listen/list',
            async(req, res) => {
                if (this.isUserLogin(req, res)) {
                    res.status(200).json(await this.getListens());
                }
            }
        );

        this._routes.post(
            '/json/listen/save',
            async(req, res) => {
                if (this.isUserLogin(req, res)) {
                    if (this.isSchemaValidate(SchemaListenData, req.body, res)) {
                        res.status(200).json(await this.saveListen(req.body));
                    }
                }
            }
        );

        this._routes.post(
            '/json/listen/delete',
            async(req, res) => {
                if (this.isUserLogin(req, res)) {
                    if (this.isSchemaValidate(SchemaListenDelete, req.body, res)) {
                        res.status(200).json(await this.deleteListen(req.body));
                    }
                }
            }
        );

        return super.getExpressRouter();
    }

}