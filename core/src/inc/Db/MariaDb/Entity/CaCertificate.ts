import {Column, Entity} from 'typeorm';
import {DBBaseEntityId} from '../DBBaseEntityId.js';

/**
 * CA certificate Entity — one node in the FlyingFish internal CA tree (own-PKI
 * epic 9.4). The tree is modelled by the self-reference `parent_ca_id`: the
 * self-signed Root has `parent_ca_id` 0, and each purpose Intermediate points at
 * the Root's id. This persists the in-memory CA-tree ceremony (PkiCaTree /
 * PkiCaNode) so the online PKI part container can load it instead of re-running
 * the ceremony on every start.
 *
 * The private key PEM is stored here for the online intermediates; the design
 * has the Root offline and the intermediate keys encrypted at rest — the
 * encryption layer is a later concern, the column holds the PEM for now.
 *
 * Relations are plain id columns without a DB foreign key, matching the rest of
 * the schema (e.g. DomainRecord.domain_id). No indexes are declared yet — the CA
 * tree is tiny (Root + a handful of intermediates).
 */
@Entity({name: 'ca_certificate'})
export class CaCertificate extends DBBaseEntityId {

    /**
     * id of the parent CA in the tree (0 = the self-signed Root, no parent).
     */
    @Column({
        default: 0
    })
    public parent_ca_id!: number;

    /**
     * the kind of CA: `root` or `intermediate`.
     */
    @Column({
        type: 'varchar',
        length: 32
    })
    public ca_type!: string;

    /**
     * the purpose this CA is dedicated to (`cluster` / `service` / `device`);
     * empty for the Root.
     */
    @Column({
        type: 'varchar',
        length: 32,
        default: ''
    })
    public purpose!: string;

    /**
     * the distinguished name (subject) of this CA.
     */
    @Column({
        type: 'varchar',
        length: 512
    })
    public subject!: string;

    /**
     * the key/signature algorithm (`Ed25519` / `P-256`).
     */
    @Column({
        type: 'varchar',
        length: 32
    })
    public algorithm!: string;

    /**
     * the CA certificate PEM.
     */
    @Column({
        type: 'text',
        default: ''
    })
    public certificate!: string;

    /**
     * the CA private key PEM (encryption at rest is a later concern).
     */
    @Column({
        type: 'text',
        default: ''
    })
    public private_key!: string;

    /**
     * the CA public key PEM.
     */
    @Column({
        type: 'text',
        default: ''
    })
    public public_key!: string;

    /**
     * creation timestamp (epoch ms).
     */
    @Column({
        default: 0
    })
    public created_at!: number;

}