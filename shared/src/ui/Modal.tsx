import { MouseEvent, PropsWithChildren } from 'react';
import { Card } from './Card';

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
    <div
      role="presentation"
      className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <Card
        padding="lg"
        className="w-full max-w-lg"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event: MouseEvent<HTMLDivElement>) => event.stopPropagation()}
      >
        {title ? <h3 className="mb-3 text-xl font-semibold tracking-[-0.02em] text-dark">{title}</h3> : null}
        {children}
      </Card>
    </div>
  );
}
