import Router from '@koa/router';
import { getConnectedTivo } from '../util/tivoSingleton';
const router = new Router({prefix: '/gridSearch'});


router.get('/', async (context) => {
    const tivo = await getConnectedTivo();
    
    context.body = await tivo.sendRequestAllPages({
        type: 'gridRowSearch',
        maxStartTime: new Date().toISOString().split('.')[0],
        minEndTime: new Date().toISOString().split('.')[0],
        orderBy: ['channelNumber'],
        isReceived: true,
        levelOfDetail: 'high',
    }, 'gridRow', 50);
});

export default router;
