import {promises as fs} from 'node:fs';
import * as path from 'node:path';
import {pathToFileURL} from 'node:url';
import Router, {type RouterOptions} from '@koa/router';

export const compositeRouter = async (
    directory : string,
    routerOptions ?: RouterOptions
) : Promise<Router> => {
    const router = new Router(routerOptions);
    const files = await fs.readdir(directory);

    for (const file of files) {
        if ((file.endsWith('.js') || file.endsWith('.ts')) && !file.startsWith('index')) {
            const module = await import(pathToFileURL(path.join(directory, file)).toString()) as {default ?: unknown};

            if (module.default instanceof Router) {
                router.use(module.default.routes());
                router.use(module.default.allowedMethods());
            }
        }
    }

    return router;
};
