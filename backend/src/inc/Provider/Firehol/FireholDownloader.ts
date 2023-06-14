import {FileHelper, Logger} from 'flyingfish_core';
import fs, {createWriteStream} from 'fs';
import got from 'got';
import * as stream from 'stream';
import {promisify} from 'util';

/**
 * FireholDownloader
 */
export class FireholDownloader {

    /**
     * download url
     * @protected
     */
    protected _url = 'https://github.com/firehol/blocklist-ipsets/archive/refs/heads/master.zip';

    /**
     * tmp dir
     * @protected
     */
    protected _tmpDir = '/tmp/';

    /**
     * load
     */
    public async load(): Promise<string> {
        const fileName = `${this._tmpDir}master.zip`;

        if (await FileHelper.fileExist(fileName)) {
            if (await FileHelper.isOlderHours(fileName, 24)) {
                fs.unlinkSync(fileName);
            }
        }

        const dlStream = got.stream(this._url);
        const fwStream = createWriteStream(fileName);

        dlStream.on('downloadProgress', (transferred) => {
            const percentage = Math.round(transferred.percent * 100);

            Logger.getLogger().silly(`FireholDownloader::load: progress: ${transferred.transferred}/${transferred.total} (${percentage}%)`);
        });

        try {
            const pipeline = promisify(stream.pipeline);
            await pipeline(dlStream, fwStream);

            Logger.getLogger().info(`FireholDownloader::load: File downloaded to ${fileName}`);
        } catch ({message}) {
            console.error(`FireholDownloader::load: Something went wrong. ${message}`);
        }

        return fileName;
    }

}