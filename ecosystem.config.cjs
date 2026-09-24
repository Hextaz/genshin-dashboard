module.exports = {
  apps: [
    {
      name: 'genshin-dashboard',
      script: 'server/index.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '50M',
      node_args: '--max-old-space-size=48 --optimize-for-size',
      env: {
        NODE_ENV: 'production',
        PORT: 3002
      }
    }
  ]
};
