const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const db = require('./db');

const WORKSPACES_DIR = path.join(__dirname, '..', 'workspaces');
const LOGS_DIR = path.join(__dirname, '..', 'data', 'logs');

// Durée maximale d'une étape avant interruption forcée (évite qu'une commande bloque le pipeline)
const STAGE_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Pipeline par défaut pour un projet Node.js.
 * L'étape "clone" est toujours ajoutée automatiquement en première position
 * et n'est pas modifiable depuis le formulaire.
 */
function defaultStages() {
  return [
    { name: 'install', command: 'npm install' },
    { name: 'test', command: 'npm test' },
    { name: 'build', command: 'npm run build --if-present' },
    {
      name: 'deploy',
      command:
        'echo "Déploiement : remplace cette commande par ton vrai script (docker build, rsync, pm2 restart, ...)"'
    }
  ];
}

/**
 * Démarre un nouveau pipeline de manière asynchrone et retourne immédiatement
 * son identifiant, pour que l'API puisse répondre sans attendre la fin de l'exécution.
 */
function startPipeline(io, { repoUrl, branch, stages }) {
  const id = uuidv4();
  const safeBranch = branch && branch.trim() ? branch.trim() : 'main';

  const customStages = Array.isArray(stages) && stages.length > 0 ? stages : defaultStages();

  const cloneStage = {
    name: 'clone',
    command: `git clone --branch ${safeBranch} --single-branch --depth 1 ${repoUrl} .`
  };

  const allStages = [cloneStage, ...customStages].map((s) => ({
    name: s.name,
    command: s.command,
    status: 'pending',
    durationMs: null
  }));

  const deployment = {
    id,
    repoUrl,
    branch: safeBranch,
    status: 'running',
    startedAt: new Date().toISOString(),
    finishedAt: null,
    stages: allStages
  };

  db.saveDeployment(deployment);

  // Exécution en arrière-plan, on ne bloque pas la réponse HTTP
  executePipeline(io, id, allStages).catch((err) => {
    console.error(`Erreur inattendue dans le pipeline ${id}:`, err);
    db.updateDeployment(id, { status: 'failed', finishedAt: new Date().toISOString() });
    io.to(`run:${id}`).emit('status', { id, status: 'failed' });
  });

  return id;
}

async function executePipeline(io, id, stages) {
  const workspace = path.join(WORKSPACES_DIR, id);
  const logPath = path.join(LOGS_DIR, `${id}.jsonl`);

  fs.mkdirSync(workspace, { recursive: true });
  const logStream = fs.createWriteStream(logPath, { flags: 'a' });

  const emitLog = (stageName, line) => {
    const entry = { stage: stageName, line, ts: new Date().toISOString() };
    logStream.write(JSON.stringify(entry) + '\n');
    io.to(`run:${id}`).emit('log', entry);
  };

  const setStageStatus = (stageName, status, durationMs = null) => {
    db.updateStage(id, stageName, { status, durationMs });
    io.to(`run:${id}`).emit('stage-update', { id, stage: stageName, status, durationMs });
  };

  let pipelineFailed = false;

  for (const stage of stages) {
    if (pipelineFailed) {
      setStageStatus(stage.name, 'skipped');
      continue;
    }

    setStageStatus(stage.name, 'running');
    emitLog(stage.name, `$ ${stage.command}`);

    const start = Date.now();
    // Le clone s'exécute dans le dossier parent (le dépôt est cloné DANS workspace via "git clone ... .")
    const cwd = workspace;
    const { code } = await runCommand(stage.command, cwd, (line) => emitLog(stage.name, line));
    const durationMs = Date.now() - start;

    if (code === 0) {
      setStageStatus(stage.name, 'success', durationMs);
    } else {
      setStageStatus(stage.name, 'failed', durationMs);
      emitLog(stage.name, `✖ Étape terminée avec le code de sortie ${code}`);
      pipelineFailed = true;
    }
  }

  logStream.end();

  const finalStatus = pipelineFailed ? 'failed' : 'success';
  db.updateDeployment(id, { status: finalStatus, finishedAt: new Date().toISOString() });
  io.to(`run:${id}`).emit('status', { id, status: finalStatus });
}

/**
 * Exécute une commande shell, en streamant chaque ligne de stdout/stderr via onLine.
 * Résout avec { code } (code de sortie du process).
 */
function runCommand(command, cwd, onLine) {
  return new Promise((resolve) => {
    const child = spawn(command, {
      cwd,
      shell: true,
      env: { ...process.env, CI: 'true', FORCE_COLOR: '0', GIT_TERMINAL_PROMPT: '0' }
    });

    const timeout = setTimeout(() => {
      onLine(`⏱ Temps maximum dépassé (${STAGE_TIMEOUT_MS / 1000}s), arrêt de la commande.`);
      child.kill('SIGKILL');
    }, STAGE_TIMEOUT_MS);

    const attach = (stream) => {
      let buffer = '';
      stream.on('data', (chunk) => {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop();
        for (const line of lines) onLine(line);
      });
      stream.on('close', () => {
        if (buffer) onLine(buffer);
      });
    };

    attach(child.stdout);
    attach(child.stderr);

    child.on('error', (err) => {
      clearTimeout(timeout);
      onLine(`Erreur lors du lancement de la commande : ${err.message}`);
      resolve({ code: 1 });
    });

    child.on('close', (code) => {
      clearTimeout(timeout);
      resolve({ code: code === null ? 1 : code });
    });
  });
}

/**
 * Lit le fichier de logs JSONL associé à une exécution et le retourne sous forme de tableau.
 */
function readLogs(id) {
  const logPath = path.join(LOGS_DIR, `${id}.jsonl`);
  if (!fs.existsSync(logPath)) return [];
  return fs
    .readFileSync(logPath, 'utf-8')
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return { stage: 'system', line, ts: null };
      }
    });
}

module.exports = {
  startPipeline,
  defaultStages,
  readLogs
};
