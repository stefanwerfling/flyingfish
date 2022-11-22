import {BaseEntity, Column, Entity, Index, PrimaryGeneratedColumn} from 'typeorm';

/**
 * Settings
 */
@Entity({name: 'settings'})
export class Settings extends BaseEntity {

    @PrimaryGeneratedColumn()
    public id!: number;

    @Index()
    @Column({
        type: 'varchar',
        length: 512
    })
    public name!: string;

    @Column({
        type: 'text',
        default: ''
    })
    public value!: string;

}