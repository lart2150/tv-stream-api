import Router from '@koa/router';
import {z} from 'zod';
import {parseBody, parseQuery} from '../util/zod';

const router = new Router({prefix: '/hello-world'});

router.get('/', context => {
    context.body = {message: 'hello-world'};
});

const listQuerySchema = z.object({
    foo: z.string().optional(),
});

router.get('/list', context => {
    const query = parseQuery(listQuerySchema, context);

    context.body = {foo: query.foo};
});

const listPostSchema = z.object({
    foo: z.string(),
});

router.post('/list', context => {
    const input = parseBody(listPostSchema, context);

    context.status = 201;
    context.body = {foo: input.foo};
});

export default router;
