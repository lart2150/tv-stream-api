import Router from '@koa/router';
import { getConnectedTivo } from '../util/tivoSingleton.js';
import schedule from 'node-schedule';
import type { Tivo } from '../util/tivo.js';
const router = new Router({prefix: '/getMyShows'});

let allRecordings: Promise<unknown> | null = null;

const getRecordings = async () => {
    const tivo = await getConnectedTivo();
    
    return await tivo.getAllRecordings();
}

const fetchRecordingsSchedule = schedule.scheduleJob('5,35 * * * *', async () => {
    allRecordings = getRecordings();
});

allRecordings = getRecordings();

router.get('/', async (context) => {
    context.body = await allRecordings;
});

export default router;
