import {BaseEntity, Column, Entity, Index, PrimaryGeneratedColumn} from 'typeorm';

@Entity({name: 'credential'})
export class Credential extends BaseEntity {

    @PrimaryGeneratedColumn()
        // @ts-ignore
    id: number;

    @Index()
    @Column()
        // @ts-ignore
    location_id: number;

    @Column()
        // @ts-ignore
    scheme: number;

    @Column()
        // @ts-ignore
    provider: string;

    @Column()
        // @ts-ignore
    position: number;

    @Column({
        type: 'text',
        default: ''
    })
        // @ts-ignore
    settings: string;

}