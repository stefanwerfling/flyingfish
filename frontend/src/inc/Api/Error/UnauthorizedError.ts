/**
 * UnauthorizedError
 */
export class UnauthorizedError extends Error {

    /**
     * constructor
     * @param message
     */
    constructor(message?: string) {
        let msg = '';

        if (message) {
            msg = message;
        }

        super(msg);
    }
}