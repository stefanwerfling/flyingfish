import {RedisClient, RedisClientOptions} from './RedisClient.js';

export class RedisSubscribe {

    /**
     * Instance from RedisClient
     * @protected
     */
    protected static _instance: RedisClient|null = null;

    /**
     * Return an instance from RedisClient
     * @param {RedisClientOptions} options
     * @param {boolean} createClientInstance
     * @returns {RedisClient}
     */
    public static getInstance(options?: RedisClientOptions, createClientInstance?: boolean): RedisClient {
        if (RedisSubscribe._instance === null) {
            if (options) {
                RedisSubscribe._instance = new RedisClient(options);

                if (createClientInstance && !RedisClient.hasInstance()) {
                    RedisClient.getInstance(options);
                }
            } else {
                throw new Error('RedisClient::getInstance: Option not set for Regis client init!');
            }
        }

        return RedisSubscribe._instance;
    }

    /**
     * Return has an instance
     */
    public static hasInstance(): boolean {
        return RedisSubscribe._instance !== null;
    }

}