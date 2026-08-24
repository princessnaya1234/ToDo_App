import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import { createApp } from './app.js';
import { createStore } from './store.js';

const here = dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT ?? 4000);
const dataFile = process.env.TASKS_FILE
  ? resolve(process.env.TASKS_FILE)
  : resolve(here, '../data/tasks.json');

const app = createApp({ store: createStore(dataFile) });

app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
  console.log(`Tasks stored in ${dataFile}`);
});
