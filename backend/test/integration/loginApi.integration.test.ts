/**
 * API integration test for the login flow (supertest + real MariaDB).
 *
 * Boots a minimal Express app with the Login controller, session middleware and
 * the test database, then drives the endpoints via supertest.
 */
import * as bcrypt from 'bcrypt';
import bodyParser from 'body-parser';
import express, {Express} from 'express';
import session from 'express-session';
import {UserDB, UserServiceDB} from 'flyingfish_core';
import {StatusCodes} from 'flyingfish_schemas';
import request from 'supertest';
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

describe('Login API (integration)', () => {
    beforeAll(initTestDb);
    afterEach(resetTestDb);
    afterAll(closeTestDb);

    test('POST /json/login succeeds with correct credentials', async() => {
        await seedUser();

        const res = await request(buildApp()).post('/json/login').send({email: EMAIL, password: PASSWORD});

        expect(res.status).toBe(200);
        expect(res.body.statusCode).toBe(StatusCodes.OK);
    });

    test('POST /json/login fails with a wrong password', async() => {
        await seedUser();

        const res = await request(buildApp()).post('/json/login').send({email: EMAIL, password: 'wrong'});

        expect(res.body.statusCode).not.toBe(StatusCodes.OK);
        expect(res.body.msg).toBe('Wrong password!');
    });

    test('POST /json/login reports a missing user', async() => {
        const res = await request(buildApp()).post('/json/login').send({email: 'nobody@example.com', password: PASSWORD});

        expect(res.body.msg).toBe('User not found.');
    });

    test('session persists: /json/islogin is true after a successful login', async() => {
        await seedUser();
        const agent = request.agent(buildApp());

        await agent.post('/json/login').send({email: EMAIL, password: PASSWORD});
        const res = await agent.get('/json/islogin');

        expect(res.status).toBe(200);
        expect(res.body.status).toBe(true);
    });
});