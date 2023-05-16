import {Router} from 'express';
import {DefaultReturn, DefaultRoute, StatusCodes} from 'flyingfish_core';
import {ExtractSchemaResultType, Vts} from 'vts';
import {SchemaUpnpNatCacheMapping, UpnpNatCache} from '../../inc/Cache/UpnpNatCache.js';
import {DBHelper} from '../../inc/Db/MariaDb/DBHelper.js';
import {NatPort as NatPortDB} from '../../inc/Db/MariaDb/Entity/NatPort.js';
import {HimHIP} from '../../inc/HimHIP/HimHIP.js';

/**
 * UpnpNatDevice
 */
export const SchemaUpnpNatDevice = Vts.object({
    deviceId: Vts.string(),
    mappings: Vts.array(SchemaUpnpNatCacheMapping)
});

export type UpnpNatDevice = ExtractSchemaResultType<typeof SchemaUpnpNatDevice>;

/**
 * UpnpNatOpenPortResponse
 */
export type UpnpNatOpenPortResponse = DefaultReturn & {
    data: UpnpNatDevice[];
};

/**
 * UpnpNatPort
 */
export const SchemaUpnpNatPort = Vts.object({
    id: Vts.number(),
    postion: Vts.number(),
    public_port: Vts.number(),
    gateway_identifier_id: Vts.number(),
    gateway_address: Vts.string(),
    private_port: Vts.number(),
    client_address: Vts.string(),
    use_himhip_host_address: Vts.boolean(),
    ttl: Vts.number(),
    protocol: Vts.string(),
    last_ttl_update: Vts.number(),
    listen_id: Vts.number(),
    description: Vts.string(),
    last_status: Vts.number(),
    last_update: Vts.number()
});

export type UpnpNatPort = ExtractSchemaResultType<typeof SchemaUpnpNatPort>;

/**
 * UpnpNatResponse
 */
export type UpnpNatResponse = DefaultReturn & {
    data: UpnpNatPort[];
};

/**
 * UpnpNatGatwayInfo
 */
export const SchemaUpnpNatGatwayInfo = Vts.object({
    gatway_address: Vts.string(),
    gatwaymac_address: Vts.string(),
    client_address: Vts.string()
});

export type UpnpNatGatwayInfo = ExtractSchemaResultType<typeof SchemaUpnpNatGatwayInfo>;

/**
 * UpnpNatCurrentGatwayInfoResponse
 */
export type UpnpNatCurrentGatwayInfoResponse = DefaultReturn & {
    data?: UpnpNatGatwayInfo;
};

/**
 * UpnpNatSaveRequest
 */
export const SchemaUpnpNatSaveRequest = SchemaUpnpNatPort;
export type UpnpNatSaveRequest = UpnpNatPort;

/**
 * UpnpNatSaveResponse
 */
export type UpnpNatSaveResponse = DefaultReturn;

/**
 * UpnpNatDeleteRequest
 */
export const SchemaUpnpNatDeleteRequest = Vts.object({
    id: Vts.number()
});

export type UpnpNatDeleteRequest = ExtractSchemaResultType<typeof SchemaUpnpNatDeleteRequest>;

/**
 * UpnpNatDeleteResponse
 */
export type UpnpNatDeleteResponse = DefaultReturn;

/**
 * UpnpNat
 */
export class UpnpNat extends DefaultRoute {

    /**
     * constructor
     */
    public constructor() {
        super();
    }

    /**
     * getUserInfo
     */
    public async getOpenPortList(): Promise<UpnpNatOpenPortResponse> {
        const data: UpnpNatDevice[] = [];
        const lists = UpnpNatCache.getInstance().getLists();

        if (lists) {
            lists.forEach((value, key) => {
                data.push({
                    deviceId: key,
                    mappings: value
                });
            });
        }

        return {
            statusCode: StatusCodes.OK,
            data: data
        };
    }

