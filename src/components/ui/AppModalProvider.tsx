'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertCircle, HelpCircle, CheckCircle2, Info } from 'lucide-react';

interface ModalOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  defaultValue?: string;
  placeholder?: string;
  type?: 'info' | 'warning' | 'danger' | 'success';
}

interface AppModalContextType {
  showAlert: (message: string, options?: Omit<ModalOptions, 'message'>) => Promise<void>;
  showConfirm: (message: string, options?: Omit<ModalOptions, 'message'>) => Promise<boolean>;
  showPrompt: (message: string, options?: Omit<ModalOptions, 'message'>) => Promise<string | null>;
}

const AppModalContext = createContext<AppModalContextType | null>(null);

export function AppModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'alert' | 'confirm' | 'prompt'>('alert');
  const [options, setOptions] = useState<ModalOptions>({ message: '' });
  const [inputValue, setInputValue] = useState('');
  const [resolver, setResolver] = useState<{
    resolve: (value: any) => void;
  } | null>(null);

  const showAlert = useCallback(
    (message: string, opts?: Omit<ModalOptions, 'message'>): Promise<void> => {
      return new Promise((resolve) => {
        setModalMode('alert');
        setOptions({
          title: opts?.title || 'Notice',
          message,
          confirmText: opts?.confirmText || 'OK',
          type: opts?.type || 'info',
        });
        setResolver({ resolve });
        setIsOpen(true);
      });
    },
    []
  );

  const showConfirm = useCallback(
    (message: string, opts?: Omit<ModalOptions, 'message'>): Promise<boolean> => {
      return new Promise((resolve) => {
        setModalMode('confirm');
        setOptions({
          title: opts?.title || 'Confirmation Required',
          message,
          confirmText: opts?.confirmText || 'Confirm',
          cancelText: opts?.cancelText || 'Cancel',
          type: opts?.type || 'warning',
        });
        setResolver({ resolve });
        setIsOpen(true);
      });
    },
    []
  );

  const showPrompt = useCallback(
    (message: string, opts?: Omit<ModalOptions, 'message'>): Promise<string | null> => {
      return new Promise((resolve) => {
        setModalMode('prompt');
        setInputValue(opts?.defaultValue || '');
        setOptions({
          title: opts?.title || 'Input Required',
          message,
          confirmText: opts?.confirmText || 'Save',
          cancelText: opts?.cancelText || 'Cancel',
          placeholder: opts?.placeholder || '',
          type: opts?.type || 'info',
        });
        setResolver({ resolve });
        setIsOpen(true);
      });
    },
    []
  );

  const handleConfirm = () => {
    setIsOpen(false);
    if (resolver) {
      if (modalMode === 'prompt') {
        resolver.resolve(inputValue);
      } else if (modalMode === 'confirm') {
        resolver.resolve(true);
      } else {
        resolver.resolve(undefined);
      }
    }
  };

  const handleCancel = () => {
    setIsOpen(false);
    if (resolver) {
      if (modalMode === 'prompt') {
        resolver.resolve(null);
      } else if (modalMode === 'confirm') {
        resolver.resolve(false);
      } else {
        resolver.resolve(undefined);
      }
    }
  };

  const IconComponent =
    options.type === 'danger'
      ? AlertCircle
      : options.type === 'warning'
      ? HelpCircle
      : options.type === 'success'
      ? CheckCircle2
      : Info;

  const iconColor =
    options.type === 'danger'
      ? 'text-pw-danger'
      : options.type === 'warning'
      ? 'text-pw-warning'
      : options.type === 'success'
      ? 'text-pw-success'
      : 'text-pw-primary';

  return (
    <AppModalContext.Provider value={{ showAlert, showConfirm, showPrompt }}>
      {children}

      <Dialog open={isOpen} onOpenChange={(open) => !open && handleCancel()} > 
        <DialogContent className="max-w-md w-[95%] bg-pw-surface/40 bkblur border border-white/4 text-pw-text rounded-3xl shadow-2xl pt-5 overflow-hidden">
          <DialogHeader className="space-y-3 py-4 p-2 sm:p-3 sm:py-6">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl bg-white/5 border border-white/10 ${iconColor}`}>
                <IconComponent className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold font-display text-white">
                  {options.title}
                </DialogTitle>
                <DialogDescription className="text-xs text-pw-muted mt-1 leading-relaxed" dangerouslySetInnerHTML={{__html: options.message}}/>
              </div>
            </div>
          </DialogHeader>

          {modalMode === 'prompt' && (
            <div className="py-3">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={options.placeholder}
                className="bg-white/5 border-white/10 h-10 text-xs font-semibold focus:border-pw-primary rounded-xl"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleConfirm();
                  if (e.key === 'Escape') handleCancel();
                }}
              />
            </div>
          )}

          <DialogFooter className="flex flex-row justify-end gap-2 mt-2 p-3 sm:p-4 rounded-3xl flex-wrap" style={{borderBottomRightRadius:0, borderBottomLeftRadius:0}}>
            {modalMode !== 'alert' && (
              <Button
                variant="outline"
                onClick={handleCancel}
                className="h-9 px-4 border-white/10 text-xs font-semibold hover:bg-white/5"
              >
                {options.cancelText || 'Cancel'}
              </Button>
            )}
            <Button
              onClick={handleConfirm}
              className={`h-9 px-5 text-xs font-bold ${
                options.type === 'danger'
                  ? 'bg-pw-danger hover:bg-pw-danger/90 text-white'
                  : 'btn-primary'
              }`}
            >
              {options.confirmText || 'OK'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppModalContext.Provider>
  );
}

export function useAppModal() {
  const context = useContext(AppModalContext);
  if (!context) {
    throw new Error('useAppModal must be used within an AppModalProvider');
  }
  return context;
}
