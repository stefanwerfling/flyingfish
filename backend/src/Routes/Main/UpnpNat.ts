import {Body, Get, JsonController, Post, Session} from 'routing-controllers-extended';
import {UpnpNatCache, UpnpNatCacheMapping} from '../../inc/Cache/UpnpNatCache.js';
import {DBHelper} from '../../inc/Db/DBHelper.js';
import {NatPort as NatPortDB} from '../../inc/Db/MariaDb/Entity/NatPort.js';
import {HimHIP} from '../../inc/HimHIP/HimHIP.js';
import {DefaultReturn} from '../../inc/Routes/DefaultReturn.js';
import {StatusCodes} from '../../inc/Routes/StatusCodes.js';

/**
 * UpnpNatDevice
 */
export type UpnpNatDevice = {
    deviceId: string;
    mappings: UpnpNatCacheMapping[];
};

/**
 * UpnpNatOpenPortResponse
 */
export type UpnpNatOpenPortResponse = DefaultReturn & {
    data: UpnpNatDevice[];
};

/**
 * UpnpNatPort
 */
export type UpnpNatPort = {
    id: number;
    postion: number;
    public_port: number;
    gateway_identifier_id: number;
    gateway_address: string;
    private_port: number;
    client_address: string;
    use_himhip_host_address: boolean;
    ttl: number;
    protocol: string;
    last_ttl_update: number;
    listen_id: number;
    description: string;
    last_status: number;
    last_update: number;
};

/**
 * UpnpNatResponse
 */
export type UpnpNatResponse = DefaultReturn & {
    data: UpnpNatPort[];
};

/**
 * UpnpNatGatwayInfo
 */
export type UpnpNatGatwayInfo = {
    gatway_address: string;
    gatwaymac_address: string;
    client_address: string;
};

/**
 * UpnpNatCurrentGatwayInfoResponse
 */
export type UpnpNatCurrentGatwayInfoResponse = DefaultReturn & {
    data?: UpnpNatGatwayInfo;
};

/**
 * UpnpNatSaveRequest
 */
export type UpnpNatSaveRequest = UpnpNatPort;

/**
 * UpnpNatSaveResponse
 */
export type UpnpNatSaveResponse = DefaultReturn;

/**
 * UpnpNatDeleteRequest
 */
export type UpnpNatDeleteRequest = {
    id: number;
};

/**
 * UpnpNatDeleteResponse
 */
export type UpnpNatDeleteResponse = DefaultReturn;

/**
 * UpnpNat
 */
@JsonController()
export class UpnpNat {

    /**
     * getUserInfo
     * @param session
     */
    @Get('/json/upnpnat/openportlist')
    public async getOpenPortList(@Session() session: any): Promise<UpnpNatOpenPortResponse> {
        if ((session.user !== undefined) && session.user.isLogin) {
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

        return {
            statusCode: StatusCodes.INTERNAL_ERROR,
            data: []
        };
    }

    /**
     * getList
     * @param session
     */
    @Get('/json/upnpnat/list')
    public async getList(@Session() session: any): Promise<UpnpNatResponse> {
        if ((session.user !== undefined) && session.user.isLogin) {
            const natportRepository = DBHelper.getRepository(NatPortDB);

            const list: UpnpNatPort[] = [];
            const entrys = await natportRepository.find();

            for (const entry of entrys) {
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

        return {
            statusCode: StatusCodes.INTERNAL_ERROR,
            data: []
        };
    }

    /**
     * getCurrentGatewayInfo
     * @param session
     */
    @Get('/json/upnpnat/current_gateway_info')
    public async getCurrentGatewayInfo(@Session() session: any): Promise<UpnpNatCurrentGatwayInfoResponse> {
        if ((session.user !== undefined) && session.user.isLogin) {
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
        }

        return {
            statusCode: StatusCodes.INTERNAL_ERROR
        };
    }

    /**
     * save
     * @param session
     * @param request
     */
    @Post('/json/upnpnat/save')
    public async save(@Session() session: any, @Body() request: UpnpNatSaveRequest): Promise<UpnpNatSaveResponse> {
        if ((session.user !== undefined) && session.user.isLogin) {
            const natportRepository = DBHelper.getRepository(NatPortDB);

            let aNatPort: NatPortDB|null = null;

            if (request.id !== 0) {
                const tNatPort = await natportRepository.findOne({
                    where: {
                        id: request.id
                    }
                });

                if (tNatPort) {
                    aNatPort = tNatPort;
                }
            }

            if (aNatPort === null) {
                aNatPort = new NatPortDB();
            }

            aNatPort.public_port = request.public_port;
            aNatPort.gateway_identifier_id = request.gateway_identifier_id;
            aNatPort.gateway_address = request.gateway_address;
            aNatPort.private_port = request.private_port;
            aNatPort.client_address = request.client_address;
            aNatPort.use_himhip_host_address = request.use_himhip_host_address;
            aNatPort.ttl = request.ttl;
            aNatPort.protocol = request.protocol;
            aNatPort.listen_id = request.listen_id;
            aNatPort.description = request.description;

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

        return {
            statusCode: StatusCodes.UNAUTHORIZED
        };
    }

    /**
     * delete
     * @param session
     * @param request
     */
    @Post('/json/upnpnat/delete')
    public async delete(@Session() session: any, @Body() request: UpnpNatDeleteRequest): Promise<UpnpNatDeleteResponse> {
        if ((session.user !== undefined) && session.user.isLogin) {
            const natportRepository = DBHelper.getRepository(NatPortDB);

            const result = await natportRepository.delete({
                id: request.id
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

        return {
            statusCode: StatusCodes.UNAUTHORIZED
        };
    }

}