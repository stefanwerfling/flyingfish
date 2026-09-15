import {Router} from 'express';
import {PkiCaTreeResponse, SchemaPkiCaTreeResponse, StatusCodes} from 'flyingfish_schemas';
import {DefaultRoute} from '@stefanwerfling/figtree';
import {CaCertificateDB} from 'flyingfish_core';
import {FlyingFishRouteCheckUserLogin} from '../../Application/Server/FlyingFishRouteCheckUserLogin.js';

/**
 * Pki
 *
 * Read-only HTTP surface for the PKI CA tree (v2 own-PKI epic 9.4, 9.4.6 frontend
 * tree view). The backend shares the database with the PKI part container, so it
 * reads the persisted `ca_certificate` rows directly and exposes only the public
 * fields — never the private key PEM. The self-referenced `parent_ca_id` gives
 * the frontend the tree edges (Root -> purpose intermediates).
 */
export class Pki extends DefaultRoute {

    /**
     * getExpressRouter
     */
    public override getExpressRouter(): Router {
        this._get(
            '/json/pki/tree',
            FlyingFishRouteCheckUserLogin,
            async(): Promise<PkiCaTreeResponse> => {
                const rows = await CaCertificateDB.find();

                const list = rows.map((row) => {
                    return {
                        id: row.id,
                        parentCaId: row.parent_ca_id,
                        caType: row.ca_type,
                        purpose: row.purpose,
                        subject: row.subject,
                        algorithm: row.algorithm,
                        createdAt: row.created_at
                    };
                });

                return {statusCode: StatusCodes.OK, list: list};
            },
            {
                description: 'Read the PKI CA tree (public fields only)',
                responseBodySchema: SchemaPkiCaTreeResponse
            }
        );

        return super.getExpressRouter();
    }

}