import {Response, Router} from 'express';
import {DefaultRoute} from 'flyingfish_core';
import {Config} from '../../inc/Config/Config.js';
import {HimHIP} from '../../inc/HimHIP/HimHIP.js';

/**
 * Update
 */
export class Update extends DefaultRoute {

    /**
     * constructor
     */
    public constructor() {
        super();
    }

    /**
     * update
     * @param response
     * @param hSecret
     * @param hGatewaymac
     * @param hNetwork
     * @param hGateway
     * @param hInterface
     * @param hHostip
     */
    public async update(
        response: Response,
        hSecret: string,
        hGatewaymac: string,
        hNetwork: string,
        hGateway: string,
        hInterface: string,
        hHostip: string
    ): Promise<boolean> {
        const configHimHip = Config.getInstance().get()?.himhip;

        if (configHimHip && configHimHip.use) {
            if (configHimHip.secret === hSecret) {
                HimHIP.setData({
                    gatewaymac: hGatewaymac,
                    network: hNetwork,
                    gateway: hGateway,
                    interface: hInterface,
                    hostip: hHostip
                });

                response.status(200).send();
                return true;
            }
        }

        response.status(401).send();
        return false;
    }

    /**
     * getExpressRouter
     */
    public getExpressRouter(): Router {
        this._routes.get(
            '/himhip/update',
            async(req, res) => {
                await this.update(
                    res,
                    req.header('secret') ?? '',
                    req.header('gatewaymac') ?? '',
                    req.header('network') ?? '',
                    req.header('gateway') ?? '',
                    req.header('interface') ?? '',
                    req.header('hostip') ?? ''
                );

                res.end();
            }
        );

        return super.getExpressRouter();
    }

}