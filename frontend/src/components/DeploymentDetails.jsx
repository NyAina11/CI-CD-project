import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getDeployment } from '../api.js';
import StageNode from './StageNode.jsx';
import StatusBadge from './StatusBadge.jsx';

export default function DeploymentDetails() {
  const { id } = useParams();
  const [deployment, setDeployment] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    getDeployment(id)
      .then(setDeployment)
      .catch((err) => setError(err.message));
  }, [id]);

  if (error) {
    return (
      <div className="page">
        <p className="form__error">{error}</p>
        <Link to="/history" className="btn btn--ghost">
          Retour à l'historique
        </Link>
      </div>
    );
  }

  if (!deployment) {
    return (
      <div className="page">
        <p>Chargement…</p>
      </div>
    );
  }

  const logsByStage = {};
  for (const entry of deployment.logs || []) {
    (logsByStage[entry.stage] ||= []).push(entry);
  }

  return (
    <div className="page">
      <section className="panel run-header">
        <div>
          <h2>Détails du déploiement</h2>
          <p className="run-header__repo">
            {deployment.repoUrl} <span className="run-header__branch">@ {deployment.branch}</span>
          </p>
          <p className="run-header__meta">
            Démarré le {formatDate(deployment.startedAt)}
            {deployment.finishedAt && <> — terminé le {formatDate(deployment.finishedAt)}</>}
          </p>
        </div>
        <StatusBadge status={deployment.status} />
      </section>

      <section className="panel">
        <h3 className="panel__title">Pipeline</h3>
        <div className="pipeline-flow">
          {deployment.stages.map((stage, i) => (
            <StageNode key={stage.name} stage={stage} isLast={i === deployment.stages.length - 1} />
          ))}
        </div>
      </section>

      <section className="panel">
        <h3 className="panel__title">Logs par étape</h3>
        {deployment.stages.map((stage) => (
          <details className="log-section" key={stage.name} open={stage.status === 'failed'}>
            <summary>
              <span className="stage-node__name">{stage.name}</span>
              <StatusBadge status={stage.status} />
            </summary>
            <div className="log-console log-console--static">
              {(logsByStage[stage.name] || []).map((entry, i) => (
                <div className="log-console__line" key={i}>
                  <span className="log-console__text">{entry.line}</span>
                </div>
              ))}
              {!(logsByStage[stage.name] || []).length && (
                <div className="log-console__empty">Aucun log pour cette étape.</div>
              )}
            </div>
          </details>
        ))}
      </section>

      <Link to="/history" className="btn btn--ghost">
        Retour à l'historique
      </Link>
    </div>
  );
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('fr-FR');
}
