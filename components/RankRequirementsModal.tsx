import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import Card from './ui/Card';
import { RANK_THRESHOLDS } from '../constants';
import type { ThemeMode } from '../types';

interface RankRequirementsModalProps {
  isOpen: boolean;
  onClose: () => void;
  themeMode: ThemeMode;
}

/** Ranks from highest (Top 3) to lowest (Iron) */
const RANKS_DESC = [...RANK_THRESHOLDS].reverse();

export const RankRequirementsModal: React.FC<RankRequirementsModalProps> = ({ isOpen, onClose, themeMode }) => {
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  const modal = (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <Card
        className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rank-modal-scroll animate-in zoom-in duration-200 flex flex-col"
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6 flex-shrink-0">
          <h3 className="text-2xl font-display font-bold text-white">Rank Requirements</h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3 flex-1 min-h-0">
          {RANKS_DESC.map((rankThreshold, index) => {
            const level = rankThreshold.level ?? (RANK_THRESHOLDS.length - index);
            const maxDisplay = rankThreshold.max === Infinity ? '2000+' : rankThreshold.max;
            const minDisplay = rankThreshold.min === 0 ? '0' : rankThreshold.min;

            return (
              <div
                key={`${rankThreshold.name}-${level}`}
                className={`p-4 rounded-xl flex items-center justify-between transition-colors flex-shrink-0 ${
                  themeMode === 'dark'
                    ? 'bg-white/5 hover:bg-white/10'
                    : 'bg-black/5 hover:bg-black/10'
                }`}
              >
                <div className="flex items-center gap-3 flex-1">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center border-2 font-bold text-white text-sm flex-shrink-0"
                    style={{
                      backgroundColor: `${rankThreshold.color}20`,
                      borderColor: rankThreshold.color,
                      color: rankThreshold.color
                    }}
                  >
                    {level}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-white">
                      {rankThreshold.name} {level === 10 ? '(Level 10)' : ''}
                    </h4>
                    <p className="text-xs text-zinc-400">
                      {minDisplay} - {maxDisplay} points
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );

  return createPortal(modal, document.body);
};

export default RankRequirementsModal;
