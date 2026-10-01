import {Column, Entity, Index} from 'typeorm';
import {DBBaseEntityId} from '../DBBaseEntityId.js';

/**
 * One persisted log record for the central Log-Center (observability epic): the component
 * ({@link area}) that produced it, its {@link level}, the rendered {@link message}, the
 * production timestamp ({@link ts}) and any structured context ({@link meta}, stored as a
 * JSON string). Records arrive via the `/json/logs/ingest` endpoint (parts push their
 * winston logs through the HubLogTransport) and are read back, filtered, by the log UI.
 */
@Entity({name: 'log_entry'})
export class LogEntry extends DBBaseEntityId {

    /**
     * When the record was produced (millisecond precision), indexed for time-range queries
     * and retention cleanup.
     */
    @Index()
    @Column({
        type: 'datetime',
        precision: 3
    })
    public ts!: Date;

    /**
     * The originating component/area (e.g. `netdevice`, `backend`, `nginx`, `dns`, `pki`).
     */
    @Index()
    @Column({
        type: 'varchar',
        length: 32,
        default: ''
    })
    public area!: string;

    /**
     * The log level (`error` | `warn` | `info` | `debug` | `silly` | …).
     */
    @Index()
    @Column({
        type: 'varchar',
        length: 16,
        default: 'info'
    })
    public level!: string;

    /**
     * The rendered log message.
     */
    @Column({
        type: 'text'
    })
    public message!: string;

    /**
     * Structured context (winston meta) as a JSON string, or null when there was none.
     */
    @Column({
        type: 'text',
        nullable: true
    })
    public meta!: string | null;
}
