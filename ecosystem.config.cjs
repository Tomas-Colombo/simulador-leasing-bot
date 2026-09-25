module.exports = {
  apps: [
    {
      name: 'leasing-whatsapp-bot',
      script: './dist/index.js', // Cambiá a ./dist/bot.js si tu archivo de entrada se llama bot.ts
      instances: 1,              // OBLIGATORIO 1: no usar cluster, Baileys solo permite una conexión activa
      autorestart: true,
      watch: false,
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};