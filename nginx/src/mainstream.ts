/**
 * addressCheckFlyingFish
 * @param {string} url
 * @param {NginxStreamRequest|NginxHTTPRequest} s
 * @param {string} type
 */
const addressCheckFlyingFish = async(url: string, s: NginxStreamRequest|NginxHTTPRequest, type: string): Promise<boolean> => {
    try {
        const v = s.variables;
        let listen_id = '0';
        let secret = '';

        if (v.ff_listen_id) {
            listen_id = v.ff_listen_id;
        }

        if (v.ff_secret) {
            secret = v.ff_secret;
        }

        s.warn(`addressCheck(fetch) -> listenId: ${listen_id}, type: ${type} -> ${url}`);
        s.error(`Version: ${njs.version}`);

        const reply = await ngx.fetch(url, {
            method: 'GET',
            headers: {
                'Accept-Encoding' : '',
                'realip_remote_addr': v.realip_remote_addr,
                'remote_addr': s.remoteAddress,
                secret,
                type,
                listen_id
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
            } else if (reply.status === 200) {
                return true;
            }
        } else {
            s.error('addressCheck(fetch->reply) is empty!');
        }
    } catch (e: any) {
        s.warn(`addressCheck(error) -> ${njs.dump(e)}`);
    }

    return false;
};

/**
 * accessAddressStream
 * @param {NginxStreamRequest} s
 */
const accessAddressStream = async(s: NginxStreamRequest): Promise<void> => {
    const v = s.variables;
    let address = v.realip_remote_addr;

    if (!address) {
        address = s.remoteAddress;
    }

    if (v.ff_address_access_url) {
        const reply = await addressCheckFlyingFish(
            v.ff_address_access_url,
            s,
            'stream'
        );

        if (reply) {
            s.warn(`accessAddressStream(${address}) -> Allow`);
            s.allow();
            return;
        }
    } else {
        s.warn('accessAddressStream() -> url address access not found!');
    }

    s.warn(`accessAddressStream(${address}) -> Deny`);
    s.deny();
};

export default {accessAddressStream};