/**
 * Characterization test for the nginx config generation (integration).
 *
 * Captures NginxService.generateConfig() output for a known database state so
 * the upcoming _loadConfig -> NginxConfigBuilder extraction can be proven
 * behaviour-preserving (the snapshot must not change).
 */
import {mkdirSync} from 'node:fs';
import {DBSetup} from '../../src/inc/Db/MariaDb/DBSetup.js';
import {FlyingFishConfig} from '../../src/Application/Config/FlyingFishConfig.js';
import {NginxServer} from '../../src/inc/Nginx/NginxServer.js';
import {NginxService} from '../../src/Application/Service/NginxService.js';
import {closeTestDb, initTestDb} from './dbHarness.js';

describe('NginxService config generation (characterization, integration)', () => {
    beforeAll(async() => {
        await initTestDb();

        const config = FlyingFishConfig.getInstance().get();
        if (config) {
            config.nginx = {
                prefix: '/tmp/ff-char-nginx',
                secret: 'characterization-secret'
            };
            FlyingFishConfig.getInstance().set(config);
        }

        mkdirSync('/tmp/ff-char-nginx/logs', {recursive: true});

        NginxServer.getInstance({
            config: '/tmp/ff-char-nginx.conf',
            prefix: '/tmp/ff-char-nginx'
        });
    });

    afterAll(closeTestDb);

    test('generates a baseline config from an empty database', async() => {
        const conf = await NginxService.getInstance().generateConfig();

        expect(conf).toContain('events {');
        expect(conf).toContain('http {');
        expect(conf).toMatchSnapshot();
    });

    // Runs after the empty-database test (same shared DB, serial run): seeds the
    // default install state (listeners, default domain, streams) and captures the
    // richer config that exercises the DB-driven generation loops.
    test('generates a config for the default install (DBSetup.firstInit)', async() => {
        await DBSetup.firstInit();

        const conf = await NginxService.getInstance().generateConfig();

        expect(conf).toContain('stream {');
        expect(conf).toContain('http {');
        expect(conf).toMatchSnapshot();
    });
});