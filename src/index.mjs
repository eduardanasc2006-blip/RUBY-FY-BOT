import express from 'express';
import { startBot } from './bot/robux.mjs';

const PORT = process.env.PORT || 8080;

const app = express();
app.get('/api/healthz', (_req, res) => res.json({ status: 'ok', bot: 'FiskBot' }));

app.listen(PORT, () => {
  console.log(`[HTTP] Health check na porta ${PORT}`);
});

startBot();
