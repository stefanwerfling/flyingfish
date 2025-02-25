import {
    CredentialLocationDB,
    CredentialLocationServiceDB,
    NginxHttpDB,
    NginxHttpServiceDB,
    NginxHttpVariableDB,
    NginxHttpVariableServiceDB, NginxLocationDB, NginxLocationServiceDB
} from 'flyingfish_core';
import {DefaultReturn, NginxHttpVariableContextType, RouteHttpSave, StatusCodes} from 'flyingfish_schemas';
import {NginxHTTPVariables} from '../../../../inc/Nginx/NginxHTTPVariables.js';

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
    public static async saveHttpRoute(data: RouteHttpSave): Promise<DefaultReturn> {
        // check is listen select --------------------------------------------------------------------------------------

        if (data.http.listen_id === 0) {
            return {
                statusCode: StatusCodes.INTERNAL_ERROR,
                msg: 'Please select a listen!'
            };
        }

        // -------------------------------------------------------------------------------------------------------------

        let aHttp: NginxHttpDB|null = null;

        if (data.http.id > 0) {
            const tHttp = await NginxHttpServiceDB.getInstance().findOne(data.http.id);

            if (tHttp) {
                aHttp = tHttp;
            }
        }

        const oHttp = await NginxHttpServiceDB.getInstance().findBy(data.http.listen_id, data.domainid);

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
        aHttp.cert_wildcard = data.http.ssl.wildcard || false;
        aHttp.http2_enable = data.http.http2_enable;
        aHttp.x_frame_options = data.http.x_frame_options;
        aHttp.wellknown_disabled = data.http.wellknown_disabled;

        aHttp = await NginxHttpServiceDB.getInstance().save(aHttp);

        // save variables ----------------------------------------------------------------------------------------------

        for await (const variable of data.http.variables) {
            if (AllowedRouteVariableServer.indexOf(variable.name) === -1) {
                continue;
            }

            let variableDb = await NginxHttpVariableServiceDB.getInstance().findOneByName(
                aHttp.id,
                variable.name,
                NginxHttpVariableContextType.server
            );

            if (!variableDb) {
                variableDb = new NginxHttpVariableDB();
                variableDb.http_id = aHttp.id;
                variableDb.var_name = variable.name;
                variableDb.context_type = NginxHttpVariableContextType.server;
            }

            variableDb.var_value = variable.value;

            await NginxHttpVariableServiceDB.getInstance().save(variableDb);
        }

        // remove location ---------------------------------------------------------------------------------------------

        const oldLocations = await NginxLocationServiceDB.getInstance().findAllByHttp(aHttp.id);

        if (oldLocations) {
            const checkLocationExistence = (locationId: number): boolean => data.http.locations.some(({id}) => id === locationId);

            for await (const oldLocation of oldLocations) {
                if (!checkLocationExistence(oldLocation.id)) {
                    await NginxLocationServiceDB.getInstance().remove(oldLocation.id);
                }
            }
        }

        // update or add new locations -----------------------------------------------------------------------------

        for await (const aLocation of data.http.locations) {
            let aNewLocation: NginxLocationDB | null = null;

            const tLocation = await NginxLocationServiceDB.getInstance().findOne(aLocation.id);

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

            aNewLocation = await NginxLocationServiceDB.getInstance().save(aNewLocation);

            // credential ----------------------------------------------------------------------------------------------

            const oldCredentials = await CredentialLocationServiceDB.getInstance().getListByLocation(aNewLocation.id);

            if (oldCredentials) {
                const oldCredentialsExistence = (credentialId: number): boolean => aLocation.credentials.some(({id}) => id === credentialId);

                for await (const oldCredential of oldCredentials) {
                    if (!oldCredentialsExistence(oldCredential.credential_id)) {
                        await CredentialLocationServiceDB.getInstance().remove(oldCredential.id);
                    }
                }
            }

            for await (const credential of aLocation.credentials) {
                let aNewCreLocation: CredentialLocationDB | null = null;

                const tcredential = await CredentialLocationServiceDB.getInstance().findBy(aNewLocation.id, credential.id);

                if (tcredential) {
                    aNewCreLocation = tcredential;
                } else {
                    aNewCreLocation = new CredentialLocationDB();
                }

                aNewCreLocation.position = 0;
                aNewCreLocation.location_id = aNewLocation.id;
                aNewCreLocation.credential_id = credential.id;

                await CredentialLocationServiceDB.getInstance().save(aNewCreLocation);
            }
        }

        return {
            statusCode: StatusCodes.OK
        };
    }

}