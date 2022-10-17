import {BaseEntity, Column, Entity, PrimaryGeneratedColumn} from 'typeorm';

/**
 * Gateway Identifier Entity
 */
@Entity({name: 'gateway_identifier'})
export class GatewayIdentifier extends BaseEntity {

    @PrimaryGeneratedColumn()
        // @ts-ignore
    id: number;

    @Column()
        // @ts-ignore
    networkname: string;

    @Column()
        // @ts-ignore
    mac_address: string;

    @Column({
        default: ''
    })
        // @ts-ignore
    address: string;

    @Column({
        default: ''
    })
        // @ts-ignore
    color: string;

}