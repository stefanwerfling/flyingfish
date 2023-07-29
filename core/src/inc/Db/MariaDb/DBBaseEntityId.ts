import {BaseEntity, PrimaryGeneratedColumn} from 'typeorm';

/**
 * DBBaseEntityId
 */
export class DBBaseEntityId extends BaseEntity {

    /**
     * id
     */
    @PrimaryGeneratedColumn()
    public id!: number;

}