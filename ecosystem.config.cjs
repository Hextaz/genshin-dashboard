module.exports = {
  apps: [
    {
      name: 'genshin-dashboard',
      script: 'server/index.js',
      exec_mode: 'fork',
      autorestart: true,
      time: true,
      watch: false,
      max_memory_restart: '50M',
      node_args: '--max-old-space-size=48 --optimize-for-size',
      env: {
        NODE_ENV: 'production',
        PORT: 3002,
        HOST: '0.0.0.0'
      }
    }
  ]
};
