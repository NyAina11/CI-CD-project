import React, { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getDeployment } from '../api.js';
import { socket } from '../socket.js';
import StageNode from './StageNode.jsx';
import StatusBadge from './StatusBadge.jsx';

export default function PipelineDashboard() {
  const { id } = useParams();
  const [deployment, setDeployment] = useState(null);
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState(null);
  const logEndRef = useRef(null);

  // Chargement initial de l'état du déploiement (au cas où la page est rechargée
  // après que certaines étapes se soient déjà déroulées)
  useEffect(() => {
    let cancelled = false;
    getDeployment(id)
      .then((data) => {
        if (cancelled) return;
        const { logs: initialLogs, ...rest } = data;
        setDeployment(rest);
        setLogs(initialLogs || []);
      })
      .catch((err) => setError(err.message));
    return () => {
      cancelled = true;
    };
  }, [id]);

  // Abonnement aux mises à jour en direct via Socket.IO
  useEffect(() => {
    socket.emit('join-run', id);

    const onLog = (entry) => {
      if (entry) setLogs((prev) => [...prev, entry]);
    };

    const onStageUpdate = ({ stage, status, durationMs }) => {
      setDeployment((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          stages: prev.stages.map((s) => (s.name === stage ? { ...s, status, durationMs } : s))
        };
      });
    };

    const onStatus = ({ status }) => {
      setDeployment((prev) => (prev ? { ...prev, status, finishedAt: new Date().toISOString() } : prev));
    };

    socket.on('log', onLog);
    socket.on('stage-update', onStageUpdate);
    socket.on('status', onStatus);

    return () => {
      socket.emit('leave-run', id);
      socket.off('log', onLog);
      socket.off('stage-update', onStageUpdate);
      socket.off('status', onStatus);
    };
  }, [id]);

  // Auto-scroll vers le bas à chaque nouvelle ligne de log
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [logs]);

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
        <p>Chargement du pipeline…</p>
      </div>
    );
  }

  const activeStageName = deployment.stages.find((s) => s.status === 'running')?.name;

  return (
    <div className="page">
      <section className="panel run-header">
        <div>
          <h2>Exécution en cours</h2>
          <p className="run-header__repo">
            {deployment.repoUrl} <span className="run-header__branch">@ {deployment.branch}</span>
          </p>
        </div>
        <StatusBadge status={deployment.status} />
      </section>

      <section className="panel">
        <h3 className="panel__title">Pipeline</h3>
        <div className="pipeline-flow">
          {deployment.stages.map((stage, i) => (
            <StageNode
              key={stage.name}
              stage={stage}
              isLast={i === deployment.stages.length - 1}
              isActive={stage.name === activeStageName}
            />
          ))}
        </div>
      </section>

      <section className="panel">
        <h3 className="panel__title">Logs en direct</h3>
        <div className="log-console">
          {logs.length === 0 && <div className="log-console__empty">En attente des premiers logs…</div>}
          {logs.map((entry, i) => (
            <div className="log-console__line" key={i}>
              <span className="log-console__stage">[{entry.stage}]</span>
              <span className="log-console__text">{entry.line}</span>
            </div>
          ))}
          <div ref={logEndRef} />
        </div>
      </section>

      <Link to="/history" className="btn btn--ghost">
        Voir l'historique des déploiements
      </Link>
    </div>
  );
}
