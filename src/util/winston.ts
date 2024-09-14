import {createLogger, format, transports} from 'winston';

export const logger = createLogger({
    level: process.env.NODE_ENV === 'production' ? 'error' : 'debug',
    format: format.json(),
    transports: [
        new transports.Console({
            format: format.simple(),
        }),
    ],
});
