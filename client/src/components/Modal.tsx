import type { ReactNode } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

export const Modal = ({ isOpen, onClose, title, children }: ModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-4">
      <div
        className="
          w-full bg-white dark:bg-gray-900
          shadow-xl
          h-full sm:h-auto
          rounded-none sm:rounded-xl
          max-w-md
          relative
          p-4 sm:p-6
        "
      >
        {/* Close */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          aria-label="Close"
        >
          ✕
        </button>

        {title && (
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 text-center sm:text-left mt-2 sm:mt-0">
            {title}
          </h2>
        )}

        {children}
      </div>
    </div>
  );
};


