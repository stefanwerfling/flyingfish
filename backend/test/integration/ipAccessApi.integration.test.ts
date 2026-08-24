/**
 * API integration tests for the IpAccess controller (supertest + real MariaDB).
 * Covers the whitelist and own-blacklist CRUD round-trips plus the maintainer
 * and blacklist-import list reads, auth and schema validation.
 *
 * The blacklist *import* save is intentionally not exercised (it pulls from an
 * external maintainer source).
 *
 * Runs against a real MariaDB via the dbHarness - see the CI integration job.
 */
import {StatusCodes} from 'flyingfish_schemas';
import request from 'supertest';
import {IpAccess} from '../../src/Routes/Main/IpAccess.js';
import {buildApiApp, loginAgent} from './apiTestHelpers.js';
import {closeTestDb, initTestDb, resetTestDb} from './dbHarness.js';

const routes = [new IpAccess()];

const ipEntry = (ip: string): {id: number; ip: string; disabled: boolean; description: string;} => {
    return {
        id: 0,
        ip: ip,
        disabled: false,
        description: 'test'
    };
};

describe('IpAccess API (integration)', () => {
    beforeAll(async() => {
        await initTestDb();
        await resetTestDb();
    });
    afterEach(resetTestDb);
    afterAll(closeTestDb);

    test('whitelist requires authentication', async() => {
        const res = await request(buildApiApp(routes)).get('/json/ipaccess/whitelist');

        expect(res.body.statusCode).toBe(StatusCodes.UNAUTHORIZED);
    });

    test('whitelist save then list then delete round-trip', async() => {
        const agent = await loginAgent(routes);

        const save = await agent.post('/json/ipaccess/whitelist/save').send(ipEntry('10.0.0.1'));
        expect(save.body.statusCode).toBe(StatusCodes.OK);

        const list = await agent.get('/json/ipaccess/whitelist');
        expect(list.body.statusCode).toBe(StatusCodes.OK);
        expect(list.body.list).toHaveLength(1);
        expect(list.body.list[0].ip).toBe('10.0.0.1');

        const del = await agent.post('/json/ipaccess/whitelist/delete').send({id: list.body.list[0].id});
        expect(del.body.statusCode).toBe(StatusCodes.OK);

        const after = await agent.get('/json/ipaccess/whitelist');
        expect(after.body.list).toHaveLength(0);
    });

    test('own blacklist save then list then delete round-trip', async() => {
        const agent = await loginAgent(routes);

        const save = await agent.post('/json/ipaccess/blacklist/own/save').send(ipEntry('10.0.0.2'));
        expect(save.body.statusCode).toBe(StatusCodes.OK);

        const list = await agent.get('/json/ipaccess/blacklist/owns');
        expect(list.body.statusCode).toBe(StatusCodes.OK);
        expect(list.body.list).toHaveLength(1);
        expect(list.body.list[0].ip).toBe('10.0.0.2');

        const del = await agent.post('/json/ipaccess/blacklist/delete').send({id: list.body.list[0].id});
        expect(del.body.statusCode).toBe(StatusCodes.OK);

        const after = await agent.get('/json/ipaccess/blacklist/owns');
        expect(after.body.list).toHaveLength(0);
    });

    test('maintainer list returns OK on a fresh database', async() => {
        const agent = await loginAgent(routes);

        const res = await agent.get('/json/ipaccess/maintainer/list');
        expect(res.body.statusCode).toBe(StatusCodes.OK);
        expect(res.body.list).toEqual([]);
    });

    test('blacklist imports list returns OK on a fresh database', async() => {
        const agent = await loginAgent(routes);

        const res = await agent.get('/json/ipaccess/blacklist/imports');
        expect(res.body.statusCode).toBe(StatusCodes.OK);
        expect(res.body.list).toEqual([]);
    });

    test('whitelist save rejects a schema-invalid payload', async() => {
        const agent = await loginAgent(routes);

        const res = await agent.post('/json/ipaccess/whitelist/save').send({ip: '10.0.0.3'});

        expect(res.body.statusCode).toBe(StatusCodes.INTERNAL_ERROR);
    });
});