/**
 * Certbot
 */
export class Certbot {

    /**
     * command
     * @protected
     */
    protected _command: string = 'certbot';

    /**
     * config file
     * @protected
     */
    protected _config: string = '/etc/letsencrypt.ini';

    /**
     * domain
     * @param domain
     */
    public create(domain: string): void {

    }
}