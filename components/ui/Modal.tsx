import React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import Button from './Button';
import { useGame } from '../../context/GameContext';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  variant?: 'danger' | 'warning' | 'info';
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  variant = 'info'
}) => {
  const { themeMode } = useGame();

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  const variantColors = {
    danger: 'border-red-500/30',
    warning: 'border-red-500/30',
    info: 'border-blue-500/30'
  };

  const modalContent = (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div 
        className={`
          relative max-w-md w-full rounded-3xl border shadow-2xl
          ${themeMode === 'dark' ? 'bg-black/90 border-white/10' : 'bg-white border-zinc-200'}
          ${variantColors[variant]}
          animate-in zoom-in duration-200
        `}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6">
          <h3 className={`text-xl font-display font-bold mb-3 ${themeMode === 'dark' ? 'text-white' : 'text-zinc-900'}`}>
            {title}
          </h3>
          <p className={`text-sm mb-6 ${themeMode === 'dark' ? 'text-zinc-300' : 'text-zinc-700'}`}>
            {message}
          </p>

          <div className="flex gap-3 justify-end">
            <Button variant="ghost" onClick={onClose}>
              {cancelText}
            </Button>
            <Button 
              variant={variant === 'danger' ? 'danger' : 'primary'} 
              onClick={handleConfirm}
            >
              {confirmText}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default Modal;
