/**
 * UnknownResponse
 */
export class UnknownResponse extends Error {

    /**
     * constructor
     * @param message
     */
    public constructor(message?: any) {
        let msg = '';

        if (message) {
            msg = message;
        }

        super(msg);
    }

}