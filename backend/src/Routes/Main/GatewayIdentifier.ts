import {Router} from 'express';
import {DefaultReturn, DefaultRoute, StatusCodes} from 'flyingfish_core';
import {ExtractSchemaResultType, Vts} from 'vts';
import {GatewayIdentifier as GatewayIdentifierDB} from '../../inc/Db/MariaDb/Entity/GatewayIdentifier.js';
import {DBHelper} from '../../inc/Db/MariaDb/DBHelper.js';

/**
 * GatewayIdentifierEntry
 */
export const SchemaGatewayIdentifierEntry = Vts.object({
    id: Vts.number(),
    networkname: Vts.string(),
    mac_address: Vts.string(),
    address: Vts.string(),
    color: Vts.string()
});

export type GatewayIdentifierEntry = ExtractSchemaResultType<typeof SchemaGatewayIdentifierEntry>;

/**
 * GatewayIdentifierListResponse
 */
export type GatewayIdentifierListResponse = DefaultReturn & {
    data?: GatewayIdentifierEntry[];
};

/**
 * GatewayIdentifierSaveResponse
 */
export type GatewayIdentifierSaveResponse = DefaultReturn;

/**
 * GatewayIdentifierDelete
 */
export const SchemaGatewayIdentifierDelete = Vts.object({
    id: Vts.number()
});

export type GatewayIdentifierDelete = ExtractSchemaResultType<typeof SchemaGatewayIdentifierDelete>;

/**
 * GatewayIdentifierDeleteResponse
 */
export type GatewayIdentifierDeleteResponse = DefaultReturn;

/**
 * GatewayIdentifier
 */
export class GatewayIdentifier extends DefaultRoute {

    /**
     * constructor
     */
    public constructor() {
        super();
    }

    /**
     * getList
     */
    public async getList(): Promise<GatewayIdentifierListResponse> {
        const giRepository = DBHelper.getRepository(GatewayIdentifierDB);

        const list: GatewayIdentifierEntry[] = [];
        const entries = await giRepository.find();

        for (const entry of entries) {
            list.push({
                id: entry.id,
                networkname: entry.networkname,
                mac_address: entry.mac_address,
                address: entry.address,
                color: entry.color
            });
        }

        return {
            statusCode: StatusCodes.OK,
            data: list
        };
    }

    /**
     * save
     * @param data
     */
    public async save(data: GatewayIdentifierEntry): Promise<GatewayIdentifierSaveResponse> {
        const giRepository = DBHelper.getRepository(GatewayIdentifierDB);

        let aGateway: GatewayIdentifierDB|null = null;

        if (data.id !== 0) {
            const tgi = await giRepository.findOne({
                where: {
                    id: data.id
                }
            });

            if (tgi) {
                aGateway = tgi;
            }
        }

        if (aGateway === null) {
            aGateway = new GatewayIdentifierDB();
        }

        aGateway.mac_address = data.mac_address;
        aGateway.address = data.address;
        aGateway.networkname = data.networkname;
        aGateway.color = data.color;

        const result = await DBHelper.getDataSource().manager.save(aGateway);

        if (result) {
            return {
                statusCode: StatusCodes.OK
            };
        }

        return {
            statusCode: StatusCodes.INTERNAL_ERROR
        };
    }

    /**
     * delete
     * @param data
     */
    public async delete(data: GatewayIdentifierDelete): Promise<GatewayIdentifierDeleteResponse> {
        const giRepository = DBHelper.getRepository(GatewayIdentifierDB);

        const result = await giRepository.delete({
            id: data.id
        });

        if (result) {
            return {
                statusCode: StatusCodes.OK
            };
        }

        return {
            statusCode: StatusCodes.INTERNAL_ERROR
        };
    }

    /**
     * getExpressRouter
     */
    public getExpressRouter(): Router {
        this._routes.get(
            '/json/gatewayidentifier/list',
            async(req, res) => {
                if (this.isUserLogin(req, res)) {
                    res.status(200).json(await this.getList());
                }
            }
        );

        this._routes.post(
            '/json/gatewayidentifier/save',
            async(req, res) => {
                if (this.isUserLogin(req, res)) {
                    if (this.isSchemaValidate(SchemaGatewayIdentifierEntry, req.body, res)) {
                        res.status(200).json(await this.save(req.body));
                    }
                }
            }
        );

        this._routes.post(
            '/json/gatewayidentifier/delete',
            async(req, res) => {
                if (this.isUserLogin(req, res)) {
                    if (this.isSchemaValidate(SchemaGatewayIdentifierDelete, req.body, res)) {
                        res.status(200).json(await this.delete(req.body));
                    }
                }
            }
        );

        return super.getExpressRouter();
    }

}