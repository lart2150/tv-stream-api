import createHttpError from 'http-errors';
import type {Context} from 'koa';
import type {z} from 'zod';

export const parseBody = <T extends z.ZodType<unknown>>(schema : T, context : Context) : z.infer<T> => {
    const result = schema.safeParse(context.request.body);

    if (!result.success) {
        throw createHttpError(422, 'validation-error', {errors: result.error.errors});
    }

    return result.data;
};

export const parseQuery = <T extends z.ZodType<unknown>>(schema : T, context : Context) : z.infer<T> => {
    const result = schema.safeParse(context.request.query);

    if (!result.success) {
        throw createHttpError(400, 'validation-error', {errors: result.error.errors});
    }

    return result.data;
};
