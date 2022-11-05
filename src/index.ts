import * as zlib from 'zlib';
import cors from '@koa/cors';
import {isHttpError} from 'http-errors';
import gracefulShutdown from 'http-graceful-shutdown';
import {getReasonPhrase} from 'http-status-codes';
import Koa from 'koa';
import bodyParser from 'koa-bodyparser';
import cacheControl from 'koa-cache-control';
import compress from 'koa-compress';
import compositeRouter from './route';
import {logger} from './util/winston';
import jwt from 'koa-jwt';
import jwtrsa from 'jwks-rsa';
import {config} from 'dotenv';
// @ts-ignore: missing type defs
import proxy from 'koa2-nginx';
import send from 'koa-send';
import { allowedUsers } from './allowedUsers';

const app = new Koa();

config();

app.use(cacheControl({noStore: true}));

app.use(async (context, next) => {
    try {
        await next();

        if (context.status === 404 || context.status === 405) {
            context.throw(context.status);
        }
    } catch (error) {
        if (isHttpError(error) && error.expose) {
            context.status = error.status;
            context.body = {
                status: error.status,
                message: getReasonPhrase(error.status),
                hint: error.message,
                errors: Array.isArray(error.errors) ? error.errors : undefined,
            };
            return;
        }

        context.status = 500;
        context.body = {
            status: 500,
            message: 'Internal Server Error',
        };
        logger.error(error instanceof Error ? error.stack : error);
    }
});

app.use(
    proxy({ '/session-streaming': { target: `http://${process.env.TIVO_IP ?? ''}:49152`, changeOrigin: true } })
);

app.use(bodyParser());
app.use(cors({maxAge: 86400}));
app.use(compress({
    br: {
        params: {
            [zlib.constants.BROTLI_PARAM_QUALITY]: 1,
        },
    },
}));

app.use(jwt({
    secret: jwtrsa.koaJwtSecret({
        jwksUri: `https://${process.env.AUTH0_DOMAIN}/.well-known/jwks.json`,
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        cacheMaxEntries: 5,
    }),
    audience: process.env.AUTH0_AUDIENCE,
    issuer: `https://${process.env.AUTH0_DOMAIN}/`,
    algorithms: ['RS256'],
    debug: process.env.NODE_ENV === 'development',
}).unless({
    path : [
        /^\/$/,
        /^\/assets\/.*/,
    ]
}));

app.use((context, next) => {
    if (context.url === '/health') {
        context.body = {status: 'alive'};
        return;
    }

    if (!allowedUsers.includes(context.state.user.sub)) {
        context.throw(401, 'user not in allowedUsers');
    }

    return next();
});

compositeRouter.get('/', async (ctx) => {
    await send(ctx,'./public/index.html');
});

app.use(compositeRouter.routes());
app.use(compositeRouter.allowedMethods());

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 8000;
const server = app.listen(port, process.env.HOST);

gracefulShutdown(server);
logger.info(`Server started on port ${port}`);
