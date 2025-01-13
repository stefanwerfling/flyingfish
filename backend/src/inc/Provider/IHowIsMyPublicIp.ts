/**
 * IHowIsMyPublicIp
 */
export interface IHowIsMyPublicIp {

    /**
     * Return the name of the provider
     * @returns {string}
     */
    getName(): string;

    /**
     * get return an ip
     * @returns {string|null}
     */
    get(): Promise<string|null>;

    /**
     * get64 return an ip6
     * @returns {string|null}
     */
    get64(): Promise<string|null>;
}