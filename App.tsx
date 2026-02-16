
import React, { useState, useEffect } from 'react';
import { GameProvider, useGame } from './context/GameContext';
import Layout from './components/Layout';
import Queue from './components/Queue';
import Profile from './components/Profile';
import Leaderboard from './components/Leaderboard';
import MatchInterface from './components/MatchInterface';
import MatchHistory from './components/MatchHistory';
import AdminReports from './components/AdminReports';
import Auth from './components/Auth';
import QuestsView from './components/QuestsView';
import FriendsView from './components/FriendsView';
import { ToastContainer } from './components/ui/Toast';

const AppContent = () => {
  const { matchState, isAuthenticated, viewProfileId, setViewProfileId, toasts, removeToast, themeMode } = useGame();
  const [currentView, setCurrentView] = useState('queue');

  // If viewProfileId is set, force switch to profile view
  useEffect(() => {
    if (viewProfileId) {
        setCurrentView('profile');
    }
  }, [viewProfileId]);

  // If switching away from profile, clear the selected ID
  const handleSetCurrentView = (view: string) => {
    setCurrentView(view);
    if (view !== 'profile') {
        setViewProfileId(null);
    }
  };

  if (!isAuthenticated) {
      return (
          <Layout currentView="auth" setCurrentView={() => {}}>
              <Auth />
          </Layout>
      );
  }

  let content;

  if (currentView === 'queue' && matchState && matchState.phase !== 'FINISHED') {
     content = <MatchInterface />;
  } else if (matchState && matchState.phase === 'FINISHED' && currentView === 'queue') {
     content = <MatchInterface />;
  } else {
    switch (currentView) {
        case 'queue':
            content = <Queue />;
            break;
        case 'profile':
            content = <Profile />;
            break;
        case 'leaderboard':
            content = <Leaderboard />;
            break;
        case 'history':
            content = <MatchHistory />;
            break;
        case 'quests':
            content = <QuestsView />;
            break;
        case 'friends':
            content = <FriendsView />;
            break;
        case 'reports':
            content = <AdminReports />;
            break;
        default:
            content = <Queue />;
    }
  }

  return (
    <>
      <Layout currentView={currentView} setCurrentView={handleSetCurrentView}>
        {content}
      </Layout>
      <ToastContainer 
        toasts={toasts} 
        onRemove={removeToast}
        themeMode={themeMode}
      />
    </>
  );
};

const App = () => {
  return (
    <GameProvider>
      <AppContent />
    </GameProvider>
  );
};

export default App;
