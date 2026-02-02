import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronRight, Calendar } from 'lucide-react';
import { Session } from '@/types/session';
import { getAllSessions } from '@/lib/api';
import { getEditToken } from '@/lib/session-utils';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';

export function MySessionsList() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSessions() {
      try {
        const data = await getAllSessions();
        setSessions(data);
      } catch (error) {
        console.error('Error loading sessions:', error);
      } finally {
        setLoading(false);
      }
    }

    loadSessions();
  }, []);

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
          return (
            <motion.button
              key={session.id}
              onClick={() => navigate(`/session/${session.id}`)}
              className="flex w-full items-center justify-between rounded-lg border border-border bg-card p-4 text-left transition-colors hover:bg-accent"
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">{session.name}</span>
                  {isCreator && (
                    <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                      Skapare
                    </span>
                  )}
                </div>
                <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
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
  );
}
