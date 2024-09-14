module.exports = {
    apps: [{
        name: 'tv-stream-api',
        script: `dist/index.js`,
        interpreter_args: '--experimental-specifier-resolution=node --tls-min-v1.0',
        watch: false,
        autorestart: true,
        restart_delay: 1000,
        kill_timeout: 3000,
        exec_mode: 'cluster',
        instances: 1,
        instance_var: 'INSTANCE_ID',
        env: {
            NODE_ENV: 'development',
        },
        env_production: {
            NODE_ENV: 'production',
        },
    }],
};
