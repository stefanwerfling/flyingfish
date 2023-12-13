/**
 * NginxHTTPVariables
 */
export class NginxHTTPVariables {

    public static client_max_body_size = 'client_max_body_size';

    public static server_tokens = 'server_tokens';

    public static ssl_protocols = 'ssl_protocols';
    public static ssl_prefer_server_ciphers = 'ssl_prefer_server_ciphers';
    public static ssl_ciphers = 'ssl_ciphers';
    public static ssl_ecdh_curve = 'ssl_ecdh_curve';
    public static ssl_dhparam = 'ssl_dhparam';
    public static ssl_session_timeout = 'ssl_session_timeout';
    public static ssl_session_cache = 'ssl_session_cache';
    public static ssl_session_tickets = 'ssl_session_tickets';
    public static ssl_stapling = 'ssl_stapling';
    public static ssl_stapling_verify = 'ssl_stapling_verify';
    public static ssl_trusted_certificate = 'ssl_trusted_certificate';
    public static ssl_certificate = 'ssl_certificate';
    public static ssl_certificate_key = 'ssl_certificate_key';

    public static resolver = 'resolver';
    public static resolver_timeout = 'resolver_timeout';

}

/**
 * Nginx stream server variables
 */
export class NginxStreamServerVariables {

    public static proxy_timeout = 'proxy_timeout';
    public static proxy_connect_timeout = 'proxy_connect_timeout';

}