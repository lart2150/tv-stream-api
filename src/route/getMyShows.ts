import Router from '@koa/router';
import { getConnectedTivo } from '../util/tivoSingleton';
import schedule from 'node-schedule';
const router = new Router({prefix: '/getMyShows'});

let allRecordings: Promise<any[]> | null = null;

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
