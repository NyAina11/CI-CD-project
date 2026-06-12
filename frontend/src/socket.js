import { io } from 'socket.io-client';

// Connexion unique partagée par toute l'application.
// En dev, le proxy Vite redirige /socket.io vers le backend (port 4000).
export const socket = io({
  path: '/socket.io',
  autoConnect: true
});