    /**
     * getList
     */
    public async getList(): Promise<UpnpNatResponse> {
        const natportRepository = DBHelper.getRepository(NatPortDB);

        const list: UpnpNatPort[] = [];
        const entries = await natportRepository.find();

        for (const entry of entries) {
            list.push({
                id: entry.id,
                postion: entry.postion,
                public_port: entry.public_port,
                gateway_identifier_id: entry.gateway_identifier_id,
                gateway_address: entry.gateway_address,
                private_port: entry.private_port,
                client_address: entry.client_address,
                use_himhip_host_address: entry.use_himhip_host_address,
                ttl: entry.ttl,
                protocol: entry.protocol,
                last_ttl_update: entry.last_ttl_update,
                listen_id: entry.listen_id,
                description: entry.description,
                last_status: entry.last_status,
                last_update: entry.last_update
            });
        }

        return {
            statusCode: StatusCodes.OK,
            data: list
        };
    }

    /**
     * getCurrentGatewayInfo
     */
    public async getCurrentGatewayInfo(): Promise<UpnpNatCurrentGatwayInfoResponse> {
        const himhip = HimHIP.getData();

        if (himhip !== null) {
            return {
                statusCode: StatusCodes.OK,
                data: {
                    gatway_address: himhip.gateway,
                    gatwaymac_address: himhip.gatewaymac,
                    client_address: himhip.hostip
                }
            };
        }

        return {
            statusCode: StatusCodes.INTERNAL_ERROR
        };
    }

    /**
     * save
     * @param data
     */
    public async save(data: UpnpNatSaveRequest): Promise<UpnpNatSaveResponse> {
        const natportRepository = DBHelper.getRepository(NatPortDB);

        let aNatPort: NatPortDB|null = null;

        if (data.id !== 0) {
            const tNatPort = await natportRepository.findOne({
                where: {
                    id: data.id
                }
            });

            if (tNatPort) {
                aNatPort = tNatPort;
            }
        }

        if (aNatPort === null) {
            aNatPort = new NatPortDB();
        }

        aNatPort.public_port = data.public_port;
        aNatPort.gateway_identifier_id = data.gateway_identifier_id;
        aNatPort.gateway_address = data.gateway_address;
        aNatPort.private_port = data.private_port;
        aNatPort.client_address = data.client_address;
        aNatPort.use_himhip_host_address = data.use_himhip_host_address;
        aNatPort.ttl = data.ttl;
        aNatPort.protocol = data.protocol;
        aNatPort.listen_id = data.listen_id;
        aNatPort.description = data.description;

        const result = await DBHelper.getDataSource().manager.save(aNatPort);

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
    public async delete(data: UpnpNatDeleteRequest): Promise<UpnpNatDeleteResponse> {
        const natportRepository = DBHelper.getRepository(NatPortDB);

        const result = await natportRepository.delete({
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
            '/json/upnpnat/openportlist',
            async(req, res) => {
                if (this.isUserLogin(req, res)) {
                    res.status(200).json(await this.getOpenPortList());
                }
            }
        );

        this._routes.get(
            '/json/upnpnat/list',
            async(req, res) => {
                if (this.isUserLogin(req, res)) {
                    res.status(200).json(await this.getList());
                }
            }
        );

        this._routes.get(
            '/json/upnpnat/current_gateway_info',
            async(req, res) => {
                if (this.isUserLogin(req, res)) {
                    res.status(200).json(await this.getCurrentGatewayInfo());
                }
            }
        );

        this._routes.post(
            '/json/upnpnat/save',
            async(req, res) => {
                if (this.isUserLogin(req, res)) {
                    if (this.isSchemaValidate(SchemaUpnpNatSaveRequest, req.body, res)) {
                        res.status(200).json(await this.save(req.body));
                    }
                }
            }
        );

        this._routes.post(
            '/json/upnpnat/delete',
            async(req, res) => {
                if (this.isUserLogin(req, res)) {
                    if (this.isSchemaValidate(SchemaUpnpNatDeleteRequest, req.body, res)) {
                        res.status(200).json(await this.delete(req.body));
                    }
                }
            }
        );

        return super.getExpressRouter();
    }

}