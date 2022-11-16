import {BaseEntity, Column, Entity, Index, PrimaryGeneratedColumn} from 'typeorm';

/**
 * Settings
 */
@Entity({name: 'settings'})
export class Settings extends BaseEntity {

    @PrimaryGeneratedColumn()
        // @ts-ignore
    id: number;

    @Index()
    @Column({
        type: 'varchar',
        length: 512
    })
        // @ts-ignore
    name: string;

    @Column({
        type: 'text',
        default: ''
    })
        // @ts-ignore
    value: string;

}