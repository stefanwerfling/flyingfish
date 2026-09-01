import {Column, Entity} from 'typeorm';
import {DBBaseEntityId} from '../DBBaseEntityId.js';

/**
 * ACME DNS-01 temporary record Entity.
 *
 * Shared store for the ACME DNS-01 challenge across the process boundary: the
 * backend (via SslCertService / the letsencrypt plugin hooks) writes the
 * temporary `_acme-challenge.<domain>` TXT record here, and the standalone DNS
 * server reads it at query time. Rows are short-lived — added for a challenge
 * and removed on cleanup — so no indexes are declared (the table stays tiny).
 */
@Entity({name: 'acme_dns_temp_record'})
export class AcmeDnsTempRecord extends DBBaseEntityId {

    /**
     * record name (e.g. `_acme-challenge.example.com`)
     */
    @Column({
        type: 'varchar',
        length: 512
    })
    public name!: string;

    /**
     * dtype
     */
    @Column()
    public dtype!: number;

    /**
     * dclass
     */
    @Column()
    public dclass!: number;

    /**
     * ttl
     */
    @Column()
    public ttl!: number;

    /**
     * dvalue
     */
    @Column({
        type: 'text',
        default: ''
    })
    public dvalue!: string;

}