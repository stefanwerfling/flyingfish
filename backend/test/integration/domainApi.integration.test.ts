/**
 * API integration tests for the Domain CRUD controller (supertest + real
 * MariaDB). Covers the authenticated list/save/delete round-trip plus the
 * domain-name normalisation and schema validation behaviour.
 *
 * Runs against a real MariaDB via the dbHarness - see the CI integration job.
 */
import * as bcrypt from 'bcrypt';
import bodyParser from 'body-parser';
import express, {Express} from 'express';
import session from 'express-session';
import {UserDB, UserServiceDB} from 'flyingfish_core';
import {DomainData, StatusCodes} from 'flyingfish_schemas';
import request from 'supertest';
import {Domain} from '../../src/Routes/Main/Domain.js';
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
    app.use(new Domain().getExpressRouter());

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
 * Seed the admin user and return a logged-in supertest agent.
 */
const loginAgent = async(): Promise<ReturnType<typeof request.agent>> => {
    await seedUser();
    const agent = request.agent(buildApp());
    await agent.post('/json/login').send({email: EMAIL, password: PASSWORD});

    return agent;
};

const sampleDomain = (name = 'example.com'): DomainData => {
    return {
        id: 0,
        name: name,
        fix: false,
        recordless: false,
        records: [],
        disable: false,
        parent_id: 0
    };
};

describe('Domain API (integration)', () => {
    // Reset once after init so this file is isolated from data any earlier test
    // file seeded; afterEach keeps the tests within this file isolated.
    beforeAll(async() => {
        await initTestDb();
        await resetTestDb();
    });
    afterEach(resetTestDb);
    afterAll(closeTestDb);

    test('list requires authentication', async() => {
        const res = await request(buildApp()).get('/json/domain/list');

        expect(res.body.statusCode).toBe(StatusCodes.UNAUTHORIZED);
    });

    test('save then list returns the stored domain', async() => {
        const agent = await loginAgent();

        const save = await agent.post('/json/domain/save').send(sampleDomain());
        expect(save.body.statusCode).toBe(StatusCodes.OK);

        const list = await agent.get('/json/domain/list');
        expect(list.body.statusCode).toBe(StatusCodes.OK);
        expect(list.body.list).toHaveLength(1);
        expect(list.body.list[0].name).toBe('example.com');
    });

    test('save normalises the domain name to lower case', async() => {
        const agent = await loginAgent();

        await agent.post('/json/domain/save').send(sampleDomain('Example.COM'));

        const list = await agent.get('/json/domain/list');
        expect(list.body.list).toHaveLength(1);
        expect(list.body.list[0].name).toBe('example.com');
    });

    test('delete removes the domain', async() => {
        const agent = await loginAgent();

        await agent.post('/json/domain/save').send(sampleDomain());
        const created = await agent.get('/json/domain/list');
        const id = created.body.list[0].id;

        const del = await agent.post('/json/domain/delete').send({id: id});
        expect(del.body.statusCode).toBe(StatusCodes.OK);

        const after = await agent.get('/json/domain/list');
        expect(after.body.list).toHaveLength(0);
    });

    test('save rejects a schema-invalid payload', async() => {
        const agent = await loginAgent();

        const res = await agent.post('/json/domain/save').send({name: 'incomplete.example'});

        expect(res.body.statusCode).toBe(StatusCodes.INTERNAL_ERROR);
    });
});