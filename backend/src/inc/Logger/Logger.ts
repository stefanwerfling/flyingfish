import winston, {Logger as WinstonLogger} from 'winston';
import TransportStream from 'winston-transport';
import DailyRotateFile from 'winston-daily-rotate-file';
import {Config} from '../Config/Config';

/**
 * Logger
 */
export class Logger {

    /**
     * winston logger
     * @protected
     */
    protected static _logger: WinstonLogger|null = null;

    /**
     * getLogger
     */
    public static getLogger(): WinstonLogger {
        if (Logger._logger === null) {
            const config = Config.get();

            let dirname = '/var/log/flyingfish/';
            let filename = 'flyingfish-%DATE%.log';
            let zippedArchive = false;
            let maxSize = '20m';
            let maxFiles = '14d';
            let level = 'warn';
            let enableConsole = true;

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

            const transport: DailyRotateFile = new DailyRotateFile({
                dirname,
                filename,
                datePattern: 'YYYY-MM-DD-HH',
                zippedArchive,
                maxSize,
                maxFiles
            });

            transport.on('rotate',
                (
                    oldFilename,
                    newFilename
                ) => {
                    console.log(`Logger change loggingfile: ${oldFilename} --> ${newFilename}`);
                });

            const transports: TransportStream[] = [transport];

            if (enableConsole) {
                transports.push(new winston.transports.Console({
                    handleExceptions: true
                }));
            }

            Logger._logger = winston.createLogger({
                level,
                transports
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