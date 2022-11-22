import {BaseEntity, Column, Entity, Index, PrimaryGeneratedColumn} from 'typeorm';

/**
 * Credential
 */
@Entity({name: 'credential'})
export class Credential extends BaseEntity {

    @PrimaryGeneratedColumn()
    public id!: number;

    @Index()
    @Column()
    public location_id!: number;

    @Column()
    public scheme!: number;

    @Column()
    public provider!: string;

    @Column()
    public position!: number;

    @Column({
        type: 'text',
        default: ''
    })
    public settings!: string;

}