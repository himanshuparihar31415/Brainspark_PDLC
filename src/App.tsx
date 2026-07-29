import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/common/Header';
import { Sidebar } from './components/common/Sidebar';
import { ToastContainer } from './components/common/Toast';

import { DashboardView } from './components/views/DashboardView';
import { TenantsView } from './components/views/TenantsView';
import { ProjectsView } from './components/views/ProjectsView';
import { TeamView } from './components/views/TeamView';
import { ConnectorsView } from './components/views/ConnectorsView';
import { AgentRegistryView } from './components/views/AgentRegistryView';
import { EvaluationView } from './components/views/EvaluationView';
import { PromptControlsView } from './components/views/PromptControlsView';
import { SecurityView } from './components/views/SecurityView';
import { MyServicesView } from './components/views/MyServicesView';
import { CommandCentreView } from './components/views/CommandCentreView';
import { SpecAiView } from './components/views/SpecAiView';
import { MyTasksView } from './components/views/MyTasksView';
import { LoginView } from './components/views/LoginView';

const AppContent: React.FC = () => {
  const { activeNav, isAuthenticated } = useApp();

  const renderView = () => {
    switch (activeNav) {
      case 'Dashboard':
        return <DashboardView />;
      case 'Tenants':
        return <TenantsView />;
      case 'Projects':
        return <ProjectsView />;
      case 'Team':
        return <TeamView />;
      case 'Connectors':
        return <ConnectorsView />;
      case 'Agent Registry':
        return <AgentRegistryView />;
      case 'Evaluation':
        return <EvaluationView />;
      case 'Prompt Controls':
        return <PromptControlsView />;
      case 'Security':
        return <SecurityView />;
      case 'My Services':
        return <MyServicesView />;
      case 'Command Centre':
        return <CommandCentreView />;
      case 'Spec AI':
        return <SpecAiView />;
      case 'My Tasks':
        return <MyTasksView />;
      default:
        return <DashboardView />;
    }
  };

  if (!isAuthenticated) {
    return (
      <>
        <LoginView />
        <ToastContainer />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-800 flex flex-col font-sans antialiased">
      <Header />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        <main className="flex-1 min-h-0 overflow-y-auto bg-slate-100/60">{renderView()}</main>
      </div>
      <ToastContainer />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
