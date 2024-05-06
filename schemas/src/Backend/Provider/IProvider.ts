/**
 * Interface for a Provider
 */
export interface IProvider {

    /**
     * Return the keyname for provider as ident.
     * @returns {string}
     */
    getName(): string;

    /**
     * Return the title for provider (for frontend).
     * @returns {string}
     */
    getTitle(): string;

}