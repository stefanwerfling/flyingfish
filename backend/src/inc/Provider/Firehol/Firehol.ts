import AdmZip from 'adm-zip';
import {Logger} from 'flyingfish_core';
import {unlink} from 'fs/promises';
import path from 'path';
import {IpSetParser} from '../../Utils/IpSetParser.js';
import {FireholDownloader} from './FireholDownloader.js';

/**
 * Firehol
 */
export class Firehol {

    /**
     * ipsets
     * @protected
     */
    protected _ipsets: Map<string, IpSetParser> = new Map();

    /**
     * loadList
     */
    public async loadList(): Promise<boolean> {
        const downloader = new FireholDownloader();
        const zipFile = await downloader.load();

        try {
            const zip = new AdmZip(zipFile);

            const entries = zip.getEntries();

            for (const entry of entries) {
                const entrieFilenameExt = path.extname(entry.entryName);

                if (entrieFilenameExt.toLowerCase() === '.ipset') {
                    Logger.getLogger().silly(`Firehol::loadLists: parse ipset file: ${entry.entryName}`);

                    const content = entry.getData().toString('utf8');
                    const parser = new IpSetParser(content);

                    if (parser.countIps() > 0) {
                        this._ipsets.set(entry.entryName, parser);
                    }
                }
            }

            Logger.getLogger().info('Firehol::loadLists: finish');
        } finally {
            try {
                await unlink(zipFile);
            } catch (err) {
                Logger.getLogger().error(`Firehol::loadLists: ${err}`);
            }
        }

        return true;
    }

    /**
     * getIpSets
     */
    public getIpSets(): Map<string, IpSetParser> {
        return this._ipsets;
    }

}