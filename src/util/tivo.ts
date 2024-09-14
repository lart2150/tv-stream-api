
import tls from 'node:tls';
import fs from 'node:fs';
import {URL} from 'node:url';
import { number } from 'zod';

type Options = Record<string, OptionsValues | Record<string, OptionsValues | Record<string, OptionsValues>>>;
type OptionsValues = number | string | string[] | undefined | boolean | null;


export class Tivo {
    ip : string;
    rpcId : number;
    mak : string;
    sessionID  = '';
    bodyId  = '';
    socket : tls.TLSSocket | undefined;
    data  = '';
    received ?: (v : string) => void;
    bodyLength  = -1;
    body  = '';
    chunkCount  = 0;
    promise ?: Promise<string>;

    constructor(ip : string, mak : string) {
        this.rpcId = 0;
        this.ip = ip;
        this.mak = mak;
    }

    async connect () {
        console.log('connecting to tivo');
        this.disconnect();
        
        const options = {
            host : this.ip,
            rejectUnauthorized: false,
            port : 1413,
            pfx : fs.readFileSync('cdata.p12'),
            passphrase : fs.readFileSync('cdata.password'),
            ciphers: "DEFAULT@SECLEVEL=0",//ca md too weak
        };

        this.sessionID = Math.floor(Math.random() * 72736 + 2539520).toString(16);

        const promise = new Promise((resolve, reject) => {
            this.received = resolve;
            try {
                // @ts-ignore: it does not like rejectUnauthorized but it won't know the chain so....
                this.socket = tls.connect(options, () => {
                    if (this.socket) {
                        this.socket.setEncoding('utf8');
                        this.socket.write(this.buildRequest({"type":"bodyAuthenticate","credential":{"type":"makCredential","key":this.mak}}));
                        
                        this.data = "";

                        this.socket.on('data', this.read.bind(this));
                    }
                });
                this.socket.on('error', (err: unknown) => {
                    if (this.socket) {
                        this.socket.end();
                    }
                    reject(err);
                });
                
            } catch (e) {
                //console.error('TIVO connection error', e)
                reject(e);
            }
        });
        console.log('waiting on auth response');
        const response = await promise;
        this.received = undefined;
        this.promise = undefined;
        console.log('got auth response');

        const bodyResponse = await this.sendRequest({type: "bodyConfigSearch", "bodyId": "-"});
        this.bodyId = bodyResponse.bodyConfig[0].bodyId;
    }

    async sendRequestAllPages(content : Options, responseKey : string, count  = 50) {
        content.count = 50;
        let response = await this.sendRequest(content);
        const combinedResponse = response;
        let offset = count;
        while (response.isBottom === false) {
            content.offset = offset;
            //console.log(offset);
            offset += count;
            response = await this.sendRequest(content);
            combinedResponse[responseKey] = combinedResponse[responseKey].concat(response[responseKey]);
        }
        return combinedResponse;
    }

    async sendRequest(content : Options) {
        while (this.promise) {
            console.log('waiting for promise');
            await this.promise;
        }

        this.bodyLength = -1;
        this.body = "";
        this.data = "";

        const request = this.buildRequest(content);
        this.promise = new Promise<string>((resolve, reject) => {
            this.received = resolve;
            if (!this.isConnected()) {
                this.connect().then(() => {
                    if (this.socket) {
                        this.socket.write(request)
                    } else {
                        reject('no connection?');
                    }
                })
            } else {
                if (this.socket) {
                    this.socket.write(request);
                } else {
                    reject('no connection?');
                }
            }
        });

        const response = await this.promise;
        this.promise = undefined;
        this.received = undefined;
        //console.log(response);
        const responseBody = JSON.parse(response);

        if (responseBody.type === 'error') {
            throw new Error(response);
        }

        return responseBody;
    }

    isConnected() {
        return this.socket?.writable;
    }
    disconnect() {
        if (this.socket?.writable) {
            this.socket.end();
            if (this.received) {
                this.received('{}')
                this.received = undefined;
            }
        } 
    }

    /**
     * used for callbaks don't use
     * @param {string} chunk 
     */
    read(chunk : string) {
        if (chunk.indexOf('MRPC/2 ') === 0) {
            const header = chunk.split("\r\n")[0];
            this.bodyLength = Number.parseInt(header.split(" ")[2], 10);
            this.body = chunk.split("\r\n\r\n")[1];
            this.chunkCount = 1;
        } else if (this.bodyLength) {
            this.chunkCount++;
            this.body += chunk;
        }
        this.data += chunk;

        if (this.received && this.body && Buffer.byteLength(this.body, 'utf8') >= this.bodyLength) {
            this.received(this.body);
        }
    }

