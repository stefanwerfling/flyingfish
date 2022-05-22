import {BaseEntity, Column, Entity, Index, PrimaryGeneratedColumn} from 'typeorm';

/**
 * CredentialUser
 */
@Entity({name: 'credential_user'})
export class CredentialUser extends BaseEntity {

    @PrimaryGeneratedColumn()
        // @ts-ignore
    id: number;

    @Index()
    @Column()
        // @ts-ignore
    credential_id: number;

    @Column()
        // @ts-ignore
    username: string;

    @Column()
        // @ts-ignore
    password: string;

    @Index()
    @Column()
        // @ts-ignore
    disabled: boolean;

}