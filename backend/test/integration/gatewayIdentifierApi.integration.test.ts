/**
 * API integration tests for the GatewayIdentifier CRUD controller
 * (supertest + real MariaDB). Extends the pattern established by the Login
 * API test to a full authenticated list/save/delete round-trip.
 *
 * Boots a minimal Express app with the Login + GatewayIdentifier controllers,
 * session middleware and the test database, then drives the endpoints via
 * supertest (logging in through the real login flow to obtain a session).
 *
 * Runs against a real MariaDB via the dbHarness - see the CI integration job.
 */
import * as bcrypt from 'bcrypt';
import bodyParser from 'body-parser';
import express, {Express} from 'express';
import session from 'express-session';
import {UserDB, UserServiceDB} from 'flyingfish_core';
import {GatewayIdentifierEntry, StatusCodes} from 'flyingfish_schemas';
import request from 'supertest';
import {GatewayIdentifier} from '../../src/Routes/Main/GatewayIdentifier.js';
import {Login} from '../../src/Routes/Main/Login.js';
import {closeTestDb, initTestDb, resetTestDb} from './dbHarness.js';

const EMAIL = 'admin@flyingfish.org';
const PASSWORD = 'secret123';

const buildApp = (): Express => {
    const app = express();

    app.use(bodyParser.json());
    app.use(session({
        secret: 'test-secret',
        resave: false,
        saveUninitialized: true,
        store: new session.MemoryStore()
    }));
    app.use(new Login().getExpressRouter());
    app.use(new GatewayIdentifier().getExpressRouter());

    return app;
};

const seedUser = async(): Promise<void> => {
    const user = new UserDB();
    user.username = 'ffadmin';
    user.email = EMAIL;
    user.password = await bcrypt.hash(PASSWORD, 10);
    user.disable = false;

    await UserServiceDB.getInstance().save(user);
};

/**
 * Seed the admin user and return a supertest agent that has logged in, so its
 * cookie carries an authenticated session to the guarded endpoints.
 */
const loginAgent = async(): Promise<ReturnType<typeof request.agent>> => {
    await seedUser();
    const agent = request.agent(buildApp());
    await agent.post('/json/login').send({email: EMAIL, password: PASSWORD});

    return agent;
};

const sampleEntry = (): GatewayIdentifierEntry => {
    return {
        id: 0,
        networkname: 'home',
        mac_address: 'aa:bb:cc:dd:ee:ff',
        address: '192.168.0.1',
        color: '#ff0000'
    };
};

describe('GatewayIdentifier API (integration)', () => {
    // Reset once after init so this file is isolated from data any earlier test
    // file seeded; afterEach keeps the tests within this file isolated.
    beforeAll(async() => {
        await initTestDb();
        await resetTestDb();
    });
    afterEach(resetTestDb);
    afterAll(closeTestDb);

    test('list requires authentication', async() => {
        const res = await request(buildApp()).get('/json/gatewayidentifier/list');

        expect(res.body.statusCode).toBe(StatusCodes.UNAUTHORIZED);
    });

    test('save then list returns the stored gateway identifier', async() => {
        const agent = await loginAgent();

        const save = await agent.post('/json/gatewayidentifier/save').send(sampleEntry());
        expect(save.body.statusCode).toBe(StatusCodes.OK);

        const list = await agent.get('/json/gatewayidentifier/list');
        expect(list.body.statusCode).toBe(StatusCodes.OK);
        expect(list.body.data).toHaveLength(1);
        expect(list.body.data[0]).toMatchObject({
            networkname: 'home',
            mac_address: 'aa:bb:cc:dd:ee:ff',
            address: '192.168.0.1',
            color: '#ff0000'
        });
    });

    test('save updates an existing entry instead of creating a new one', async() => {
        const agent = await loginAgent();

        await agent.post('/json/gatewayidentifier/save').send(sampleEntry());
        const created = await agent.get('/json/gatewayidentifier/list');
        const id = created.body.data[0].id;

        const update = await agent.post('/json/gatewayidentifier/save').send({
            ...sampleEntry(),
            id: id,
            networkname: 'office'
        });
        expect(update.body.statusCode).toBe(StatusCodes.OK);

        const list = await agent.get('/json/gatewayidentifier/list');
        expect(list.body.data).toHaveLength(1);
        expect(list.body.data[0].networkname).toBe('office');
    });

    test('delete removes the gateway identifier', async() => {
        const agent = await loginAgent();

        await agent.post('/json/gatewayidentifier/save').send(sampleEntry());
        const created = await agent.get('/json/gatewayidentifier/list');
        const id = created.body.data[0].id;

        const del = await agent.post('/json/gatewayidentifier/delete').send({id: id});
        expect(del.body.statusCode).toBe(StatusCodes.OK);

        const after = await agent.get('/json/gatewayidentifier/list');
        expect(after.body.data).toHaveLength(0);
    });

    test('save rejects a schema-invalid payload', async() => {
        const agent = await loginAgent();

        const res = await agent.post('/json/gatewayidentifier/save').send({networkname: 'incomplete'});

        expect(res.body.statusCode).toBe(StatusCodes.INTERNAL_ERROR);
    });
});