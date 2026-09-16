import {Router} from 'express';
import {DefaultRoute} from '@stefanwerfling/figtree';
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
    SchemaDomainSaveResponse,
    StatusCodes
} from 'flyingfish_schemas';
import {FlyingFishRouteCheckUserLogin} from '../../Application/Server/FlyingFishRouteCheckUserLogin.js';
import {hasPermission, hasPermissionOnResource} from '../../Application/Server/FlyingFishRouteCheckPermission.js';
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
            async(req, _res, data): Promise<DomainSaveResponse> => {
                // RBAC (9.5.13): creating needs a global domain.create; editing an
                // existing domain (incl. its cluster_priority, 9.5.14) needs
                // domain.write on that domain.
                const body = data.body!;
                const allowed = body.id === 0
                    ? await hasPermission(req, 'domain.create')
                    : await hasPermissionOnResource(req, 'domain.write', {type: 'domain', id: body.id});

                if (!allowed) {
                    return {statusCode: StatusCodes.UNAUTHORIZED};
                }

                return DomainSave.saveDomain(body);
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
            async(req, _res, data): Promise<DomainDeleteResponse> => {
                if (!await hasPermissionOnResource(req, 'domain.delete', {type: 'domain', id: data.body!.id})) {
                    return {statusCode: StatusCodes.UNAUTHORIZED};
                }

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
            async(req, _res, data): Promise<DomainRecordSaveResponse> => {
                if (!await hasPermissionOnResource(req, 'domain.write', {type: 'domain', id: data.body!.domain_id})) {
                    return {statusCode: StatusCodes.UNAUTHORIZED};
                }

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
            async(req, _res, data): Promise<DomainRecordDeleteResponse> => {
                // The delete request carries only the record id, not its domain, so
                // this is a coarse global domain.write check.
                if (!await hasPermission(req, 'domain.write')) {
                    return {statusCode: StatusCodes.UNAUTHORIZED};
                }

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