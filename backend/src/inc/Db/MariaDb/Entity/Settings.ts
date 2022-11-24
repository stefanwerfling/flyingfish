import {BaseEntity, Column, Entity, Index, PrimaryGeneratedColumn} from 'typeorm';

/**
 * Settings
 */
@Entity({name: 'settings'})
export class Settings extends BaseEntity {

    /**
     * id
     */
    @PrimaryGeneratedColumn()
    public id!: number;

    /**
     * name
     */
    @Index()
    @Column({
        type: 'varchar',
        length: 512
    })
    public name!: string;

    /**
     * value
     */
    @Column({
        type: 'text',
        default: ''
    })
    public value!: string;

}