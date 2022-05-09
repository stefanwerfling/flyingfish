// @ts-ignore
import NginxVariables from 'njs-types/ngx_http_js_module';


// eslint-disable-next-line @typescript-eslint/no-unused-vars
const accessAddress = async(s: NginxVariables): Promise<void> => {
    if (s.remoteAddress.match('^192.*')) {
        s.deny();
        return;
    }

    s.allow();
};