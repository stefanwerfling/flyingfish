import {FileHelper, Logger} from 'figtree';
import fs from 'fs/promises';
import path from 'path';
import {FlyingFishConfig} from '../../Application/Config/FlyingFishConfig.js';
import {OpenSSL} from '../OpenSSL/OpenSSL.js';
import {NginxServer} from './NginxServer.js';

/**
 * Manages the nginx binary lifecycle: dhparam preparation and start/stop/reload
 * of the nginx process (via NginxServer). Extracted from NginxService (phase-2
 * split).
 */
export class NginxProcess {

    /**
     * Ensure the dhparam file exists, then start the nginx process.
     */
    public async start(): Promise<void> {
        await this._ensureDhparam();

        await NginxServer.getInstance().start();

        if (await NginxServer.getInstance().isRun()) {
            Logger.getLogger().info('Nginx server is start', {
                class: 'NginxProcess::start'
            });
        }
    }

    /**
     * Stop the nginx process.
     * @param {boolean} forced
     * @returns {Promise<void>}
     */
    public async stop(forced: boolean): Promise<void> {
        if (await NginxServer.getInstance().isRun()) {
            await NginxServer.getInstance().stop();
        } else if (forced) {
            await NginxServer.getInstance().stop();
        }
    }

    /**
     * Test the generated config and reload the nginx process.
     */
    public async reload(): Promise<void> {
        if (await NginxServer.getInstance().testConfig()) {
            Logger.getLogger().error('Nginx server config has a error!', {
                class: 'NginxProcess::reload'
            });
        }

        await NginxServer.getInstance().reload();

        if (await NginxServer.getInstance().isRun()) {
            Logger.getLogger().info('Nginx server is reload', {
                class: 'NginxProcess::reload'
            });
        }
    }

    /**
     * Whether the nginx process is running.
     * @returns {Promise<boolean>}
     */
    public isRun(): Promise<boolean> {
        return NginxServer.getInstance().isRun();
    }

    /**
     * Create the dhparam file if it is configured and missing.
     * @protected
     */
    protected async _ensureDhparam(): Promise<void> {
        const dhparam = FlyingFishConfig.getInstance().get()?.nginx?.dhparamfile;

        if (!dhparam) {
            return;
        }

        if (await FileHelper.fileExist(dhparam)) {
            Logger.getLogger().info('Dhparam found.', {
                class: 'NginxProcess::_ensureDhparam'
            });

            return;
        }

        Logger.getLogger().info('Create Dhparam ...', {
            class: 'NginxProcess::_ensureDhparam'
        });

        await fs.mkdir(path.dirname(dhparam), {recursive: true});

        if (await OpenSSL.createDhparam(dhparam, 4096) === null) {
            Logger.getLogger().warn('Can not create Dhparam!', {
                class: 'NginxProcess::_ensureDhparam'
            });
        } else {
            Logger.getLogger().info('Dhparam finish.', {
                class: 'NginxProcess::_ensureDhparam'
            });
        }
    }

}