import {dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {compositeRouter} from '../util/koa.js';

export default await compositeRouter(dirname(fileURLToPath(import.meta.url)));
