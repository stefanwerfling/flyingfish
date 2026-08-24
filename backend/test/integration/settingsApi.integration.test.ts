/**
 * API integration tests for the Settings controller (supertest + real MariaDB).
 * Covers the auth guard, the defaults returned on a fresh database, a
 * save-then-read-back round-trip and schema validation.
 *
 * Runs against a real MariaDB via the dbHarness - see the CI integration job.
 */
import {SettingsList, StatusCodes} from 'flyingfish_schemas';
import request from 'supertest';
import {Settings} from '../../src/Routes/Main/Settings.js';
import {buildApiApp, loginAgent} from './apiTestHelpers.js';
import {closeTestDb, initTestDb, resetTestDb} from './dbHarness.js';

const routes = [new Settings()];

const sampleSettings = (resolver = '1.1.1.1'): SettingsList => {
    return {
        nginx: {
            worker_connections: '1024',
            resolver: resolver
        },
        blacklist: {
            importer: 'off',
            iplocate: 'off'
        }
    };
};

describe('Settings API (integration)', () => {
    beforeAll(async() => {
        await initTestDb();
        await resetTestDb();
    });
    afterEach(resetTestDb);
    afterAll(closeTestDb);

    test('list requires authentication', async() => {
        const res = await request(buildApiApp(routes)).get('/json/settings/list');

        expect(res.body.statusCode).toBe(StatusCodes.UNAUTHORIZED);
    });

    test('list returns the nginx and blacklist setting groups', async() => {
        const agent = await loginAgent(routes);

        const res = await agent.get('/json/settings/list');
        expect(res.body.statusCode).toBe(StatusCodes.OK);
        expect(res.body.list.nginx).toHaveProperty('resolver');
        expect(res.body.list.blacklist).toHaveProperty('importer');
    });

    test('save then list reflects the stored settings', async() => {
        const agent = await loginAgent(routes);

        const save = await agent.post('/json/settings/save').send(sampleSettings('9.9.9.9'));
        expect(save.body.statusCode).toBe(StatusCodes.OK);

        const list = await agent.get('/json/settings/list');
        expect(list.body.list.nginx.resolver).toBe('9.9.9.9');
    });

    test('save rejects a schema-invalid payload', async() => {
        const agent = await loginAgent(routes);

        const res = await agent.post('/json/settings/save').send({nginx: {resolver: '1.1.1.1'}});

        expect(res.body.statusCode).toBe(StatusCodes.INTERNAL_ERROR);
    });
});