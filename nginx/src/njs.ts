/**
 * accessAddressHttp
 * @param s
 */
async function accessAddressHttp(s: NginxHTTPRequest) {
    const v = s.variables;
    let address = v.realip_remote_addr;

    if (!address) {
        address = s.remoteAddress;
    }

    if (v.ff_address_access_url) {
        const reply = await addressCheck(
            v.ff_address_access_url,
            s,
            'http'
        );

        if (reply) {
            s.warn("accessAddressHttp(" + address + ") -> Allow");
            s.return(200);
            return;
        }
    } else {
        s.warn("accessAddressHttp() -> url address access not found!");
    }

    s.warn("accessAddressHttp(" + address + ") -> Deny");
    s.return(403);
}

/**
 * accessAddressStream
 * @param s
 */
async function accessAddressStream(s: NginxStreamRequest) {
    const v = s.variables;
    let address = v.realip_remote_addr;

    if (!address) {
        address = s.remoteAddress;
    }

    if (v.ff_address_access_url) {
        const reply = await addressCheck(
            v.ff_address_access_url,
            s,
            'stream'
        );

        if (reply) {
            s.warn("accessAddressStream(" + address + ") -> Allow");
            s.allow();
            return;
        }
    } else {
        s.warn("accessAddressStream() -> url address access not found!");
    }

    s.warn("accessAddressStream(" + address + ") -> Deny");
    s.deny();
}

/**
 * addressCheck
 * @param url
 * @param s
 * @param type
 */
async function addressCheck(url: string, s: NginxStreamRequest|NginxHTTPRequest, type: string): Promise<boolean> {
    // @ts-ignore
    try {
        const v = s.variables;
        let listen_id = '0';

        if (v.ff_listen_id) {
            listen_id = v.ff_listen_id;
        }

        s.warn(`addressCheck(fetch) -> listenId: ${listen_id}, type: ${type} -> ${url}`);
        s.error(`Version: ${njs.version}`);
        
        const reply = await ngx.fetch(url, {
            method: 'GET',
            headers: {
                'Accept-Encoding' : '',
                'realip_remote_addr': v.realip_remote_addr,
                'remote_addr': s.remoteAddress,
                'type': type,
                'listen_id': listen_id
            },
            verify: false
        });

        if (reply) {
            s.warn(`addressCheck(fetch->status) -> ${reply.status}`);

            if (reply.status === undefined) {
                s.error(`Version: ${njs.version}`);
                s.error(`addressCheck(fetch->status undefined) ok?: ${reply.ok}!`);
                s.error(njs.dump(reply));

                if (reply.ok) {
                    return true;
                }
            } else {
                if (reply.status == 200) {
                    return true;
                }
            }
        } else {
            s.error(`addressCheck(fetch->reply) is empty!`);
        }
    } catch (e: any) {
        s.warn(`addressCheck(error) -> ${e.message}`);
    }

    return false;
}

/**
 * authorize
 * @param s
 */
async function authorize(s: NginxHTTPRequest) {
    const v = s.variables;

    if (!v.ff_authheader) {
        s.warn('authorize -> no authheader, send 401');
        s.return(401);
    } else if (v.ff_auth_basic_url) {
        let location_id = '0';

        if (v.ff_location_id) {
            location_id = v.ff_location_id;
        }

        const resulte = await ngx.fetch(v.ff_auth_basic_url, {
            body: '',
            headers: {
                'authheader': v.ff_authheader,
                'location_id': location_id
            },
            verify: false
        });

        s.warn(`authorize(fetch->status) -> ${resulte.status}`);

        if (resulte.status == 200) {
            s.return(200);
        } else {
            s.return(403);
        }
    } else {
        s.warn('authorize -> Auth Url not found!');
        s.return(500);
    }
}

async function info() {

}

/**
 * result
 */
export default {accessAddressHttp, accessAddressStream, authorize};