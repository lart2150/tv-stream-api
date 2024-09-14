import Router from '@koa/router';
import {z} from 'zod';
import { getConnectedTivo } from '../util/tivoSingleton.js';
import {parseBody, parseQuery} from '../util/zod.js';

const router = new Router({prefix: '/stream'});
let lastSessionId : null|string = null;

router.get('/start/:recordingId', async (context) => {
    if (lastSessionId) {
        try {
            lastSessionId = null;
            const request = {
                clientUuid:"5678",
                hlsSessionId: lastSessionId,
                type:"hlsStreamRelease"
            };
            const tivo = await getConnectedTivo();
            
            await tivo.sendRequest(request);
        } catch (e) {
            console.error('error stopping other stream', lastSessionId)
        }
    }
    const request = {
        "clientUuid": "5678",
        "deviceConfiguration": {
        "deviceType": "webPlayer",
        "type": "deviceConfiguration"
        },
        "sessionType": "streaming",
        "hlsStreamDesiredVariantsSet": "ABR",
        "supportedEncryption": {
        "type": "hlsStreamEncryptionInfo",
        "encryptionType": "hlsAes128Cbc"
        },
        "isLocal": true,
        "recordingId": context.params.recordingId,
        "type": "hlsStreamRecordingRequest",
    };
    const tivo = await getConnectedTivo();
    
    const rsp = await tivo.sendRequest(request);
    if (rsp?.hlsSession?.hlsSessionId === undefined) {
        const errorCode = rsp.errorCode;
        if (errorCode) {
            context.throw(500, rsp.errorCode, rsp);
        }
        context.throw(500, "Error Starting Stream", rsp);
    }
    lastSessionId = rsp.hlsSession.hlsSessionId;
    context.body = rsp;
});


router.get('/startChannel/:channelId', async (context) => {
    if (lastSessionId) {
        try {
            lastSessionId = null;
            const request = {
                clientUuid:"5678",
                hlsSessionId: lastSessionId,
                type:"hlsStreamRelease"
            };
            const tivo = await getConnectedTivo();
            
            await tivo.sendRequest(request);
        } catch (e) {
            console.log('error stopping other stream', lastSessionId)
        }
    }

    const request = {
        clientUuid:"5678",
        deviceConfiguration:{
            deviceType:"webPlayer",
            type:"deviceConfiguration"
        },
        sessionType:"streaming",
        hlsStreamDesiredVariantsSet:"ABR",
        supportedEncryption:{
            type:"hlsStreamEncryptionInfo",
            encryptionType:"hlsAes128Cbc"
        },
        isLocal:true,
        stbChannelId:context.params.channelId,
        type:"hlsStreamLiveTvRequest"
    };

    const tivo = await getConnectedTivo();
    
    const rsp = await tivo.sendRequest(request);
    if (rsp?.hlsSession?.hlsSessionId === undefined) {
        if (rsp.errorCode) {
            context.throw(500, rsp.errorCode, rsp);
        }
        context.throw(500, "Error Starting Stream", rsp);
    }
    lastSessionId = rsp.hlsSession.hlsSessionId;
    context.body = rsp;
});

router.get('/stop/:hlsSessionId', async (context) => {
    lastSessionId = null;
    const request = {
        clientUuid:"5678",
        hlsSessionId: context.params.hlsSessionId,
        type:"hlsStreamRelease"
    };
    const tivo = await getConnectedTivo();
    
    context.body = await tivo.sendRequest(request);
});

export default router;
