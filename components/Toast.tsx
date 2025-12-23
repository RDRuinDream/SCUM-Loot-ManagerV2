import React, { useEffect, useState } from 'react';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  duration?: number;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, type = 'success', duration = 2000, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Small delay to trigger enter animation
    const timer1 = requestAnimationFrame(() => setIsVisible(true));
    
    // Auto close
    const timer2 = setTimeout(() => {
      setIsVisible(false);
      // Wait for exit animation to finish before unmounting
      setTimeout(onClose, 300);
    }, duration);

    return () => {
      cancelAnimationFrame(timer1);
      clearTimeout(timer2);
    };
  }, [duration, onClose]);

  const bgColors = {
    success: 'bg-emerald-500/90 text-white shadow-emerald-500/20',
    error: 'bg-red-500/90 text-white shadow-red-500/20',
    info: 'bg-blue-500/90 text-white shadow-blue-500/20'
  };

  return (
    <div 
      className={`fixed top-16 left-1/2 transform -translate-x-1/2 z-[9999] px-6 py-3 rounded-full shadow-lg backdrop-blur-sm font-medium text-sm transition-all duration-300 ease-out border border-white/10 ${bgColors[type]} ${
        isVisible ? 'translate-y-0 opacity-100' : '-translate-y-8 opacity-0'
      }`}
    >
      <div className="flex items-center gap-2">
        {type === 'success' && (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
        {message}
      </div>
    </div>
  );
};