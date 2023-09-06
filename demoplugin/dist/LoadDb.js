import { IDBTableLoaderOnLoadEvent } from 'flyingfish_core';
export class LoadDb extends IDBTableLoaderOnLoadEvent {
    getName() {
        return 'LoadDb';
    }
    async onRegisterEntities() {
        return [];
    }
}
//# sourceMappingURL=LoadDb.js.map