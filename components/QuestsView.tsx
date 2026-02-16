
import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import Quests from './Quests';
import Button from './ui/Button';
import Modal from './ui/Modal';

const QuestsView = () => {
  const { themeMode, isAdmin, resetDailyQuests } = useGame();
  const [showResetModal, setShowResetModal] = useState(false);

  const handleReset = () => {
      setShowResetModal(true);
  };

  const confirmReset = () => {
      resetDailyQuests();
      setShowResetModal(false);
  };

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8 text-center">
        <h2 className={`text-4xl font-display font-bold ${themeMode === 'dark' ? 'text-white' : 'text-black'}`}>QUESTS</h2>
        <p className="text-zinc-500 uppercase tracking-widest text-xs mt-2">Daily Objectives & Rewards</p>
      </div>

      <div className="flex flex-col items-center">
        <Quests />
        
        {isAdmin && (
            <div className="mt-8 pt-8 border-t border-white/5 w-full max-w-2xl text-center">
                <p className="text-xs text-zinc-600 mb-4 uppercase tracking-widest">[Admin Controls]</p>
                <Button variant="danger" size="sm" onClick={handleReset}>
                    Force Reset Quests
                </Button>
            </div>
        )}
      </div>

      <Modal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        title="Reset Quests"
        message="This will replace current quests for you. Are you sure?"
        confirmText="Reset"
        cancelText="Cancel"
        onConfirm={confirmReset}
        variant="warning"
      />
    </div>
  );
};

export default QuestsView;
