import {LangDefine} from '../inc/Lang/LangDefine.js';

/**
 * Lang_EN
 */
export class Lang_EN implements LangDefine {

    private _content: {[index: string]: string;} = {
        title: 'FlyingFish',
        login_title: '<b>FlyingFish</b>',
        copyrightname: '<a href="https://github.com/stefanwerfling/flyingfish/" target="_blank">FlyingFish</a>',
        version: 'v1.1.0',

        dahsboard_ip_blacklisted: 'The public ip is checked with rDNS query on common providers. This information is useful if you run an email server.',

        listen_stream_proxytimeout: 'Set the <i>timeout</i> between two successive read or write operations on client or proxied server connections. If no data is transmitted within this time, the connection is closed.',
        listen_stream_proxyconnecttimeout: 'Defines a timeout for establishing a connection with a proxied server.',

        route_default_route: 'The default routes cannot be edited. They serve as a visual representation of the route the stream takes to the proxy server.',

        route_stream_useasdefault: 'Only one default stream can be set per listen. This stream is used on the listen when the domain cannot be determined (e.g. a non-SSL protocol). This entry is only considered if it is not a standard listen.',
        route_stream_loadbalancealg: 'The load balancing algorithm is only used when there is more than one upstream.<br><br><b>Least connection</b>: This algorithm distributes the client\'s request to servers with the least active connections at a particular time. This will ensure that no one server is overworked while other servers have fewer active connections.<br><br><b>IP hash</b>: This algorithm hashes the IP address of the client sending the request with a hashing function and then sends the request to one of the servers for processing. Subsequent requests from the clients IP address are always sent to the same server.',

        route_http_http2: 'The http2 protocol can only be used on an SSL connection. Enable SSL to unlock this setting.',
        route_http_location_headerhostport: 'Only use by different port on router, your port != 80,443',

        dyndns_client_edit_gateway: 'The client is bound to the gateway and only runs when it is in the gateway. If nothing is specified, the client will always be executed.',
        dyndns_client_edit_updatedomains: 'The specified domains are updated internally with the new IP in the record.'
    };

    /**
     * l
     * @param acontent
     */
    public l(acontent: string): string | null {
        if (this._content[acontent]) {
            return this._content[acontent];
        }

        return null;
    }

    /**
     * getClassName
     */
    public getClassName(): string {
        return 'Lang_EN';
    }

}