import winston, {Logger as WinstonLogger} from 'winston';
import TransportStream from 'winston-transport';
import DailyRotateFile from 'winston-daily-rotate-file';
import {Config} from '../Config/Config.js';
import {DirHelper} from '../Utils/DirHelper.js';
import {FileHelper} from '../Utils/FileHelper.js';
import * as path from 'path';

/**
 * Logger
 */
export class Logger {

    public static readonly DEFAULT_DIR = '/var/log/flyingfish/';
    public static readonly DEFAULT_FILENAME = 'flyingfish-%DATE%.log';
    public static readonly DEFAULT_ZIPPED = false;
    public static readonly DEFAULT_MAX_SIZE = '20m';
    public static readonly DEFAULT_MAX_FILES = '14d';
    public static readonly DEFAULT_LEVEL = 'warn';
    public static readonly DEFAULT_CONSOLE = true;

    /**
     * winston logger
     * @protected
     */
    protected static _logger: WinstonLogger|null = null;

    /**
     * Clean log files
     * @param {string} logPath
     * @param {number} maxDays
     */
    public static async cleanLogfiles(logPath: string, maxDays: number): Promise<void> {
        const files = await DirHelper.readdir(logPath);

        for await (const file of files) {
            try {
                const filePath = path.join(logPath, file);

                const isOlder = await FileHelper.isOlderHours(
                    filePath,
                    maxDays * 24,
                );

                if (isOlder) {
                    await FileHelper.fileDelete(filePath);
                    console.info('Delete old log file: ', filePath);
                }
            }
            catch (e) {
                console.error(e);
            }
        }
    }

    /**
     * getLogger
     */
    public static getLogger(): WinstonLogger {
        if (Logger._logger === null) {
            const config = Config.getInstance().get();

            let dirname = Logger.DEFAULT_DIR;
            let filename = Logger.DEFAULT_FILENAME;
            let zippedArchive = Logger.DEFAULT_ZIPPED;
            let maxSize = Logger.DEFAULT_MAX_SIZE;
            let maxFiles = Logger.DEFAULT_MAX_FILES;
            let level = Logger.DEFAULT_LEVEL;
            let enableConsole = Logger.DEFAULT_CONSOLE;

            if (config !== null) {
                if (config.logging) {
                    if (config.logging.dirname) {
                        dirname = config.logging.dirname;
                    }

                    if (config.logging.filename) {
                        filename = config.logging.filename;
                    }

                    if (config.logging.zippedArchive) {
                        zippedArchive = config.logging.zippedArchive;
                    }

                    if (config.logging.maxSize) {
                        maxSize = config.logging.maxSize;
                    }

                    if (config.logging.maxFiles) {
                        maxFiles = config.logging.maxFiles;
                    }

                    if (config.logging.level) {
                        level = config.logging.level;
                    }

                    if (config.logging.enableConsole) {
                        enableConsole = config.logging.enableConsole;
                    }
                }
            }

            // Clean old logs ------------------------------------------------------------------------------------------

            Logger.cleanLogfiles(dirname, parseInt(maxFiles, 10)).then();

            // ---------------------------------------------------------------------------------------------------------

            const transports: TransportStream[] = [];

            try {
                const dRFtransport: DailyRotateFile = new DailyRotateFile({
                    dirname: dirname,
                    filename: filename,
                    datePattern: 'YYYY-MM-DD-HH',
                    zippedArchive: zippedArchive,
                    maxSize: maxSize,
                    maxFiles: maxFiles
                });

                dRFtransport.on(
                    'rotate',
                    (
                        oldFilename,
                        newFilename
                    ) => {
                        console.log(`Logger change loggingfile: ${oldFilename} --> ${newFilename}`);
                    }
                );

                transports.push(dRFtransport);
            } catch (e) {
                console.error(e);
                enableConsole = true;
            }

            if (enableConsole) {
                transports.push(new winston.transports.Console({
                    handleExceptions: true
                }));
            }

            const { combine, timestamp, splat, json } = winston.format;

            Logger._logger = winston.createLogger({
                level: level,
                format: combine(
                    timestamp(),
                    splat(),
                    json()
                ),
                transports: transports
            });

            console.log('Create Logger with:');
            console.log(`   * Level: ${level}`);

            let transStr = '';

            for (const ttransport of transports) {
                if (transStr.length > 0) {
                    transStr += ', ';
                }

                transStr += `${ttransport.constructor.name}`;
            }

            console.log(`   * Transports to: ${transStr}`);
            console.log('');

        }

        return Logger._logger;
    }

}