/**
 * Unit test for the route base error handling.
 *
 * FlyingFish routes now extend figtree's DefaultRoute. A throwing (async) route
 * handler must still produce an error response instead of an unhandled promise
 * rejection with the client left hanging. figtree answers 200 + INTERNAL_ERROR
 * for an unexpected throw.
 */
import express, {Express, Router} from 'express';
import session from 'express-session';
import {DefaultRoute} from 'figtree';
import {DefaultReturn, SchemaDefaultReturn, StatusCodes} from 'flyingfish_schemas';
import request from 'supertest';

class TestRoute extends DefaultRoute {

    public override getExpressRouter(): Router {
        this._get(
            '/json/boom',
            false,
            async(): Promise<DefaultReturn> => {
                throw new Error('boom in get');
            },
            {
                description: 'throws on purpose',
                responseBodySchema: SchemaDefaultReturn
            }
        );

        this._post(
            '/json/boom',
            false,
            async(): Promise<DefaultReturn> => {
                throw new Error('boom in post');
            },
            {
                description: 'throws on purpose',
                responseBodySchema: SchemaDefaultReturn
            }
        );

        this._get(
            '/json/ok',
            false,
            async(): Promise<DefaultReturn> => {
                return {statusCode: StatusCodes.OK};
            },
            {
                description: 'returns ok',
                responseBodySchema: SchemaDefaultReturn
            }
        );

        return super.getExpressRouter();
    }

}

const buildApp = (): Express => {
    const app = express();
    app.use(express.json());
    app.use(session({
        secret: 'test-secret',
        resave: false,
        saveUninitialized: true,
        store: new session.MemoryStore()
    }));
    app.use(new TestRoute().getExpressRouter());

    return app;
};

describe('DefaultRoute error handling', () => {
    test('a throwing GET handler responds with an error, not a hang', async() => {
        const res = await request(buildApp()).get('/json/boom');

        expect(res.status).toBe(200);
        expect(res.body.statusCode).toBe(StatusCodes.INTERNAL_ERROR);
    });

    test('a throwing POST handler responds with an error, not a hang', async() => {
        const res = await request(buildApp()).post('/json/boom').send({});

        expect(res.status).toBe(200);
        expect(res.body.statusCode).toBe(StatusCodes.INTERNAL_ERROR);
    });

    test('a normal handler still responds', async() => {
        const res = await request(buildApp()).get('/json/ok');

        expect(res.status).toBe(200);
        expect(res.body.statusCode).toBe(StatusCodes.OK);
    });
});