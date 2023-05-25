import {IPv4Addr} from './IPv4Addr.js';

export class IPv4 {

    protected _version: number = 0;
    protected _headerLength: number = 0;
    protected _diffserv: number = 0;
    protected _length: number = 0;
    protected _identification: number = 0;
    protected _ttl: number = 0;
    protected _protocol: number = 0;
    protected _headerChecksum: number = 0;
    protected _saddr: IPv4Addr|null = null;
    protected _daddr: IPv4Addr|null = null;

    public getSourceAddress(): IPv4Addr {
        return this._saddr === null ? new IPv4Addr() : this._saddr;
    }

    public getDestinationAddress(): IPv4Addr {
        return this._daddr === null ? new IPv4Addr() : this._daddr;
    }

    public decode(rawPacket: Buffer, offset: number = 0): boolean {
        let pOffset = offset;

        // eslint-disable-next-line no-bitwise
        this._version = (rawPacket[pOffset] & 0xf0) >> 4;
        // eslint-disable-next-line no-bitwise
        this._headerLength = (rawPacket[pOffset] & 0x0f) << 2;
        pOffset += 1;

        this._diffserv = rawPacket[pOffset];
        pOffset += 1;

        this._length = rawPacket.readUInt16BE(pOffset);
        pOffset += 2;

        this._identification = rawPacket.readUInt16BE(pOffset);
        pOffset += 2;

        // TODO Flags & fragmentOffset
        pOffset += 2;

        this._ttl = rawPacket[pOffset];
        pOffset += 1;

        this._protocol = rawPacket[pOffset];
        pOffset += 1;

        this._headerChecksum = rawPacket.readUInt16BE(pOffset);
        pOffset += 2;

        this._saddr = new IPv4Addr().decode(rawPacket, pOffset);
        pOffset += 4;

        this._daddr = new IPv4Addr().decode(rawPacket, pOffset);
        pOffset += 4;

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const toffset = pOffset + this._headerLength;
        // TODO

        return true;
    }

}