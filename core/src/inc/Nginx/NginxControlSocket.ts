import path from 'path';

/**
 * Socket file name (without extension) of the njs control unix socket that
 * nginx's `address_access`/`auth_basic` subrequests connect to. Shared
 * between whichever process actually hosts the control server (the backend
 * in local mode, the nginxserver package in remote/extracted mode) and the
 * config generator that embeds the resolved path into nginx.conf, so both
 * sides always agree on the same socket file.
 */
export const NGINX_CONTROL_UNIX_SOCKET_NAME = 'nginx_control';

/**
 * Resolve the njs control unix socket path for a given nginx prefix, mirroring
 * figtree's `USHttpServer` layout (`<prefix>/socks/<name>.sock`) without
 * requiring a running server instance. Used to embed the control URL into the
 * generated nginx config even when the control server lives in a different
 * process/container than the config generator (remote nginx mode).
 * @param {string} nginxPrefix
 * @returns {string}
 */
export const resolveNginxControlUnixSocketPath = (nginxPrefix: string): string =>
    path.join(nginxPrefix, 'socks', `${NGINX_CONTROL_UNIX_SOCKET_NAME}.sock`);