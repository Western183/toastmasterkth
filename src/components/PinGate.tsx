import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Lock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { verifySessionPin } from '@/lib/secure-api';

interface PinGateProps {
  sessionId: string;
  sessionName?: string;
  onUnlocked: (editToken: string) => void;
  onBack: () => void;
}

export function PinGate({ sessionId, sessionName, onUnlocked, onBack }: PinGateProps) {
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
        onUnlocked(token);
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
    <div className="flex min-h-screen flex-col items-center justify-center px-4 safe-top safe-bottom">
      <motion.form
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-5 rounded-xl border border-border bg-card p-6"
      >
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Lock className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-lg font-semibold">{sessionName || 'Låst sittning'}</h1>
          <p className="text-sm text-muted-foreground">
            Ange PIN-koden för att öppna sittningen.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="pin" className="text-base font-medium">
            PIN-kod
          </Label>
          <Input
            id="pin"
            inputMode="numeric"
            autoComplete="off"
            type="password"
            placeholder="••••"
            value={pin}
            onChange={(e) => {
              setPin(e.target.value.replace(/\D/g, '').slice(0, 8));
              setErrorMsg(null);
            }}
            className="h-14 text-center text-2xl tracking-[0.5em]"
            autoFocus
          />
          {errorMsg && (
            <p className="text-sm font-medium text-destructive" role="alert">
              {errorMsg}
            </p>
          )}
        </div>

        <Button type="submit" size="lg" className="w-full" disabled={loading}>
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Öppna sittning'}
        </Button>

        <Button type="button" variant="ghost" className="w-full" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Till startsidan
        </Button>
      </motion.form>
    </div>
  );
}
