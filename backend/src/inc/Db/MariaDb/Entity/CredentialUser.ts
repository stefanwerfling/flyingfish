import {BaseEntity, Column, Entity, Index, PrimaryGeneratedColumn} from 'typeorm';

/**
 * CredentialUser
 */
@Entity({name: 'credential_user'})
export class CredentialUser extends BaseEntity {

    @PrimaryGeneratedColumn()
    public id!: number;

    @Index()
    @Column()
    public credential_id!: number;

    @Column()
    public username!: string;

    @Column()
    public password!: string;

    @Index()
    @Column()
    public disabled!: boolean;

}