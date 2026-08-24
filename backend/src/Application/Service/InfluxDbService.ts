import {ServiceAbstract} from 'figtree';
import {ServiceStatus} from 'figtree-schemas';
import {Config} from '../../inc/Config/Config.js';
import {InfluxDbHelper} from '../../inc/Db/InfluxDb/InfluxDbHelper.js';

/**
 * InfluxDbService
 *
 * Initializes FlyingFish's own `InfluxDbHelper` (used by the nginx access-log
 * pipeline entities `NginxStreamAccess` / `NginxHttpAccess`). Migrated onto
 * figtree's `ServiceAbstract` as a lifecycle service, restoring the
 * `InfluxDbHelper.init()` call the former `main.ts` made when influx was
 * configured.
 *
 * NOTE: this wraps FlyingFish's `InfluxDbHelper` rather than figtree's
 * `InfluxDBService`, because the access-log entities read/write through the
 * FlyingFish helper singleton. Conditionally registered by `FlyingFishBackend`
 * only when `config.db.influx` is present. No dependency (the connection is
 * independent); registered early so it is ready before the nginx access log.
 */
export class InfluxDbService extends ServiceAbstract {

    /**
     * Name of the service.
     */
    public static readonly NAME = 'influxdb';

    /**
     * Constructor.
     */
    public constructor() {
        super(InfluxDbService.NAME);
    }

    /**
     * Initialize the InfluxDb connection from the configuration.
     */
    public override async start(): Promise<void> {
        this._status = ServiceStatus.Progress;

        const influx = Config.getInstance().get()?.db.influx;

        if (influx) {
            await InfluxDbHelper.init({
                url: influx.url,
                token: influx.token,
                org: influx.org,
                bucket: influx.bucket
            });
        }

        this._status = ServiceStatus.Success;
    }

}