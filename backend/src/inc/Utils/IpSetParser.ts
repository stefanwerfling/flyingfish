import {BlacklistCategory} from '../Db/MariaDb/Entity/IpBlacklistCategory.js';

export type IpSetMeta = {
    maintainer?: string;
    maintainer_url?: string;
    list_source_url?: string;
    source_file_date?: string;
    category?: string;
    version?: string;
    this_file_date?: string;
};

export type IpSet = {
    ip: string;
};

/**
 * IpSetParser
 */
export class IpSetParser {

    /**
     * meta
     * @protected
     */
    protected _meta: IpSetMeta = {};

    /**
     * _ips
     * @protected
     */
    protected _ips: IpSet[] = [];

    /**
     * constructor
     * @param buffer
     */
    public constructor(buffer: string) {
        const lines = buffer.split('\n');

        for (const line of lines) {
            // meta data
            if (line.startsWith('#')) {
                const seperater = line.indexOf(':');

                if (seperater > -1) {
                    const key = line.substring(1, seperater);
                    const value = line.substring(seperater + 1).trim().trimStart();

                    switch (key.trim().toLowerCase()) {
                        case 'maintainer':
                            this._meta.maintainer = value;
                            break;

                        case 'maintainer url':
                            this._meta.maintainer_url = value;
                            break;

                        case 'list source url':
                            this._meta.list_source_url = value;
                            break;

                        case 'source file date':
                            this._meta.source_file_date = value;
                            break;

                        case 'category':
                            this._meta.category = value;
                            break;

                        case 'version':
                            this._meta.version = value;
                            break;

                        case 'this file date':
                            this._meta.this_file_date = value;
                            break;
                    }
                }
            } else {
                const ipvalue = line.trim().trimStart();

                if (ipvalue.length > 0) {
                    this._ips.push({
                        ip: ipvalue
                    });
                }
            }
        }
    }

    /**
     * getMeta
     */
    public getMeta(): IpSetMeta {
        return this._meta;
    }

    /**
     * getBlacklistCategory
     */
    public getBlacklistCategory(): BlacklistCategory|null {
        if (this._meta.category) {
            switch (this._meta.category) {
                case 'reputation':
                    return BlacklistCategory.reputation;

                case 'malware':
                    return BlacklistCategory.malware;

                case 'attacks':
                    return BlacklistCategory.attacks;

                case 'abuse':
                    return BlacklistCategory.abuse;

                case 'spam':
                    return BlacklistCategory.spam;

                case 'organizations':
                    return BlacklistCategory.organizations;

                case 'geolocation':
                    return BlacklistCategory.geolocation;
            }
        }

        return null;
    }

    /**
     * getIps
     */
    public getIps(): IpSet[] {
        return this._ips;
    }

    /**
     * countIps
     */
    public countIps(): number {
        return this._ips.length;
    }

}