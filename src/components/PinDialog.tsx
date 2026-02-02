import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';

interface PinDialogProps {
  isOpen: boolean;
  sessionName: string;
  onSubmit: (pin: string) => void;
  onCancel: () => void;
  error?: boolean;
}

export function PinDialog({ isOpen, sessionName, onSubmit, onCancel, error }: PinDialogProps) {
  const [pin, setPin] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length === 4) {
      onSubmit(pin);
    }
  };

  const handleComplete = (value: string) => {
    setPin(value);
    if (value.length === 4) {
      onSubmit(value);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
        onClick={onCancel}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="w-full max-w-sm rounded-2xl bg-card p-6 shadow-lg"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-lg font-bold">Ange PIN-kod</h2>
            </div>
            <Button variant="ghost" size="icon" onClick={onCancel}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          <p className="mb-6 text-sm text-muted-foreground">
            Ange 4-siffrig kod för att öppna <span className="font-medium text-foreground">{sessionName}</span>
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex justify-center">
              <InputOTP 
                maxLength={4} 
                value={pin} 
                onChange={setPin}
                onComplete={handleComplete}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} className={error ? 'border-destructive' : ''} />
                  <InputOTPSlot index={1} className={error ? 'border-destructive' : ''} />
                  <InputOTPSlot index={2} className={error ? 'border-destructive' : ''} />
                  <InputOTPSlot index={3} className={error ? 'border-destructive' : ''} />
                </InputOTPGroup>
              </InputOTP>
            </div>

            {error && (
              <motion.p
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center text-sm text-destructive"
              >
                Fel PIN-kod. Försök igen.
              </motion.p>
            )}

            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={onCancel}>
                Avbryt
              </Button>
              <Button type="submit" className="flex-1" disabled={pin.length !== 4}>
                Öppna
              </Button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
