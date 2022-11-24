import {BaseEntity, Column, Entity, Index, PrimaryGeneratedColumn} from 'typeorm';

/**
 * Credential
 */
@Entity({name: 'credential'})
export class Credential extends BaseEntity {

    /**
     * id
     */
    @PrimaryGeneratedColumn()
    public id!: number;

    /**
     * location id
     */
    @Index()
    @Column()
    public location_id!: number;

    /**
     * scheme
     */
    @Column()
    public scheme!: number;

    /**
     * provider
     */
    @Column()
    public provider!: string;

    /**
     * position
     */
    @Column()
    public position!: number;

    /**
     * settings
     */
    @Column({
        type: 'text',
        default: ''
    })
    public settings!: string;

}