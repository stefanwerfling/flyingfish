import {Router} from 'express';
import {DefaultRoute} from 'figtree';
import {
    DomainDeleteResponse,
    DomainRecordDeleteResponse,
    DomainRecordSaveResponse,
    DomainResponse,
    DomainSaveResponse,
    SchemaDomainData,
    SchemaDomainDelete,
    SchemaDomainDeleteResponse,
    SchemaDomainRecordDelete,
    SchemaDomainRecordDeleteResponse,
    SchemaDomainRecordSave,
    SchemaDomainRecordSaveResponse,
    SchemaDomainResponse,
    SchemaDomainSaveResponse
} from 'flyingfish_schemas';
import {FlyingFishRouteCheckUserLogin} from '../../Application/Server/FlyingFishRouteCheckUserLogin.js';
import {List} from './Domain/List.js';
import {Delete as DomainDelete} from './Domain/Delete.js';
import {Delete as DomainRecordDelete} from './Domain/Record/Delete.js';
import {Save as DomainRecordSave} from './Domain/Record/Save.js';
import {Save as DomainSave} from './Domain/Save.js';

/**
 * Domain
 */
export class Domain extends DefaultRoute {

    /**
     * getExpressRouter
     */
    public override getExpressRouter(): Router {
        this._get(
            '/json/domain/list',
            FlyingFishRouteCheckUserLogin,
            async(): Promise<DomainResponse> => {
                return List.getDomains();
            },
            {
                description: 'Read the domain list',
                responseBodySchema: SchemaDomainResponse
            }
        );

        this._post(
            '/json/domain/save',
            FlyingFishRouteCheckUserLogin,
            async(_req, _res, data): Promise<DomainSaveResponse> => {
                return DomainSave.saveDomain(data.body!);
            },
            {
                description: 'Save a domain',
                bodySchema: SchemaDomainData,
                responseBodySchema: SchemaDomainSaveResponse
            }
        );

        this._post(
            '/json/domain/delete',
            FlyingFishRouteCheckUserLogin,
            async(_req, _res, data): Promise<DomainDeleteResponse> => {
                return DomainDelete.deleteDomain(data.body!);
            },
            {
                description: 'Delete a domain',
                bodySchema: SchemaDomainDelete,
                responseBodySchema: SchemaDomainDeleteResponse
            }
        );

        this._post(
            '/json/domain/record/save',
            FlyingFishRouteCheckUserLogin,
            async(_req, _res, data): Promise<DomainRecordSaveResponse> => {
                return DomainRecordSave.saveDomainRecord(data.body!);
            },
            {
                description: 'Save a domain record',
                bodySchema: SchemaDomainRecordSave,
                responseBodySchema: SchemaDomainRecordSaveResponse
            }
        );

        this._post(
            '/json/domain/record/delete',
            FlyingFishRouteCheckUserLogin,
            async(_req, _res, data): Promise<DomainRecordDeleteResponse> => {
                return DomainRecordDelete.deleteDomainRecord(data.body!);
            },
            {
                description: 'Delete a domain record',
                bodySchema: SchemaDomainRecordDelete,
                responseBodySchema: SchemaDomainRecordDeleteResponse
            }
        );

        return super.getExpressRouter();
    }

}