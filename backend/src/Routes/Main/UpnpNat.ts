import {Router} from 'express';
import {DefaultRoute} from 'flyingfish_core';
import {SchemaUpnpNatDeleteRequest, SchemaUpnpNatSaveRequest} from 'flyingfish_schemas';
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
    public getExpressRouter(): Router {
        this._routes.get(
            '/json/upnpnat/openportlist',
            async(req, res) => {
                if (this.isUserLogin(req, res)) {
                    res.status(200).json(await OpenPort.getOpenPortList());
                }
            }
        );

        this._routes.get(
            '/json/upnpnat/list',
            async(req, res) => {
                if (this.isUserLogin(req, res)) {
                    res.status(200).json(await List.getList());
                }
            }
        );

        this._routes.get(
            '/json/upnpnat/current_gateway_info',
            async(req, res) => {
                if (this.isUserLogin(req, res)) {
                    res.status(200).json(await Gateway.getCurrentGatewayInfo());
                }
            }
        );

        this._routes.post(
            '/json/upnpnat/save',
            async(req, res) => {
                if (this.isUserLogin(req, res)) {
                    if (this.isSchemaValidate(SchemaUpnpNatSaveRequest, req.body, res)) {
                        res.status(200).json(await Save.save(req.body));
                    }
                }
            }
        );

        this._routes.post(
            '/json/upnpnat/delete',
            async(req, res) => {
                if (this.isUserLogin(req, res)) {
                    if (this.isSchemaValidate(SchemaUpnpNatDeleteRequest, req.body, res)) {
                        res.status(200).json(await Delete.delete(req.body));
                    }
                }
            }
        );

        return super.getExpressRouter();
    }

}