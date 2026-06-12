/**
 * Chaque exécution de pipeline possède une "room" Socket.IO nommée run:<id>.
 * Le frontend rejoint cette room pour recevoir en direct :
 *  - 'stage-update' : changement de statut d'une étape (pending/running/success/failed/skipped)
 *  - 'log'          : nouvelle ligne de log produite par une étape
 *  - 'status'       : statut global du déploiement (running/success/failed)
 */
function initSocket(io) {
  io.on('connection', (socket) => {
    socket.on('join-run', (runId) => {
      if (typeof runId === 'string' && runId.length > 0) {
        socket.join(`run:${runId}`);
      }
    });

    socket.on('leave-run', (runId) => {
      if (typeof runId === 'string' && runId.length > 0) {
        socket.leave(`run:${runId}`);
      }
    });
  });
}

module.exports = { initSocket };
