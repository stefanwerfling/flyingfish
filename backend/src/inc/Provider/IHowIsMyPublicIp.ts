/**
 * IHowIsMyPublicIp
 */
export interface IHowIsMyPublicIp {

    /**
     * getName
     */
    getName(): string;

    /**
     * get
     */
    get(): Promise<string|null>;
}