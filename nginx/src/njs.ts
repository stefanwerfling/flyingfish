// @ts-ignore
import {NginxHTTPRequest} from 'njs-types/ngx_http_js_module';
// @ts-ignore
import {NginxStreamRequest} from 'njs-types/ngx_stream_js_module';

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
        const resulte = await addressCheck(
            v.ff_address_access_url,
            s,
            'http'
        );

        if (resulte) {
            s.warn("accessAddressHttp(" + address + ") -> Allow");
            s.allow();
            return;
        }
    } else {
        s.warn("accessAddressHttp() -> url address access not found!");
    }

    s.warn("accessAddressHttp(" + address + ") -> Deny");
    s.deny();
};

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
        const resulte = await addressCheck(
            v.ff_address_access_url,
            s,
            'stream'
        );

        if (resulte) {
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
        s.warn(`addressCheck(fetch) -> ${url}`);

        const resulte = await ngx.fetch(url, {
            body: '', headers: {
                'realip_remote_addr': v.realip_remote_addr,
                'remote_addr': s.remoteAddress,
                'type': type
            }
        });

        s.warn(`addressCheck(fetch->status) -> ${resulte.status}`);

        if (resulte.status == 200) {
            return true;
        }
    } catch (e: any) {
        s.warn(`addressCheck(error) -> ${e.message}`);
    }

    return false;
}

/**
 * result
 */
export default {accessAddressHttp, accessAddressStream};