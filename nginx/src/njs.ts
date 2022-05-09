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

    if (address.match('^192.*')) {
        s.warn("accessAddressHttp(" + address + ") -> Deny");
        s.deny();
        return;
    }

    s.warn("accessAddressHttp(" + address + ") -> Allow");
    s.allow();
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

    if (address.match('^192.*')) {
        s.warn("accessAddressStream(" + address + ") -> Deny");
        s.deny();
        return;
    }

    s.warn("accessAddressStream(" + address + ") -> Allow");
    s.allow();
}

export default {accessAddressHttp, accessAddressStream};