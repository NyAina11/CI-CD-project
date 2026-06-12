const express = require('express');

const db = require('../db');
const { startPipeline, defaultStages, readLogs } = require('../pipelineExecutor');

const REPO_URL_REGEX = /^(https?:\/\/|git@)\S+$/i;

module.exports = function createApiRouter(io) {
  const router = express.Router();

  // Pipeline par défaut proposé au formulaire (le frontend peut le récupérer et le pré-remplir)
  router.get('/pipelines/default', (req, res) => {
    res.json({ stages: defaultStages() });
  });

  // Déclenche un nouveau pipeline
  router.post('/pipelines/run', (req, res) => {
    const { repoUrl, branch, stages } = req.body || {};

    if (!repoUrl || typeof repoUrl !== 'string' || !REPO_URL_REGEX.test(repoUrl.trim())) {
      return res.status(400).json({
        error: "L'URL du dépôt est requise et doit commencer par http(s):// ou git@"
      });
    }

    if (stages && !Array.isArray(stages)) {
      return res.status(400).json({ error: "Le champ 'stages' doit être un tableau" });
    }

    if (stages) {
      for (const stage of stages) {
        if (!stage || typeof stage.name !== 'string' || typeof stage.command !== 'string') {
          return res.status(400).json({
            error: "Chaque étape doit avoir un 'name' et une 'command' de type texte"
          });
        }
        if (!stage.command.trim()) {
          return res.status(400).json({ error: `La commande de l'étape "${stage.name}" est vide` });
        }
      }
    }

    const id = startPipeline(io, { repoUrl: repoUrl.trim(), branch, stages });
    res.status(202).json({ id });
  });

  // Historique des déploiements (résumé, sans les logs complets)
  router.get('/deployments', (req, res) => {
    const all = db.getAll();
    res.json(all);
  });

  // Détail d'un déploiement, y compris les logs complets
  router.get('/deployments/:id', (req, res) => {
    const deployment = db.getDeployment(req.params.id);
    if (!deployment) {
      return res.status(404).json({ error: 'Déploiement introuvable' });
    }
    const logs = readLogs(req.params.id);
    res.json({ ...deployment, logs });
  });

  // Logs bruts d'un déploiement (utile pour debug ou export)
  router.get('/deployments/:id/logs', (req, res) => {
    const deployment = db.getDeployment(req.params.id);
    if (!deployment) {
      return res.status(404).json({ error: 'Déploiement introuvable' });
    }
    res.json({ logs: readLogs(req.params.id) });
  });

  return router;
};
