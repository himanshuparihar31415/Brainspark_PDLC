import React, { Suspense, lazy } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/common/Header';
import { Sidebar } from './components/common/Sidebar';
import { ToastContainer } from './components/common/Toast';

/**
 * Views load on first navigation rather than at boot. The shell and the login
 * screen are the only things in the initial bundle; each view — and Spec AI's
 * whole workspace — arrives as its own chunk when it is actually opened, so a
 * role never downloads screens it cannot reach.
 */
const DashboardView = lazy(() =>
  import('./components/views/DashboardView').then((m) => ({ default: m.DashboardView }))
);
const DepartmentsView = lazy(() =>
  import('./components/views/DepartmentsView').then((m) => ({ default: m.DepartmentsView }))
);
const ProjectsView = lazy(() =>
  import('./components/views/ProjectsView').then((m) => ({ default: m.ProjectsView }))
);
const TeamView = lazy(() =>
  import('./components/views/TeamView').then((m) => ({ default: m.TeamView }))
);
const ConnectorsView = lazy(() =>
  import('./components/views/ConnectorsView').then((m) => ({ default: m.ConnectorsView }))
);
const AgentRegistryView = lazy(() =>
  import('./components/views/AgentRegistryView').then((m) => ({ default: m.AgentRegistryView }))
);
const ObservabilityView = lazy(() =>
  import('./components/views/ObservabilityView').then((m) => ({ default: m.ObservabilityView }))
);
const EvaluationView = lazy(() =>
  import('./components/views/EvaluationView').then((m) => ({ default: m.EvaluationView }))
);
const PromptControlsView = lazy(() =>
  import('./components/views/PromptControlsView').then((m) => ({ default: m.PromptControlsView }))
);
const SecurityView = lazy(() =>
  import('./components/views/SecurityView').then((m) => ({ default: m.SecurityView }))
);
const ProjectDashboardView = lazy(() =>
  import('./components/views/ProjectDashboardView').then((m) => ({ default: m.ProjectDashboardView }))
);
const CommandCentreView = lazy(() =>
  import('./components/views/CommandCentreView').then((m) => ({ default: m.CommandCentreView }))
);
const SpecAiView = lazy(() =>
  import('./components/views/SpecAiView').then((m) => ({ default: m.SpecAiView }))
);
const SpecAiV2View = lazy(() =>
  import('./components/specaiv2/SpecAiV2View').then((m) => ({ default: m.SpecAiV2View }))
);
const MyTasksView = lazy(() =>
  import('./components/views/MyTasksView').then((m) => ({ default: m.MyTasksView }))
);
const LoginView = lazy(() =>
  import('./components/views/LoginView').then((m) => ({ default: m.LoginView }))
);

/** Shown while a view's chunk is in flight. Deliberately quiet — it is brief. */
const ViewFallback: React.FC = () => (
  <div className="flex h-full min-h-[16rem] items-center justify-center p-8">
    <div className="flex items-center gap-2.5 text-xs text-slate-500">
      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-600" />
      Loading…
    </div>
  </div>
);

const AppContent: React.FC = () => {
  const { activeNav, isAuthenticated } = useApp();

  const renderView = () => {
    switch (activeNav) {
      case 'Dashboard':
        return <DashboardView />;
      case 'Departments':
        return <DepartmentsView />;
      case 'Projects':
        return <ProjectsView />;
      case 'Team':
        return <TeamView />;
      case 'Connectors':
        return <ConnectorsView />;
      case 'Agent Registry':
        return <AgentRegistryView />;
      case 'Observability':
        return <ObservabilityView />;
      case 'Evaluation':
        return <EvaluationView />;
      case 'Prompt Controls':
        return <PromptControlsView />;
      case 'Security':
        return <SecurityView />;
      case 'My Services':
        return <ProjectDashboardView />;
      case 'Command Centre':
        return <CommandCentreView />;
      case 'Spec AI':
        return <SpecAiView />;
      case 'Spec AI v2':
        return <SpecAiV2View />;
      case 'My Tasks':
        return <MyTasksView />;
      default:
        return <DashboardView />;
    }
  };

  if (!isAuthenticated) {
    return (
      <>
        <Suspense fallback={<ViewFallback />}>
          <LoginView />
        </Suspense>
        <ToastContainer />
      </>
    );
  }

  return (
    /*
     * h-screen, not min-h-screen. With a floor rather than a fixed height the
     * shell grows to fit its content, so `main`'s overflow never engages and any
     * scroll region inside a view is inert — the page scrolls instead. A definite
     * height here is what makes `h-full` resolve anywhere below it.
     */
    <div className="ios-mesh density-normal flex h-screen flex-col overflow-hidden font-sans text-slate-800 antialiased">
      <Header />
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <Sidebar />
        <main className="min-h-0 flex-1 overflow-y-auto bg-transparent">
          <Suspense key={activeNav} fallback={<ViewFallback />}>
            {renderView()}
          </Suspense>
        </main>
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
