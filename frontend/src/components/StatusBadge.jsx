import React from 'react';

const LABELS = {
  pending: 'En attente',
  running: 'En cours',
  success: 'Réussi',
  failed: 'Échec',
  skipped: 'Ignorée'
};

export default function StatusBadge({ status }) {
  const label = LABELS[status] || status;
  return <span className={`badge badge--${status}`}>{label}</span>;
}

export function formatDuration(ms) {
  if (ms === null || ms === undefined) return '—';
  if (ms < 1000) return `${ms} ms`;
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)} s`;
  const minutes = Math.floor(seconds / 60);
  const rest = Math.round(seconds % 60);
  return `${minutes} min ${rest}s`;
}
