import {Util} from './Util.js';

export class IPv4Addr {

    protected _addr = new Array(4);

    public decode(rawPacket: Buffer, offset: number = 0): IPv4Addr {
        this._addr[0] = rawPacket[offset];
        this._addr[1] = rawPacket[offset + 1];
        this._addr[2] = rawPacket[offset + 2];
        this._addr[3] = rawPacket[offset + 3];

        return this;
    }

    public toString(): string {
        return `${Util.int8_to_dec[this._addr[0]]}.${
            Util.int8_to_dec[this._addr[1]]}.${
            Util.int8_to_dec[this._addr[2]]}.${
            Util.int8_to_dec[this._addr[3]]}`;
    }

}