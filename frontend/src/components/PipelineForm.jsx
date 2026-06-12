import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDefaultPipeline, runPipeline } from '../api.js';

export default function PipelineForm() {
  const navigate = useNavigate();
  const [repoUrl, setRepoUrl] = useState('');
  const [branch, setBranch] = useState('main');
  const [stages, setStages] = useState([]);
  const [defaultStages, setDefaultStages] = useState([]);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getDefaultPipeline()
      .then(({ stages }) => {
        setStages(stages);
        setDefaultStages(stages);
      })
      .catch(() => setError("Impossible de charger le pipeline par défaut depuis l'API."));
  }, []);

  function updateStage(index, field, value) {
    setStages((prev) => prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)));
  }

  function addStage() {
    setStages((prev) => [...prev, { name: `étape-${prev.length + 1}`, command: '' }]);
  }

  function removeStage(index) {
    setStages((prev) => prev.filter((_, i) => i !== index));
  }

  function resetStages() {
    setStages(defaultStages);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (!repoUrl.trim()) {
      setError("L'URL du dépôt est requise.");
      return;
    }
    if (stages.some((s) => !s.name.trim() || !s.command.trim())) {
      setError('Chaque étape doit avoir un nom et une commande.');
      return;
    }

    setSubmitting(true);
    try {
      const { id } = await runPipeline({ repoUrl: repoUrl.trim(), branch: branch.trim() || 'main', stages });
      navigate(`/run/${id}`);
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  return (
    <div className="page">
      <section className="panel intro">
        <h2>Lancer un déploiement</h2>
        <p>
          Renseigne l'URL d'un dépôt Git accessible publiquement (HTTPS). Le pipeline va le cloner
          dans un espace de travail isolé, puis exécuter les commandes définies pour chaque étape,
          dans l'ordre. Si une étape échoue, les étapes suivantes sont marquées comme ignorées.
        </p>
      </section>

      <form className="panel form" onSubmit={handleSubmit}>
        <div className="form__row">
          <label htmlFor="repoUrl">Dépôt Git</label>
          <input
            id="repoUrl"
            type="text"
            placeholder="https://github.com/utilisateur/projet.git"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
          />
        </div>

        <div className="form__row form__row--narrow">
          <label htmlFor="branch">Branche</label>
          <input
            id="branch"
            type="text"
            placeholder="main"
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
          />
        </div>

        <div className="form__row">
          <div className="form__row-header">
            <label>Étapes du pipeline</label>
            <button type="button" className="btn btn--ghost" onClick={resetStages}>
              Réinitialiser
            </button>
          </div>

          <div className="stage-editor">
            {stages.map((stage, index) => (
              <div className="stage-editor__row" key={index}>
                <input
                  className="stage-editor__name"
                  type="text"
                  value={stage.name}
                  onChange={(e) => updateStage(index, 'name', e.target.value)}
                  aria-label="Nom de l'étape"
                />
                <input
                  className="stage-editor__command"
                  type="text"
                  value={stage.command}
                  onChange={(e) => updateStage(index, 'command', e.target.value)}
                  aria-label="Commande de l'étape"
                />
                <button
                  type="button"
                  className="btn btn--ghost btn--icon"
                  onClick={() => removeStage(index)}
                  aria-label={`Supprimer l'étape ${stage.name}`}
                  title="Supprimer cette étape"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <button type="button" className="btn btn--ghost" onClick={addStage}>
            + Ajouter une étape
          </button>
        </div>

        {error && <p className="form__error">{error}</p>}

        <button type="submit" className="btn btn--primary" disabled={submitting}>
          {submitting ? 'Démarrage…' : 'Lancer le pipeline'}
        </button>
      </form>
    </div>
  );
}
