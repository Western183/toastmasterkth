import { useState } from 'react';
import { motion } from 'framer-motion';
import { Music, Users, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CreateSessionForm } from '@/components/CreateSessionForm';
import { JoinSessionForm } from '@/components/JoinSessionForm';
import { MySessionsList } from '@/components/MySessionsList';

type View = 'home' | 'create' | 'join';

const Index = () => {
  const [view, setView] = useState<View>('home');

  return (
    <div className="flex min-h-screen flex-col bg-background safe-top safe-bottom">
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 text-center"
        >
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <Music className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Sittningsschema</h1>
          <p className="mt-2 text-muted-foreground">
            Digitalt schema för sångledare
          </p>
        </motion.div>

        <div className="w-full max-w-md">
          {view === 'home' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <Button
                size="lg"
                className="w-full h-16 text-lg"
                onClick={() => setView('create')}
              >
                <Users className="mr-3 h-5 w-5" />
                Skapa ny sittning
              </Button>

              <Button
                variant="outline"
                size="lg"
                className="w-full h-16 text-lg"
                onClick={() => setView('join')}
              >
                <ArrowRight className="mr-3 h-5 w-5" />
                Öppna via kod
              </Button>

              <MySessionsList />
            </motion.div>
          )}

          {view === 'create' && (
            <>
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mb-4 text-sm text-muted-foreground hover:text-foreground"
                onClick={() => setView('home')}
              >
                ← Tillbaka
              </motion.button>
              <CreateSessionForm />
            </>
          )}

          {view === 'join' && (
            <>
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mb-4 text-sm text-muted-foreground hover:text-foreground"
                onClick={() => setView('home')}
              >
                ← Tillbaka
              </motion.button>
              <JoinSessionForm />
            </>
          )}
        </div>
      </div>

      <footer className="pb-4 text-center text-xs text-muted-foreground">
        KTH Sittningsapp
      </footer>
    </div>
  );
};

export default Index;
