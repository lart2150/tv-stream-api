import {dirname} from 'path';
import {fileURLToPath} from 'url';
import {compositeRouter} from '../util/koa';

export default await compositeRouter(dirname(fileURLToPath(import.meta.url)));
