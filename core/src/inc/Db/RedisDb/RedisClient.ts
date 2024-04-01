import {createClient, RedisClientType} from 'redis';
import {Logger} from '../../Logger/Logger.js';
import {RedisChannel} from './RedisChannel.js';

/**
 * Redis client options
 */
export type RedisClientOptions = {
    url: string;
    password?: string;
};

export type FunChannelCallback = (message: string) => Promise<void>;

/**
 * Redis client object
 */
export class RedisClient {

    /**
     * Instance from RedisClient
     * @protected
     */
    protected static _instance: RedisClient|null = null;

    /**
     * Return an instance from RedisClient
     * @param {RedisClientOptions} options
     * @returns {RedisClient}
     */
    public static getInstance(options?: RedisClientOptions): RedisClient {
        if (RedisClient._instance === null) {
            if (options) {
                RedisClient._instance = new RedisClient(options);
            } else {
                throw new Error('RedisClient::getInstance: Option not set for Regis client init!');
            }
        }

        return RedisClient._instance;
    }

    /**
     * Return has an instance
     */
    public static hasInstance(): boolean {
        return RedisClient._instance !== null;
    }

    /**
     * Client object
     * @protected
     */
    protected _client: RedisClientType;

    /**
     * Is Connect
     * @protected
     */
    protected _isConnect: boolean = false;

    /**
     * Constructor
     * @param {RedisClientOptions} options
     * @private
     */
    private constructor(options: RedisClientOptions) {
        if (options.password) {
            this._client = createClient({
                url: options.url,
                password: options.password
            });
        } else {
            this._client = createClient({
                url: options.url,
            });
        }

        this._client.on('error', (err) => {
            Logger.getLogger().error('RedisClient::client::error: Redis Client Error', err);
        });
    }

    /**
     * Connect to server
     */
    public async connect(): Promise<void> {
        if (await this._client.connect()) {
            this._isConnect = true;
        }
    }

    /**
     * Disconnect from server
     */
    public async disconnect(): Promise<void> {
        if (!this._isConnect) {
            return;
        }

        await this._client.disconnect();
        this._isConnect = false;
    }

    /**
     * register a channel
     * @param {string} channel
     * @param {FunChannelCallback} callback
     */
    protected async _registerChannel(channel: string, callback: FunChannelCallback): Promise<void> {
        if (!this._isConnect) {
            return;
        }

        await this._client.subscribe(channel, async(message) => {
            await callback(message);
        });
    }

    public async registerChannels(channels: RedisChannel<any>[]): Promise<void> {
        for await (const channel of channels) {
            await this._registerChannel(
                channel.getName(),
                async(message: string): Promise<void> => {
                    try {
                        const data = JSON.parse(message);
                        await channel.listen(data);
                    } catch (e) {
                        Logger.getLogger().error('RedisClient::registerChannels: Redis client channel resive data parse error!');
                        Logger.getLogger().error(e);
                    }
                }
            );
        }
    }

}