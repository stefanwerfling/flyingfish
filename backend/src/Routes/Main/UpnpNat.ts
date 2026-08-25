import {Router} from 'express';
import {DefaultRoute} from 'figtree';
import {
    DefaultReturn,
    SchemaDefaultReturn,
    SchemaUpnpNatCurrentGatwayInfoResponse,
    SchemaUpnpNatDeleteRequest,
    SchemaUpnpNatOpenPortResponse,
    SchemaUpnpNatResponse,
    SchemaUpnpNatSaveRequest,
    UpnpNatCurrentGatwayInfoResponse,
    UpnpNatOpenPortResponse,
    UpnpNatResponse
} from 'flyingfish_schemas';
import {FlyingFishRouteCheckUserLogin} from '../../Application/Server/FlyingFishRouteCheckUserLogin.js';
import {Delete} from './UpnpNat/Delete.js';
import {Gateway} from './UpnpNat/Gateway.js';
import {List} from './UpnpNat/List.js';
import {OpenPort} from './UpnpNat/OpenPort.js';
import {Save} from './UpnpNat/Save.js';

/**
 * UpnpNat
 */
export class UpnpNat extends DefaultRoute {

    /**
     * getExpressRouter
     */
    public override getExpressRouter(): Router {
        this._get(
            '/json/upnpnat/openportlist',
            FlyingFishRouteCheckUserLogin,
            async(): Promise<UpnpNatOpenPortResponse> => {
                return OpenPort.getOpenPortList();
            },
            {
                description: 'Read the open port list',
                responseBodySchema: SchemaUpnpNatOpenPortResponse
            }
        );

        this._get(
            '/json/upnpnat/list',
            FlyingFishRouteCheckUserLogin,
            async(): Promise<UpnpNatResponse> => {
                return List.getList();
            },
            {
                description: 'Read the UPnP NAT list',
                responseBodySchema: SchemaUpnpNatResponse
            }
        );

        this._get(
            '/json/upnpnat/current_gateway_info',
            FlyingFishRouteCheckUserLogin,
            async(): Promise<UpnpNatCurrentGatwayInfoResponse> => {
                return Gateway.getCurrentGatewayInfo();
            },
            {
                description: 'Read the current gateway info',
                responseBodySchema: SchemaUpnpNatCurrentGatwayInfoResponse
            }
        );

        this._post(
            '/json/upnpnat/save',
            FlyingFishRouteCheckUserLogin,
            async(_req, _res, data): Promise<DefaultReturn> => {
                return Save.save(data.body!);
            },
            {
                description: 'Save a UPnP NAT mapping',
                bodySchema: SchemaUpnpNatSaveRequest,
                responseBodySchema: SchemaDefaultReturn
            }
        );

        this._post(
            '/json/upnpnat/delete',
            FlyingFishRouteCheckUserLogin,
            async(_req, _res, data): Promise<DefaultReturn> => {
                return Delete.delete(data.body!);
            },
            {
                description: 'Delete a UPnP NAT mapping',
                bodySchema: SchemaUpnpNatDeleteRequest,
                responseBodySchema: SchemaDefaultReturn
            }
        );

        return super.getExpressRouter();
    }

}