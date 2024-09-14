import Router from '@koa/router';
import { getConnectedTivo } from '../util/tivoSingleton.js';
import schedule from 'node-schedule';
const router = new Router({prefix: '/getMyLineup'});

let allChannels: Promise<unknown[]> | null = null;

const getChannelList = async () => {
    const tivo = await getConnectedTivo();
    
    return await tivo.getChannelList();
}

schedule.scheduleJob('0 3 * * *', async () => {
    allChannels = getChannelList();
});

allChannels = getChannelList();

router.get('/', async (context) => {
    context.body = await allChannels;
});

export default router;
