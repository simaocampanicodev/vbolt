import React, { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

/** Banner aspect ratio (wide): same as profile banner area ~3.5:1 */
const BANNER_ASPECT = 3.5;

interface BannerCropModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Object URL of the selected image (caller creates with URL.createObjectURL(file)) */
  imageUrl: string;
  onConfirm: (position: string) => void;
  themeMode: 'light' | 'dark';
}

export const BannerCropModal: React.FC<BannerCropModalProps> = ({
  isOpen,
  onClose,
  imageUrl,
  onConfirm,
  themeMode
}) => {
  const [position, setPosition] = useState({ x: 50, y: 50 });
  const [dragging, setDragging] = useState(false);
  const lastPointerRef = useRef({ x: 0, y: 0 });

  const clamp = (v: number) => Math.max(0, Math.min(100, v));

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    setDragging(true);
    lastPointerRef.current = { x: e.clientX, y: e.clientY };
  }, []);

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: PointerEvent) => {
      const dx = e.clientX - lastPointerRef.current.x;
      const dy = e.clientY - lastPointerRef.current.y;
      lastPointerRef.current = { x: e.clientX, y: e.clientY };
      setPosition(prev => ({
        x: clamp(prev.x - dx * 0.5),
        y: clamp(prev.y - dy * 0.5)
      }));
    };
    const onUp = () => setDragging(false);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [dragging]);

  const handleConfirm = () => {
    onConfirm(`${Math.round(position.x)}% ${Math.round(position.y)}%`);
    onClose();
  };

  useEffect(() => {
    if (isOpen) setPosition({ x: 50, y: 50 });
  }, [isOpen]);

  if (!isOpen) return null;

  const content = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center min-h-screen min-w-full bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className={`relative w-full max-w-3xl rounded-2xl border shadow-2xl overflow-hidden ${
          themeMode === 'dark' ? 'bg-zinc-900 border-white/10' : 'bg-white border-zinc-200'
        } animate-in zoom-in duration-200`}
        onClick={e => e.stopPropagation()}
      >
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <h3 className={`text-lg font-display font-bold ${themeMode === 'dark' ? 'text-white' : 'text-zinc-900'}`}>
            Adjust banner position
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className={`px-4 pt-2 text-sm ${themeMode === 'dark' ? 'text-zinc-400' : 'text-zinc-600'}`}>
          Drag the image to choose which part appears on your profile banner.
        </p>

        {/* Preview frame: banner aspect ratio */}
        <div
          className="relative w-full overflow-hidden select-none touch-none"
          style={{ aspectRatio: BANNER_ASPECT }}
        >
          <div
            className="absolute inset-0 cursor-grab active:cursor-grabbing"
            style={{
              backgroundImage: `url(${imageUrl})`,
              backgroundSize: 'cover',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: `${position.x}% ${position.y}%`
            }}
            onPointerDown={handlePointerDown}
          />
        </div>

        <div className="p-4 flex gap-3 justify-end border-t border-white/10">
          <button
            type="button"
            onClick={onClose}
            className={`px-4 py-2 rounded-xl font-medium transition-colors ${
              themeMode === 'dark'
                ? 'text-zinc-400 hover:text-white hover:bg-white/10'
                : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
            }`}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-colors"
          >
            Use this position
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
};
