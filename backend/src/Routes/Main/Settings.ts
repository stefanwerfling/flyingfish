import {Router} from 'express';
import {DefaultRoute} from 'flyingfish_core';
import {SchemaSettingsList} from 'flyingfish_schemas';
import {List} from './Settings/List.js';
import {Save} from './Settings/Save.js';

/**
 * Settings
 */
export class Settings extends DefaultRoute {

    /**
     * getExpressRouter
     */
    public getExpressRouter(): Router {
        this._get(
            '/json/settings/list',
            async(req, res) => {
                if (this.isUserLogin(req, res)) {
                    res.status(200).json(await List.getList());
                }
            }
        );

        this._post(
            '/json/settings/save',
            async(req, res) => {
                if (this.isUserLogin(req, res)) {
                    if (this.isSchemaValidate(SchemaSettingsList, req.body, res)) {
                        res.status(200).json(await Save.saveSettings(req.body));
                    }
                }
            }
        );

        return super.getExpressRouter();
    }

}