const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, '..', 'data', 'deployments.json');

/**
 * Petite couche de persistance "fichier JSON".
 * Suffisante pour un projet pédagogique mono-utilisateur :
 * on relit/réécrit le fichier complet à chaque opération.
 * (Une vraie application ferait plutôt appel à SQLite/Postgres.)
 */

function readAll() {
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    return raw.trim() ? JSON.parse(raw) : [];
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
}

function writeAll(list) {
  fs.writeFileSync(DB_FILE, JSON.stringify(list, null, 2));
}

function getAll() {
  return readAll();
}

function getDeployment(id) {
  return readAll().find((d) => d.id === id) || null;
}

function saveDeployment(deployment) {
  const all = readAll();
  all.unshift(deployment); // les plus récents en premier
  writeAll(all);
  return deployment;
}

function updateDeployment(id, patch) {
  const all = readAll();
  const idx = all.findIndex((d) => d.id === id);
  if (idx === -1) return null;
  all[idx] = { ...all[idx], ...patch };
  writeAll(all);
  return all[idx];
}

function updateStage(id, stageName, patch) {
  const all = readAll();
  const idx = all.findIndex((d) => d.id === id);
  if (idx === -1) return null;
  const stage = all[idx].stages.find((s) => s.name === stageName);
  if (!stage) return null;
  Object.assign(stage, patch);
  writeAll(all);
  return all[idx];
}

module.exports = {
  getAll,
  getDeployment,
  saveDeployment,
  updateDeployment,
  updateStage
};
