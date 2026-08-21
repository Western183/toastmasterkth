import { useState } from 'react';
import { Lock, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { verifySessionPin } from '@/lib/secure-api';

interface PinGateProps {
  sessionId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUnlocked: (editToken: string) => void;
}

/** PIN dialog shown when the user wants to enter edit mode. */
export function PinGate({ sessionId, open, onOpenChange, onUnlocked }: PinGateProps) {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    if (!pin.trim()) {
      setErrorMsg('Ange PIN-koden');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    try {
      const token = await verifySessionPin(sessionId, pin.trim());
      if (token) {
        setPin('');
        onUnlocked(token);
        onOpenChange(false);
      } else {
        setErrorMsg('Fel PIN-kod. Försök igen.');
        setPin('');
      }
    } catch {
      setErrorMsg('Kunde inte verifiera PIN-koden. Försök igen.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setPin('');
          setErrorMsg(null);
        }
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Lock className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center">Ange PIN-kod för att redigera</DialogTitle>
          <DialogDescription className="text-center">
            Sittningen kan användas fritt – PIN-koden krävs bara för att ändra innehållet.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-pin">PIN-kod</Label>
            <Input
              id="edit-pin"
              autoFocus
              inputMode="numeric"
              autoComplete="off"
              type="password"
              value={pin}
              onChange={(e) => {
                setPin(e.target.value);
                setErrorMsg(null);
              }}
              placeholder="••••"
              className="text-center text-lg tracking-widest"
            />
            {errorMsg && (
              <p role="alert" className="text-sm text-destructive">
                {errorMsg}
              </p>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Avbryt
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Lås upp redigering
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
