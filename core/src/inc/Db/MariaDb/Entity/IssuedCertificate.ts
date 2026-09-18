import {Column, Entity} from 'typeorm';
import {DBBaseEntityId} from '../DBBaseEntityId.js';
import {epochMsColumnTransformer} from '../Transformer/EpochMsColumn.js';

/**
 * Issued (leaf) certificate Entity — an end-entity certificate the PKI part
 * issued through enrollment (own-PKI epic 9.4). Persists what
 * PkiEnrollmentService returns (nodeUid + certificate + chain) plus the issuing
 * CA and the lifecycle timestamps the later slices need (renewal 9.4.3 keys off
 * `expires_at`, revocation 9.4.4 will add its own state).
 *
 * `ca_id` references the issuing CaCertificate (a plain id column, no DB foreign
 * key, matching the rest of the schema). No indexes yet.
 */
@Entity({name: 'issued_certificate'})
export class IssuedCertificate extends DBBaseEntityId {

    /**
     * id of the issuing CA (ca_certificate.id, the purpose Intermediate).
     */
    @Column({
        default: 0
    })
    public ca_id!: number;

    /**
     * the stable node identity assigned at enrollment (goes into the
     * flyingfish://<purpose>/<nodeUid> SAN URI).
     */
    @Column({
        type: 'varchar',
        length: 64
    })
    public node_uid!: string;

    /**
     * the CA purpose the certificate was issued under (`cluster` / `service` /
     * `device`).
     */
    @Column({
        type: 'varchar',
        length: 32,
        default: ''
    })
    public purpose!: string;

    /**
     * the common name of the certificate subject.
     */
    @Column({
        type: 'varchar',
        length: 512
    })
    public common_name!: string;

    /**
     * the issued leaf certificate PEM.
     */
    @Column({
        type: 'text',
        default: ''
    })
    public certificate!: string;

    /**
     * the certificate chain (leaf..root) as a JSON array of PEMs.
     */
    @Column({
        type: 'text',
        default: ''
    })
    public chain!: string;

    /**
     * issuance timestamp (epoch ms).
     */
    @Column({
        type: 'bigint',
        default: 0,
        transformer: epochMsColumnTransformer
    })
    public issued_at!: number;

    /**
     * expiry timestamp (epoch ms); 0 if unknown.
     */
    @Column({
        type: 'bigint',
        default: 0,
        transformer: epochMsColumnTransformer
    })
    public expires_at!: number;

    /**
     * whether this certificate has been revoked (own-PKI epic 9.4, revocation
     * 9.4.4). Short-lived leaves rely primarily on the real-time Hub allowlist;
     * this is the durable record the allowlist is rebuilt from.
     */
    @Column({
        default: false
    })
    public revoked!: boolean;

    /**
     * revocation timestamp (epoch ms); 0 if not revoked.
     */
    @Column({
        type: 'bigint',
        default: 0,
        transformer: epochMsColumnTransformer
    })
    public revoked_at!: number;

}