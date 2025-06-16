import type { Express } from 'express';
import express, { json } from 'express';
import { SmelterInstance } from './smelter';
import { store } from './store';

export const app: Express = express();

app.use(json());

app.post('/add-stream', async (req, res) => {
  await SmelterInstance.registerInput(req.body.inputId, {
    type: 'mp4',
    url: req.body.mp4Url,
  });
  res.send({});
});

app.post('/toggle-instructions', async (_req, res) => {
  store.getState().toggleInstructions();
  res.send({});
});
