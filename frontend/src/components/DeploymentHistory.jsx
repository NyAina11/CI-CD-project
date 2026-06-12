import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getDeployments } from '../api.js';
import StatusBadge, { formatDuration } from './StatusBadge.jsx';

export default function DeploymentHistory() {
  const [deployments, setDeployments] = useState(null);
  const [error, setError] = useState(null);

  function load() {
    getDeployments()
      .then(setDeployments)
      .catch((err) => setError(err.message));
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="page">
      <section className="panel">
        <div className="form__row-header">
          <h2>Historique des déploiements</h2>
          <button type="button" className="btn btn--ghost" onClick={load}>
            Rafraîchir
          </button>
        </div>

        {error && <p className="form__error">{error}</p>}

        {deployments && deployments.length === 0 && (
          <p className="empty-state">
            Aucun déploiement pour le moment. <Link to="/">Lance ton premier pipeline</Link>.
          </p>
        )}

        {deployments && deployments.length > 0 && (
          <table className="history-table">
            <thead>
              <tr>
                <th>Dépôt</th>
                <th>Branche</th>
                <th>Statut</th>
                <th>Démarré le</th>
                <th>Durée</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {deployments.map((d) => (
                <tr key={d.id}>
                  <td className="history-table__repo">{d.repoUrl}</td>
                  <td>
                    <code>{d.branch}</code>
                  </td>
                  <td>
                    <StatusBadge status={d.status} />
                  </td>
                  <td>{formatDate(d.startedAt)}</td>
                  <td>{formatDuration(computeDuration(d))}</td>
                  <td>
                    <Link
                      to={d.status === 'running' ? `/run/${d.id}` : `/history/${d.id}`}
                      className="btn btn--ghost btn--small"
                    >
                      Détails
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

function computeDuration(d) {
  if (!d.startedAt) return null;
  const end = d.finishedAt ? new Date(d.finishedAt) : new Date();
  return end - new Date(d.startedAt);
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('fr-FR');
}
