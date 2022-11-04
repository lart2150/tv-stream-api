import Router from '@koa/router';
import send from 'koa-send';

const router = new Router({prefix: '/assets'});

router.get('/:file', async (context) => {
    await send(context,'./public/assets/' + context.params.file);
});

export default router;
