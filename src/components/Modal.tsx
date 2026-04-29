import React from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type?: 'success' | 'error' | 'info';
  actionLabel?: string;
  onAction?: () => void;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, message, type = 'info', actionLabel = 'OK', onAction }) => {
  if (!isOpen) return null;

  const icons = {
    success: <CheckCircle className="w-16 h-16 text-primary" strokeWidth={2.25} />,
    error: <AlertCircle className="w-16 h-16 text-destructive" strokeWidth={2.25} />,
    info: <Info className="w-16 h-16 text-foreground" strokeWidth={2.25} />,
  };

  const handleAction = () => { onAction?.(); onClose(); };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-foreground/50 backdrop-blur-sm" onClick={onClose} />
      <div className={cn("relative w-full max-w-sm bg-card rounded-md shadow-2xl overflow-hidden border border-border", "animate-scale-in")}>
        <div className="h-1 bg-primary" />
        <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded-full hover:bg-muted transition-colors">
          <X className="w-5 h-5 text-muted-foreground" />
        </button>
        <div className="p-8 text-center">
          <div className="flex justify-center mb-4">{icons[type]}</div>
          <h2 className="font-display text-2xl font-bold text-foreground mb-2 uppercase tracking-wider">{title}</h2>
          <p className="text-muted-foreground mb-6">{message}</p>
          <Button onClick={handleAction} variant="valentine" size="lg" className="w-full uppercase tracking-wider">
            {actionLabel}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Modal;
