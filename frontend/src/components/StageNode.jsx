import React from 'react';
import { formatDuration } from './StatusBadge.jsx';

const ICONS = {
  pending: '○',
  running: '◐',
  success: '✓',
  failed: '✕',
  skipped: '–'
};

/**
 * Représente une étape du pipeline sous forme de nœud relié par un "tuyau"
 * au nœud suivant. La couleur du tuyau reflète l'état d'avancement :
 * un tuyau "en charge" (amber) entre une étape réussie et la suivante en cours,
 * vert s'il mène vers une étape déjà réussie, rouge en cas d'échec.
 */
export default function StageNode({ stage, isLast, isActive }) {
  return (
    <div className="stage-node">
      <div className="stage-node__column">
        <div className={`stage-node__circle stage-node__circle--${stage.status}`}>
          <span className="stage-node__icon">{ICONS[stage.status] || '○'}</span>
        </div>
        {!isLast && <div className={`stage-node__pipe stage-node__pipe--${pipeState(stage)}`} />}
      </div>
      <div className="stage-node__info">
        <div className="stage-node__name">{stage.name}</div>
        <code className="stage-node__command">{stage.command}</code>
        <div className="stage-node__meta">
          <span className={`badge badge--${stage.status}`}>{labelFor(stage.status)}</span>
          <span className="stage-node__duration">{formatDuration(stage.durationMs)}</span>
        </div>
      </div>
    </div>
  );
}

function pipeState(stage) {
  if (stage.status === 'success') return 'success';
  if (stage.status === 'failed') return 'failed';
  if (stage.status === 'running') return 'flowing';
  return 'idle';
}

function labelFor(status) {
  const labels = {
    pending: 'En attente',
    running: 'En cours',
    success: 'Réussi',
    failed: 'Échec',
    skipped: 'Ignorée'
  };
  return labels[status] || status;
}
