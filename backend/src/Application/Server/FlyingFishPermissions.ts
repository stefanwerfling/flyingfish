import {PermissionService, RbacDbDataSource} from 'flyingfish_core';

/**
 * App-wide accessor for the RBAC {@link PermissionService} backed by the database
 * (RBAC epic 9.5.13). Route guards and handlers call
 * `FlyingFishPermissions.getInstance().can(userId, permission, resource?)` to enforce
 * rights.
 */
export class FlyingFishPermissions {

    /**
     * instance
     * @private
     */
    private static _instance: PermissionService | null = null;

    /**
     * The shared permission service (DB-backed).
     * @returns {PermissionService}
     */
    public static getInstance(): PermissionService {
        if (FlyingFishPermissions._instance === null) {
            FlyingFishPermissions._instance = new PermissionService(new RbacDbDataSource());
        }

        return FlyingFishPermissions._instance;
    }

}