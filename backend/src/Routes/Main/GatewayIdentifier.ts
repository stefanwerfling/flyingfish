import {Body, Get, JsonController, Post, Session} from 'routing-controllers-extended';
import {GatewayIdentifier as GatewayIdentifierDB} from '../../inc/Db/MariaDb/Entity/GatewayIdentifier.js';
import {DBHelper} from '../../inc/Db/DBHelper.js';
import {DefaultReturn} from '../../inc/Routes/DefaultReturn.js';
import {StatusCodes} from '../../inc/Routes/StatusCodes.js';

/**
 * GatewayIdentifierEntry
 */
export type GatewayIdentifierEntry = {
    id: number;
    networkname: string;
    mac_address: string;
    address: string;
    color: string;
};

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
export type GatewayIdentifierDelete = {
    id: number;
};

/**
 * GatewayIdentifierDeleteResponse
 */
export type GatewayIdentifierDeleteResponse = DefaultReturn;

/**
 * GatewayIdentifier
 */
@JsonController()
export class GatewayIdentifier {

    /**
     * getList
     * @param session
     */
    @Get('/json/gatewayidentifier/list')
    public async getList(@Session() session: any): Promise<GatewayIdentifierListResponse> {
        if ((session.user !== undefined) && session.user.isLogin) {
            const giRepository = DBHelper.getRepository(GatewayIdentifierDB);

            const list: GatewayIdentifierEntry[] = [];
            const entrys = await giRepository.find();

            for (const entry of entrys) {
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

        return {
            statusCode: StatusCodes.UNAUTHORIZED
        };
    }

    /**
     * save
     * @param session
     * @param request
     */
    @Post('/json/gatewayidentifier/save')
    public async save(@Session() session: any, @Body() request: GatewayIdentifierEntry): Promise<GatewayIdentifierSaveResponse> {
        if ((session.user !== undefined) && session.user.isLogin) {
            const giRepository = DBHelper.getRepository(GatewayIdentifierDB);

            let aGateway: GatewayIdentifierDB|null = null;

            if (request.id !== 0) {
                const tgi = await giRepository.findOne({
                    where: {
                        id: request.id
                    }
                });

                if (tgi) {
                    aGateway = tgi;
                }
            }

            if (aGateway === null) {
                aGateway = new GatewayIdentifierDB();
            }

            aGateway.mac_address = request.mac_address;
            aGateway.address = request.address;
            aGateway.networkname = request.networkname;
            aGateway.color = request.color;

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

        return {
            statusCode: StatusCodes.UNAUTHORIZED
        };
    }

    /**
     * delete
     * @param session
     * @param request
     */
    @Post('/json/gatewayidentifier/delete')
    public async delete(@Session() session: any, @Body() request: GatewayIdentifierDelete): Promise<GatewayIdentifierDeleteResponse> {
        if ((session.user !== undefined) && session.user.isLogin) {
            const giRepository = DBHelper.getRepository(GatewayIdentifierDB);

            const result = await giRepository.delete({
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