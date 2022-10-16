module.exports = {
    apps: [{
        name: 'api',
        script: `${process.env.PWD}/index.js`,
        node_args: '--experimental-specifier-resolution=node',
        watch: false,
        autorestart: true,
        restart_delay: 1000,
        kill_timeout: 3000,
        exec_mode: 'cluster',
        instances: 0,
        instance_var: 'INSTANCE_ID',
        env: {
            NODE_ENV: 'development',
        },
        env_production: {
            NODE_ENV: 'production',
        },
    }],
};
