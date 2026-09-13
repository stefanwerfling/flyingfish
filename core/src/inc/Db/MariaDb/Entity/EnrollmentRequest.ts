import {Column, Entity} from 'typeorm';
import {DBBaseEntityId} from '../DBBaseEntityId.js';

/**
 * Enrollment request Entity — the persisted form of the EST-style enrollment
 * state machine (own-PKI epic 9.4). Mirrors the in-memory PkiEnrollmentRequest
 * so the PKI part container survives a restart with its pending queue intact:
 * a request is `pending` until an admin approves (or a token auto-approves),
 * then `issued` (linked to its issued_certificate) or `rejected`.
 *
 * `request_uid` is the service-level request id (uuid); the numeric `id` is the
 * table key. `issued_certificate_id` links to the issued row once issued (0 =
 * none). No DB foreign keys / indexes yet, matching the rest of the schema.
 */
@Entity({name: 'enrollment_request'})
export class EnrollmentRequest extends DBBaseEntityId {

    /**
     * the service-level request id (uuid).
     */
    @Column({
        type: 'varchar',
        length: 64
    })
    public request_uid!: string;

    /**
     * lifecycle state: `pending` / `issued` / `rejected`.
     */
    @Column({
        type: 'varchar',
        length: 16
    })
    public status!: string;

    /**
     * the CA purpose requested (`cluster` / `service` / `device`).
     */
    @Column({
        type: 'varchar',
        length: 32,
        default: ''
    })
    public purpose!: string;

    /**
     * the stable node identity assigned to the request.
     */
    @Column({
        type: 'varchar',
        length: 64
    })
    public node_uid!: string;

    /**
     * the requested common name.
     */
    @Column({
        type: 'varchar',
        length: 512
    })
    public common_name!: string;

    /**
     * additional SANs requested, as a JSON array of {type,value} entries.
     */
    @Column({
        type: 'text',
        default: ''
    })
    public sans!: string;

    /**
     * requested leaf validity in days.
     */
    @Column({
        default: 7
    })
    public validity_days!: number;

    /**
     * the PKCS#10 CSR PEM submitted by the node.
     */
    @Column({
        type: 'text',
        default: ''
    })
    public csr!: string;

    /**
     * id of the issued_certificate once issued (0 = not yet issued).
     */
    @Column({
        default: 0
    })
    public issued_certificate_id!: number;

    /**
     * creation timestamp (epoch ms).
     */
    @Column({
        default: 0
    })
    public created_at!: number;

}