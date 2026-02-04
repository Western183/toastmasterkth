import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronRight, Calendar, Lock, LockOpen } from 'lucide-react';
import { getAllSessionsPublic, verifySessionPin, PublicSession } from '@/lib/secure-api';
import { getEditToken, isSessionUnlocked, unlockSession, saveEditToken, saveSessionPin } from '@/lib/session-utils';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { PinDialog } from '@/components/PinDialog';

export function MySessionsList() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<PublicSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [pinDialogSession, setPinDialogSession] = useState<PublicSession | null>(null);
  const [pinError, setPinError] = useState(false);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    async function loadSessions() {
      try {
        const data = await getAllSessionsPublic();
        setSessions(data);
      } catch (error) {
        console.error('Error loading sessions:', error);
      } finally {
        setLoading(false);
      }
    }

    loadSessions();
  }, []);

  const handleSessionClick = (session: PublicSession) => {
    // If session has no PIN or is already unlocked, go directly
    if (!session.has_pin || isSessionUnlocked(session.id)) {
      navigate(`/session/${session.id}`);
      return;
    }

    // Otherwise, show PIN dialog
    setPinDialogSession(session);
    setPinError(false);
  };

  const handlePinSubmit = async (pin: string) => {
    if (!pinDialogSession || verifying) return;

    setVerifying(true);
    try {
      // Verify PIN server-side
      const result = await verifySessionPin(pinDialogSession.id, pin);

      if (result.valid) {
        // Correct PIN - save edit token, PIN, and unlock
        if (result.editToken) {
          saveEditToken(pinDialogSession.id, result.editToken, pin);
        } else {
          unlockSession(pinDialogSession.id);
          saveSessionPin(pinDialogSession.id, pin);
        }
        navigate(`/session/${pinDialogSession.id}`);
        setPinDialogSession(null);
      } else {
        // Wrong PIN
        setPinError(true);
      }
    } catch (error) {
      console.error('Error verifying PIN:', error);
      setPinError(true);
    } finally {
      setVerifying(false);
    }
  };

  if (loading) {
    return (
      <div className="mt-8 text-center text-sm text-muted-foreground">
        Laddar sittningar...
      </div>
    );
  }

  if (sessions.length === 0) {
    return null;
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mt-8 w-full"
      >
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">Alla sittningar</h2>
        <div className="space-y-2">
          {sessions.map((session) => {
            const isCreator = !!getEditToken(session.id);
            const isUnlocked = !session.has_pin || isSessionUnlocked(session.id);

            return (
              <motion.button
                key={session.id}
                onClick={() => handleSessionClick(session)}
                className="flex w-full items-center justify-between rounded-lg border border-border bg-card p-4 text-left transition-colors hover:bg-accent"
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {isUnlocked ? (
                      <LockOpen className="h-4 w-4 text-success shrink-0" />
                    ) : (
                      <Lock className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                    <span className="font-medium truncate">{session.name}</span>
                    {isCreator && (
                      <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                        Skapare
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground ml-6">
                    <Calendar className="h-3 w-3" />
                    <span>{format(new Date(session.created_at), 'd MMM yyyy', { locale: sv })}</span>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </motion.button>
            );
          })}
        </div>
      </motion.div>

      <PinDialog
        isOpen={!!pinDialogSession}
        sessionName={pinDialogSession?.name || ''}
        onSubmit={handlePinSubmit}
        onCancel={() => setPinDialogSession(null)}
        error={pinError}
      />
    </>
  );
}
