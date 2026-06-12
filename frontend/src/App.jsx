import React from 'react';
import { NavLink, Routes, Route } from 'react-router-dom';

import PipelineForm from './components/PipelineForm.jsx';
import PipelineDashboard from './components/PipelineDashboard.jsx';
import DeploymentHistory from './components/DeploymentHistory.jsx';
import DeploymentDetails from './components/DeploymentDetails.jsx';

export default function App() {
  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar__brand">
          <span className="topbar__node topbar__node--success" />
          <span className="topbar__node topbar__node--accent" />
          <span className="topbar__node topbar__node--running" />
          <h1>Pipeline CI/CD</h1>
        </div>
        <nav className="topbar__nav">
          <NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : '')}>
            Nouveau déploiement
          </NavLink>
          <NavLink to="/history" className={({ isActive }) => (isActive ? 'active' : '')}>
            Historique
          </NavLink>
        </nav>
      </header>

      <main className="content">
        <Routes>
          <Route path="/" element={<PipelineForm />} />
          <Route path="/run/:id" element={<PipelineDashboard />} />
          <Route path="/history" element={<DeploymentHistory />} />
          <Route path="/history/:id" element={<DeploymentDetails />} />
        </Routes>
      </main>

      <footer className="footer">
        Projet pédagogique &mdash; pipeline CI/CD exécuté localement (Node.js + Express + Socket.IO + React)
      </footer>
    </div>
  );
}
