import {Connection, ConnectionOptions, createConnection, EntityTarget, Repository} from 'typeorm';

/**
 * MariaDbHelper
 */
export class MariaDbHelper {

    /**
     * connection
     * @private
     */
    private static _connection: Connection;

    /**
     * init
     * @param options
     */
    public static async init(options: ConnectionOptions): Promise<void> {
        MariaDbHelper._connection = await createConnection(options);
    }

    /**
     * getConnection
     */
    public static getConnection(): Connection {
        return this._connection;
    }

    /**
     * getRepository
     * @param target
     */
    public static getRepository<Entity>(target: EntityTarget<Entity>): Repository<Entity> {
        const connection = MariaDbHelper.getConnection();

        if (!connection) {
            throw new Error('connection is empty');
        }

        return connection.getRepository(target);
    }

}