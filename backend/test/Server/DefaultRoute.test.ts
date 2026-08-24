/**
 * Unit test for DefaultRoute error handling (refactoring phase 2).
 *
 * A throwing (async) route handler must produce a 500 response instead of an
 * unhandled promise rejection with the client left hanging.
 */
import express, {Express, Router} from 'express';
import {DefaultRoute} from 'flyingfish_core';
import {StatusCodes} from 'flyingfish_schemas';
import request from 'supertest';

class TestRoute extends DefaultRoute {

    public getExpressRouter(): Router {
        this._get('/json/boom', async() => {
            throw new Error('boom in get');
        });

        this._post('/json/boom', async() => {
            throw new Error('boom in post');
        });

        this._get('/json/ok', async(_req, res) => {
            res.status(200).json({statusCode: StatusCodes.OK});
        });

        return super.getExpressRouter();
    }

}

const buildApp = (): Express => {
    const app = express();
    app.use(express.json());
    app.use(new TestRoute().getExpressRouter());

    return app;
};

describe('DefaultRoute error handling', () => {
    test('a throwing GET handler responds with 500', async() => {
        const res = await request(buildApp()).get('/json/boom');

        expect(res.status).toBe(500);
        expect(res.body.statusCode).toBe(StatusCodes.INTERNAL_ERROR);
    });

    test('a throwing POST handler responds with 500', async() => {
        const res = await request(buildApp()).post('/json/boom').send({});

        expect(res.status).toBe(500);
        expect(res.body.statusCode).toBe(StatusCodes.INTERNAL_ERROR);
    });

    test('a normal handler still responds', async() => {
        const res = await request(buildApp()).get('/json/ok');

        expect(res.status).toBe(200);
        expect(res.body.statusCode).toBe(StatusCodes.OK);
    });
});