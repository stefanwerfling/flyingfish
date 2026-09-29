import {Column, Entity, Index} from 'typeorm';
import {DBBaseEntityId} from '../DBBaseEntityId.js';

/**
 * NginxLocation
 */
@Entity({name: 'nginx_location'})
export class NginxLocation extends DBBaseEntityId {

    /**
     * http id
     */
    @Index()
    @Column()
    public http_id!: number;

    /**
     * destination type
     */
    @Column()
    public destination_type!: number;

    /**
     * redirect code
     */
    @Column({
        default: 0
    })
    public redirect_code!: number;

    /**
     * redirect to url
     */
    @Column({
        default: ''
    })
    public redirect!: string;

    /**
     * match
     */
    @Column({
        default: '/'
    })
    public match!: string;

    /**
     * modifier
     */
    @Column({
        default: ''
    })
    public modifier!: string;

    /**
     * proxy pass
     */
    @Column({
        default: ''
    })
    public proxy_pass!: string;

    /**
     * auth enable
     */
    @Column({
        default: false
    })
    public auth_enable!: boolean;

    /**
     * auth relam
     */
    @Column({
        default: ''
    })
    public auth_relam!: string;

    /**
     * JWT auth enable (nginx-native Phase F): require a valid JWT for this location,
     * validated locally by the native ngx_http_flyingfish_jwt module (no socket call).
     */
    @Column({
        default: false
    })
    public jwt_auth_enable!: boolean;

    /**
     * JWT algorithm: HS256 | RS256 | ES256 | EdDSA
     */
    @Column({
        default: 'HS256'
    })
    public jwt_alg!: string;

    /**
     * JWT HMAC shared secret (HS256 only)
     */
    @Column({
        default: ''
    })
    public jwt_secret!: string;

    /**
     * JWT public key in PEM (asymmetric algorithms); written to a key file at build time
     */
    @Column({
        type: 'text',
        nullable: true
    })
    public jwt_public_key!: string;

    /**
     * JWT expected issuer (iss), empty = unchecked
     */
    @Column({
        default: ''
    })
    public jwt_iss!: string;

    /**
     * JWT expected audience (aud), empty = unchecked
     */
    @Column({
        default: ''
    })
    public jwt_aud!: string;

    /**
     * JWT required claim as "name:value" (e.g. scope:admin), empty = unchecked
     */
    @Column({
        default: ''
    })
    public jwt_require!: string;

    /**
     * JWT clock-skew leeway in seconds
     */
    @Column({
        default: 0
    })
    public jwt_leeway!: number;

    /**
     * ssh port out id
     */
    @Column({
        default: 0
    })
    public sshport_out_id!: number;

    /**
     * ssh port schema
     */
    @Column({
        default: ''
    })
    public sshport_schema!: string;

    /**
     * websocket enable
     */
    @Column({
        default: false
    })
    public websocket_enable!: boolean;

    /**
     * host enable
     */
    @Column({
        default: true
    })
    public host_enable!: boolean;

    /**
     * host name
     */
    @Column({
        default: ''
    })
    public host_name!: string;

    /**
     * host name port
     */
    @Column({
        default: 0
    })
    public host_name_port!: number;

    /**
     * xforwarded scheme enable
     */
    @Column({
        default: true
    })
    public xforwarded_scheme_enable!: boolean;

    /**
     * xforwarded proto enable
     */
    @Column({
        default: true
    })
    public xforwarded_proto_enable!: boolean;

    /**
     * xforwarded for enable
     */
    @Column({
        default: true
    })
    public xforwarded_for_enable!: boolean;

    /**
     * xrealip enable
     */
    @Column({
        default: true
    })
    public xrealip_enable!: boolean;

}