    buildRequest(content : Options) : string {
        const eol = "\r\n";

        let SchemaVersion = 21;
        if (typeof content.SchemaVersion === 'number') {
            SchemaVersion = content.SchemaVersion;
            content.SchemaVersion = undefined;
        }

        if (!content.bodyId && this.bodyId) {
            content.bodyId = this.bodyId;
        }        

        let bodyIdHeader = '';
        if (this.bodyId) {
            bodyIdHeader = `BodyId: ${this.bodyId}${eol}`;
        }

        const header = "Type: request" + eol +
            `RpcId: ${this.rpcId++}` + eol +
            "SchemaVersion: " + SchemaVersion + eol +
            "Content-Type: application/json" + eol +
            `RequestType: ${content.type}` + eol +
            bodyIdHeader +
            "ResponseCount: single" + eol + eol;

        const body = JSON.stringify(content) + "\n"

        return "MRPC/2 " + header.length + " " + body.length + eol + header + body
    }

    /**
     * send a key event to the tivo
     * @param {string} key 
     * @param {object} options 
     */
    sendKey(key : string, options : Options = {}) {
        return this.sendRequest(
            {
                type: 'keyEventSend',
                event: key,
                ...options
            }
        );
    }

    configSearch(options : Options = {}) {
        return this.sendRequest(
            {
                type: 'bodyConfigSearch',
                ...options
            }
        );
    }

    tunerState(options : Options = {}) {
        return this.sendRequest(
            {
                type: 'tunerStateEventRegister',
                ...options
            }
        );
    }

    whatsOn(options : Options = {}) {
        return this.sendRequest(
            {
                type: 'whatsOnSearch',
                ...options
            }
        );
    }

    phoneHome(options : Options = {}) {
        return this.sendRequest(
            {
                type: 'phoneHomeRequest',
                ...options
            }
        );
    }

    phoneHomeStatus(options : Options = {}) {
        return this.sendRequest(
            {
                type: 'phoneHomeStatusEventRegister',
                ...options
            }
        );
    }
    
    systemInformation(options : Options = {}) {
        return this.sendRequest(
            {
                type: 'systemInformationGet',
                ...options
            }
        );
    }

    uiNavigate(uri : string, options : Options = {}) {
        return this.sendRequest(
            {
                type: 'uiNavigate',
                uri,
                ...options
            }
        );
    }

    getChannelList(options : Options = {}) {
        return this.sendRequest(
            {
                type: 'channelSearch',
                noLimit: 'true',
                ...options
            }
        );
    }

    getRecordingInfo(recordingId : string) {
        return this.sendRequest({
            type: 'recordingSearch',
            recordingId,
        })
    }

    async getAllRecordings() {
        const response = await this.sendRequest({
            type: 'recordingFolderItemSearch',
            //count: 50
        });
    
        const recordings = [];
        const allRecordings = new Map();
    
        for (const folderItem of response.recordingFolderItem) {
            if (folderItem.collectionType === 'series' && folderItem.folderType !== 'suggestion') {
                const collectionRecordings =  await this.sendRequestAllPages({
                    type: 'recordingSearch',
                    collectionId: folderItem.collectionId,
                    state: ['inProgress', 'complete'],
                    count: 50,
                }, 'recording');
                for (const recording of collectionRecordings.recording) {
                    if (!allRecordings.has(recording.recordingId)) {
                        allRecordings.set(recording.recordingId, recording.recordingId);
                        recordings.push(recording);
                    }
                }
                
            } else if (folderItem.folderType !== 'suggestion') {
                const sRecording =  await this.getRecordingInfo(folderItem.childRecordingId);
                for (const recording of sRecording.recording) {
                    if (!allRecordings.has(recording.recordingId)) {
                        allRecordings.set(recording.recordingId, recording.recordingId);
                        recordings.push(recording);
                    }
                }
            } else if (folderItem.recordingFolderItemId) {
                const folderItems  = await this.sendRequest({
                    type: 'recordingFolderItemSearch',
                    parentRecordingFolderItemId: folderItem.recordingFolderItemId
                });
                for (const folderItem of folderItems.recordingFolderItem) {
                    const fRecording =  await this.getRecordingInfo(folderItem.childRecordingId);
                    for (const recording of fRecording.recording) {
                        if (!allRecordings.has(recording.recordingId)) {
                            allRecordings.set(recording.recordingId, recording.recordingId);
                            recordings.push(recording);
                        }
                    }
                }
            }
    
        }

        return recordings;
    }

    async getDownloadUrlForRecording(recordingId : string, useTs = true) {
        const recordingMeta = await this.sendRequest({
            type: 'idSearch',
            objectId: recordingId, 
            namespace: 'mfs',
        });
        //console.log(recordingMeta);
    
        const downloadId = recordingMeta.objectId[0].replace('mfs:rc.', '');
        const dUrl = new URL('http://localhost/download/download.TiVo?Container=%2FNowPlaying');
        dUrl.password = this.mak
        dUrl.username = 'tivo';
        
        dUrl.host = this.ip;
        dUrl.searchParams.append('id', downloadId);
        useTs && dUrl.searchParams.append('Format','video/x-tivo-mpeg-ts');
        return dUrl.toString();
    }

    async reboot() {
        let response = await this.uiNavigate('x-tivo:classicui:restartDvr');
    
        await new Promise(resolve => setTimeout(resolve, 5000));
    
        response = await this.sendKey('thumbsDown');
        response = await this.sendKey('thumbsDown');
        response = await this.sendKey('thumbsDown');
    
        response = await this.sendKey('enter');
    }
}