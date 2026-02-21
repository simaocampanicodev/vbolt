
import React, { useState, useEffect } from 'react';
import { GameProvider, useGame } from './context/GameContext';
import Layout from './components/Layout';
import Queue from './components/Queue';
import Profile from './components/Profile';
import Leaderboard from './components/Leaderboard';
import MatchInterface from './components/MatchInterface';
import MatchHistory from './components/MatchHistory';
import AdminDashboard from './components/AdminDashboard';
import SuggestionsView from './components/SuggestionsView';
import Auth from './components/Auth';
import QuestsView from './components/QuestsView';
import FriendsView from './components/FriendsView';
import Home from './components/Home';
import { ToastContainer } from './components/ui/Toast';

const AppContent = () => {
  const { matchState, isAuthenticated, viewProfileId, setViewProfileId, toasts, removeToast, themeMode, hasDashboardAccess } = useGame();
  const [currentView, setCurrentView] = useState('home');
  const [pendingMatchId, setPendingMatchId] = useState<string | null>(null);

  // If viewProfileId is set, force switch to profile view and scroll to top
  useEffect(() => {
    if (viewProfileId) {
      setCurrentView('profile');
      window.scrollTo(0, 0);
    }
  }, [viewProfileId]);

  // If switching away from profile, clear the selected ID
  const handleSetCurrentView = (view: string, matchId?: string) => {
    setCurrentView(view);
    if (view !== 'profile') {
      setViewProfileId(null);
    }
    // Track pending match ID for history deep-link
    if (view === 'history' && matchId) {
      setPendingMatchId(matchId);
    } else if (view !== 'history') {
      setPendingMatchId(null);
    }
  };

  if (!isAuthenticated) {
    return (
      <Layout currentView="auth" setCurrentView={() => { }}>
        <Auth />
      </Layout>
    );
  }

  let content;

  // Priority: Profile view > Match interface > Other views
  if (currentView === 'profile' && viewProfileId) {
    content = <Profile />;
  } else if (currentView === 'queue' && matchState && matchState.phase !== 'FINISHED') {
    content = <MatchInterface />;
  } else if (matchState && matchState.phase === 'FINISHED' && currentView === 'queue') {
    content = <MatchInterface />;
  } else {
    switch (currentView) {
      case 'home':
        content = <Home setCurrentView={handleSetCurrentView} />;
        break;
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
        content = <MatchHistory initialMatchId={pendingMatchId} onMatchOpened={() => setPendingMatchId(null)} />;
        break;
      case 'quests':
        content = <QuestsView />;
        break;
      case 'friends':
        content = <FriendsView />;
        break;
      case 'suggestions':
        content = <SuggestionsView />;
        break;
      case 'dashboard':
        content = <AdminDashboard />;
        break;
      default:
        content = <Home setCurrentView={handleSetCurrentView} />;
    }
  }

  return (
    <>
      <Layout currentView={currentView} setCurrentView={handleSetCurrentView}>
        <div key={currentView} className="view-transition-enter">
          {content}
        </div>
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
