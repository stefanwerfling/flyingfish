/**
 * Shared helpers for the supertest + MariaDB API integration tests.
 *
 * Builds a minimal Express app (session + body parser) mounting the given
 * controllers, seeds the admin user, and returns a logged-in supertest agent so
 * guarded endpoints can be driven with an authenticated session.
 */
import * as bcrypt from 'bcrypt';
import bodyParser from 'body-parser';
import express, {Express} from 'express';
import session from 'express-session';
import {DefaultRoute, UserDB, UserServiceDB} from 'flyingfish_core';
import request from 'supertest';
import {Login} from '../../src/Routes/Main/Login.js';

export const TEST_EMAIL = 'admin@flyingfish.org';
export const TEST_PASSWORD = 'secret123';

/**
 * Build an Express app with session middleware, the Login controller and the
 * given additional controllers mounted.
 * @param {DefaultRoute[]} routes - controllers to mount alongside Login
 * @returns {Express}
 */
export const buildApiApp = (routes: DefaultRoute[]): Express => {
    const app = express();

    app.use(bodyParser.json());
    app.use(session({
        secret: 'test-secret',
        resave: false,
        saveUninitialized: true,
        store: new session.MemoryStore()
    }));
    app.use(new Login().getExpressRouter());

    for (const route of routes) {
        app.use(route.getExpressRouter());
    }

    return app;
};

/**
 * Seed the default admin user used by the login flow.
 */
export const seedAdminUser = async(): Promise<void> => {
    const user = new UserDB();
    user.username = 'ffadmin';
    user.email = TEST_EMAIL;
    user.password = await bcrypt.hash(TEST_PASSWORD, 10);
    user.disable = false;

    await UserServiceDB.getInstance().save(user);
};

/**
 * Seed the admin user and return a supertest agent that has logged in, so its
 * cookie carries an authenticated session to the guarded endpoints.
 * @param {DefaultRoute[]} routes - controllers to mount alongside Login
 * @returns {Promise<ReturnType<typeof request.agent>>}
 */
export const loginAgent = async(routes: DefaultRoute[]): Promise<ReturnType<typeof request.agent>> => {
    await seedAdminUser();
    const agent = request.agent(buildApiApp(routes));
    await agent.post('/json/login').send({email: TEST_EMAIL, password: TEST_PASSWORD});

    return agent;
};