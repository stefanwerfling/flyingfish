import {BaseEntity, Column, Entity, Index, PrimaryGeneratedColumn} from 'typeorm';

/**
 * CredentialUser
 */
@Entity({name: 'credential_user'})
export class CredentialUser extends BaseEntity {

    /**
     * id
     */
    @PrimaryGeneratedColumn()
    public id!: number;

    /**
     * credential id
     */
    @Index()
    @Column()
    public credential_id!: number;

    /**
     * username
     */
    @Column()
    public username!: string;

    /**
     * password
     */
    @Column()
    public password!: string;

    /**
     * disabled
     */
    @Index()
    @Column()
    public disabled!: boolean;

}