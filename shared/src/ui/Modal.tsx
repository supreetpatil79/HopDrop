import { PropsWithChildren } from 'react';

export interface ModalProps extends PropsWithChildren {
  open: boolean;
  title?: string;
  onClose: () => void;
}

export function Modal({ open, title, onClose, children }: ModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-lg bg-white p-4" onClick={(e) => e.stopPropagation()}>
        {title ? <h3 className="mb-2 text-lg font-semibold">{title}</h3> : null}
        {children}
      </div>
    </div>
  );
}
