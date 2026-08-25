/**
 * API integration tests for the Hub registry endpoints (v2 DNS pilot).
 *
 * Drives register / heartbeat / bye / parts / ui-contributions through the HTTP
 * surface via an authenticated agent. The registry is the in-memory
 * HubRegistryService singleton, cleared before each test for isolation.
 *
 * Runs against a real MariaDB via the dbHarness (needed for the login flow).
 */
import {StatusCodes} from 'flyingfish_schemas';
import request from 'supertest';
import {HubRegistryService} from '../../src/Application/Hub/HubRegistryService.js';
import {buildDnsCapabilityManifest} from '../../src/inc/Dns/DnsCapabilityManifest.js';
import {Registry} from '../../src/Routes/Main/Registry.js';
import {buildApiApp, loginAgent} from './apiTestHelpers.js';
import {closeTestDb, initTestDb, resetTestDb} from './dbHarness.js';

const routes = [new Registry()];

describe('Registry API (integration)', () => {
    beforeAll(async() => {
        await initTestDb();
        await resetTestDb();
    });
    beforeEach(() => {
        HubRegistryService.getInstance().getRegistry().clear();
    });
    afterEach(resetTestDb);
    afterAll(closeTestDb);

    test('register requires authentication', async() => {
        const res = await request(buildApiApp(routes))
        .post('/json/registry/register')
        .send(buildDnsCapabilityManifest('dns-1'));

        expect(res.body.statusCode).toBe(StatusCodes.UNAUTHORIZED);
    });

    test('register then list and ui-contributions reflect the part', async() => {
        const agent = await loginAgent(routes);

        const reg = await agent.post('/json/registry/register').send(buildDnsCapabilityManifest('dns-1'));
        expect(reg.body.statusCode).toBe(StatusCodes.OK);

        const parts = await agent.get('/json/registry/parts');
        expect(parts.body.list).toHaveLength(1);
        expect(parts.body.list[0].instanceId).toBe('dns-1');
        expect(parts.body.list[0].status).toBe('online');
        expect(parts.body.list[0].capabilities).toContain('dns-server');

        const ui = await agent.get('/json/registry/ui-contributions');
        expect(ui.body.menu.map((entry: {id: string;}) => entry.id)).toContain('dns');
        expect(ui.body.pages.map((entry: {id: string;}) => entry.id)).toContain('dns-records');
    });

    test('register rejects an invalid manifest', async() => {
        const agent = await loginAgent(routes);

        const res = await agent.post('/json/registry/register').send({schemaVersion: '1.0.0'});

        expect(res.body.statusCode).toBe(StatusCodes.INTERNAL_ERROR);
    });

    test('heartbeat reports known and unknown parts', async() => {
        const agent = await loginAgent(routes);
        await agent.post('/json/registry/register').send(buildDnsCapabilityManifest('dns-1'));

        const known = await agent.post('/json/registry/heartbeat').send({instanceId: 'dns-1'});
        expect(known.body.statusCode).toBe(StatusCodes.OK);

        const unknown = await agent.post('/json/registry/heartbeat').send({instanceId: 'nope'});
        expect(unknown.body.statusCode).toBe(StatusCodes.INTERNAL_ERROR);
    });

    test('bye deregisters the part', async() => {
        const agent = await loginAgent(routes);
        await agent.post('/json/registry/register').send(buildDnsCapabilityManifest('dns-1'));

        const bye = await agent.post('/json/registry/bye').send({instanceId: 'dns-1'});
        expect(bye.body.statusCode).toBe(StatusCodes.OK);

        const parts = await agent.get('/json/registry/parts');
        expect(parts.body.list).toHaveLength(0);
    });
});