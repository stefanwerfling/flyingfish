import * as net from 'net';
import * as tls from 'tls';

export class TlsSocket extends tls.TLSSocket {

    /**
     * Parent Socket
     */
    public _parent?: net.Socket;

}