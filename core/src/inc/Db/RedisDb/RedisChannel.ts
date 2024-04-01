import {EtsError} from 'ets';
import {RedisChannels} from './RedisChannels.js';

/**
 * Default Redis channel
 */
export class RedisChannel<T> {

    /**
     * Name of a channel
     * @protected
     */
    protected _name: RedisChannels;

    /**
     * Constructor
     * @param {RedisChannels} name
     */
    public constructor(name: RedisChannels) {
        this._name = name;
    }

    /**
     * Return the name of channel
     */
    public getName(): string {
        return this._name;
    }

    /**
     * Listen
     * @param {T} data
     */
    public async listen(data: T): Promise<void> {
        throw new EtsError(`RedisChannel::listen is not implemented! Data: ${JSON.stringify(data)}`);
    }

}