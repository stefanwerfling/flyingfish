import DNS from 'dns2';
import {Logger} from '../../Logger/Logger.js';

/**
 * IpBlacklistCheck
 */
export type IpBlacklistCheck = {
    rbl: string;
    listed: boolean;
};

/**
 * IpBlacklist
 */
export class IpBlacklist {

    /**
     * RBL list
     * @protected
     */
    protected _rblList = [
        'all.s5h.net',
        'sbl.spamhaus.org',
        'bl.spamcop.net',
        'bogons.cymru.com',
        'cdl.anti-spam.org.cn',
        'db.wpbl.info',
        'dnsbl-2.uceprotect.net',
        'dnsbl.anticaptcha.net',
        'dnsbl.inps.de',
        // 'dnsbl.spfbl.net',
        'duinv.aupads.org',
        'dyna.spamrats.com',
        'http.dnsbl.sorbs.net',
        'ix.dnsbl.manitu.net',
        'misc.dnsbl.sorbs.net',
        'orvedb.aupads.org',
        'proxy.bl.gweep.ca',
        'relays.bl.gweep.ca',
        'sbl.spamhaus.org',
        'singular.ttk.pte.hu',
        'socks.dnsbl.sorbs.net',
        'spam.dnsbl.anonmails.de',
        'spam.spamrats.com',
        'spamrbl.imp.ch',
        'ubl.lashback.com',
        'virus.rbl.jp',
        'wormrbl.imp.ch',
        'z.mailspike.net',
        'zombie.dnsbl.sorbs.net',
        'b.barracudacentral.org',
        'blacklist.woody.ch',
        'cbl.abuseat.org',
        'combined.abuse.ch',
        'dnsbl-1.uceprotect.net',
        'dnsbl-3.uceprotect.net',
        'dnsbl.dronebl.org',
        'dnsbl.sorbs.net',
        'drone.abuse.ch',
        'dul.dnsbl.sorbs.net',
        'dynip.rothen.com',
        'ips.backscatterer.org',
        'korea.services.net',
        'noptr.spamrats.com',
        'pbl.spamhaus.org',
        'psbl.surriel.com',
        'relays.nether.net',
        'short.rbl.jp',
        'smtp.dnsbl.sorbs.net',
        'spam.abuse.ch',
        'spam.dnsbl.sorbs.net',
        'spambot.bls.digibase.ca',
        'spamsources.fabel.dk',
        'ubl.unsubscore.com',
        'web.dnsbl.sorbs.net',
        'xbl.spamhaus.org',
        'zen.spamhaus.org'
    ];

    /**
     * check
     * @param ip
     */
    public async check(ip: string): Promise<IpBlacklistCheck[]> {
        const quads = ip.split('.');
        const rip = `${quads[3]}.${quads[2]}.${quads[1]}.${quads[0]}`;

        const requests: Promise<IpBlacklistCheck>[] = [];

        for (const rbl of this._rblList) {
            requests.push(this.checkPromis(`${rip}.${rbl}`, rbl));
        }

        return Promise.all(requests);
    }

    /**
     * checkPromis
     * @param dnsName
     * @param rbl
     */
    public async checkPromis(dnsName: string, rbl: string): Promise<IpBlacklistCheck> {
        return {
            rbl: rbl,
            listed: await this.checkdnsrr(dnsName)
        };
    }

    /**
     * checkdnsrr
     * @param dnsName
     */
    public async checkdnsrr(dnsName: string): Promise<boolean> {
        const dns = new DNS();
        const result = await dns.resolveA(dnsName);

        Logger.getLogger().silly(`IpBlacklist::checkdnsrr: result for "${dnsName}" is: ${result.answers.length > 0}`);

        return result.answers.length > 0;
    }

}