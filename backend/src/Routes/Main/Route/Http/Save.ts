import {DefaultReturn, StatusCodes} from 'flyingfish_schemas';
import {ExtractSchemaResultType, Vts} from 'vts';
import {
    NginxHttpVariable as NginxHttpVariableDB,
    NginxHttpVariableContextType
} from '../../../../inc/Db/MariaDb/Entity/NginxHttpVariable.js';
import {NginxHTTPVariables} from '../../../../inc/Nginx/NginxVariables.js';
import {SchemaRouteHttp} from './../List.js';
import {DBHelper} from '../../../../inc/Db/MariaDb/DBHelper.js';
import {NginxHttp as NginxHttpDB} from '../../../../inc/Db/MariaDb/Entity/NginxHttp.js';
import {NginxLocation as NginxLocationDB} from '../../../../inc/Db/MariaDb/Entity/NginxLocation.js';

/**
 * RouteHttpSave
 */
export const SchemaRouteHttpSave = Vts.object({
    domainid: Vts.number(),
    http: SchemaRouteHttp
});

export type RouteHttpSave = ExtractSchemaResultType<typeof SchemaRouteHttpSave>;

/**
 * RouteHttpSaveResponse
 */
export type RouteHttpSaveResponse = DefaultReturn;

/**
 * AllowedRouteVariableServer
 */
export const AllowedRouteVariableServer = [
    NginxHTTPVariables.client_max_body_size
];

/**
 * SaveHttp
 */
export class Save {

    /**
     * saveHttpRoute
     * @param data
     */
    public static async saveHttpRoute(data: RouteHttpSave): Promise<RouteHttpSaveResponse> {
        // check is listen select ----------------------------------------------------------------------------------

        if (data.http.listen_id === 0) {
            return {
                statusCode: StatusCodes.INTERNAL_ERROR,
                msg: 'Please select a listen!'
            };
        }

        // ---------------------------------------------------------------------------------------------------------

        const httpRepository = DBHelper.getRepository(NginxHttpDB);
        const httpVariableRepository = DBHelper.getRepository(NginxHttpVariableDB);
        const locationRepository = DBHelper.getRepository(NginxLocationDB);

        let aHttp: NginxHttpDB|null = null;

        if (data.http.id > 0) {
            const tHttp = await httpRepository.findOne({
                where: {
                    id: data.http.id
                }
            });

            if (tHttp) {
                aHttp = tHttp;
            }
        }

        const oHttp = await httpRepository.findOne({
            where: {
                listen_id: data.http.listen_id,
                domain_id: data.domainid
            }
        });

        if (oHttp) {
            if (!aHttp || aHttp.id !== oHttp.id) {
                return {
                    statusCode: StatusCodes.INTERNAL_ERROR,
                    msg: 'Listen route by domain already in used!'
                };
            }
        }

        if (aHttp === null) {
            aHttp = new NginxHttpDB();
        }

        aHttp.domain_id = data.domainid;
        aHttp.index = data.http.index;
        aHttp.listen_id = data.http.listen_id;
        aHttp.ssl_enable = data.http.ssl.enable || false;
        aHttp.cert_provider = data.http.ssl.provider || '';
        aHttp.cert_email = data.http.ssl.email || '';
        aHttp.http2_enable = data.http.http2_enable;
        aHttp.x_frame_options = data.http.x_frame_options;
        aHttp.wellknown_disabled = data.http.wellknown_disabled;

        aHttp = await DBHelper.getDataSource().manager.save(aHttp);

        // save variables ----------------------------------------------------------------------------------------------

        for await (const variable of data.http.variables) {
            if (AllowedRouteVariableServer.indexOf(variable.name) === -1) {
                continue;
            }

            let variableDb = await httpVariableRepository.findOne({
                where: {
                    http_id: aHttp.id,
                    var_name: variable.name,
                    context_type: NginxHttpVariableContextType.server
                }
            });

            if (!variableDb) {
                variableDb = new NginxHttpVariableDB();
                variableDb.http_id = aHttp.id;
                variableDb.var_name = variable.name;
                variableDb.context_type = NginxHttpVariableContextType.server;
            }

            variableDb.var_value = variable.value;

            await DBHelper.getDataSource().manager.save(variableDb);
        }

        // remove location ---------------------------------------------------------------------------------------------

        const oldLocations = await locationRepository.find({
            where: {
                http_id: aHttp.id
            }
        });

        if (oldLocations) {
            const checkLocationExistence = (locationId: number): boolean => data.http.locations.some(({id}) => id === locationId);

            for await (const oldLocation of oldLocations) {
                if (!checkLocationExistence(oldLocation.id)) {
                    await locationRepository.delete({
                        id: oldLocation.id
                    });
                }
            }
        }

        // update or add new locations -----------------------------------------------------------------------------

        for await (const aLocation of data.http.locations) {
            let aNewLocation: NginxLocationDB | null = null;

            const tLocation = await locationRepository.findOne({
                where: {
                    id: aLocation.id
                }
            });

            if (tLocation) {
                aNewLocation = tLocation;
            }

            if (aNewLocation === null) {
                aNewLocation = new NginxLocationDB();
                aNewLocation.http_id = aHttp.id;
            }

            aNewLocation.destination_type = aLocation.destination_type;
            aNewLocation.match = aLocation.match;

            // fill default reset
            aNewLocation.proxy_pass = '';
            aNewLocation.modifier = '';
            aNewLocation.redirect_code = 0;
            aNewLocation.redirect = '';
            aNewLocation.sshport_out_id = 0;
            aNewLocation.sshport_schema = '';
            aNewLocation.auth_enable = aLocation.auth_enable;
            aNewLocation.websocket_enable = aLocation.websocket_enable;
            aNewLocation.host_enable = aLocation.host_enable;
            aNewLocation.host_name = aLocation.host_name;
            aNewLocation.host_name_port = aLocation.host_name_port;
            aNewLocation.xforwarded_scheme_enable = aLocation.xforwarded_scheme_enable;
            aNewLocation.xforwarded_proto_enable = aLocation.xforwarded_proto_enable;
            aNewLocation.xforwarded_for_enable = aLocation.xforwarded_for_enable;
            aNewLocation.xrealip_enable = aLocation.xrealip_enable;

            if (aLocation.proxy_pass !== '') {
                aNewLocation.proxy_pass = aLocation.proxy_pass;
            } else if (aLocation.redirect) {
                aNewLocation.redirect_code = aLocation.redirect.code;
                aNewLocation.redirect = aLocation.redirect.redirect || '';
            } else if (aLocation.ssh) {
                aNewLocation.sshport_schema = aLocation.ssh.schema || '';
                aNewLocation.sshport_out_id = aLocation.ssh.id || 0;
            }

            await DBHelper.getDataSource().manager.save(aNewLocation);
        }

        return {
            statusCode: StatusCodes.OK
        };
    }

}