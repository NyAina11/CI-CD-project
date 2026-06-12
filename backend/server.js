const express = require('express');
const http = require('http');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { Server } = require('socket.io');

const createApiRouter = require('./src/routes/api');
const { initSocket } = require('./src/socket');

// S'assure que les dossiers de données existent (utile sur un clone tout neuf)
const DATA_DIR = path.join(__dirname, 'data');
const LOGS_DIR = path.join(DATA_DIR, 'logs');
const WORKSPACES_DIR = path.join(__dirname, 'workspaces');
const DB_FILE = path.join(DATA_DIR, 'deployments.json');

for (const dir of [DATA_DIR, LOGS_DIR, WORKSPACES_DIR]) {
  fs.mkdirSync(dir, { recursive: true });
}
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, '[]');
}

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

initSocket(io);
app.use('/api', createApiRouter(io));

app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'cicd-backend' });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Serveur CI/CD démarré sur http://localhost:${PORT}`);
});
