import {SSM} from '@aws-sdk/client-ssm';
import {createSingletonConfigGetter} from 'ssm-config-loader/lib/singleton-config-getter';
import {z} from 'zod';

const configSchema = z.object({
    foo: z.string(),
});

const getConfig = createSingletonConfigGetter(new SSM({}), configSchema, process.env.SSM_PREFIX);

export default await getConfig();
