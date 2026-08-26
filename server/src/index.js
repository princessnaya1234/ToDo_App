import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import { createApp } from './app.js';
import { createStore } from './store.js';

const here = dirname(fileURLToPath(import.meta.url));

// Hosts tell the app which port to listen on; 4000 is the local default.
const port = Number(process.env.PORT ?? 4000);

const dataFile = process.env.TASKS_FILE
  ? resolve(process.env.TASKS_FILE)
  : resolve(here, '../data/tasks.json');

// When the frontend has been built, serve it from this server too.
const clientDir = process.env.CLIENT_DIR
  ? resolve(process.env.CLIENT_DIR)
  : resolve(here, '../../client/dist');

const app = createApp({ store: createStore(dataFile), clientDir });

// 0.0.0.0 rather than localhost: hosting platforms route traffic from outside
// the container, which a localhost-only listener would refuse.
app.listen(port, '0.0.0.0', () => {
  console.log(`Server listening on http://localhost:${port}`);
  console.log(`Tasks stored in ${dataFile}`);
  console.log(`Serving frontend from ${clientDir}`);
});
