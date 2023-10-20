import { DBTableLoaderOnLoadEvent } from 'flyingfish_core';
import { EntitySchema } from 'typeorm';
export declare class LoadDb implements DBTableLoaderOnLoadEvent {
    onRegisterEntities(): Promise<EntitySchema[]>;
}
