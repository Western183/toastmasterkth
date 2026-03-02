import { forwardRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getSessionByShareCode } from '@/lib/secure-api';
import { addToMySessions } from '@/lib/session-utils';
import { toast } from 'sonner';

export const JoinSessionForm = forwardRef<HTMLFormElement>(
  function JoinSessionForm(_props, _ref) {
    const navigate = useNavigate();
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!code.trim()) {
        toast.error('Ange en delningskod');
        return;
      }

      setLoading(true);
      try {
        const session = await getSessionByShareCode(code.trim());
        if (session) {
          addToMySessions(session.id);
          navigate(`/session/${session.id}`);
        } else {
          toast.error('Ingen sittning hittades med den koden');
        }
      } catch (error) {
        if (import.meta.env.DEV) console.error('Error finding session:', error);
        toast.error('Kunde inte hitta sittningen');
      } finally {
        setLoading(false);
      }
    };

    return (
      <motion.form
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4"
        onSubmit={handleSubmit}
      >
        <div className="space-y-2">
          <Label htmlFor="code" className="text-base font-medium">
            Delningskod
          </Label>
          <Input
            id="code"
            type="text"
            placeholder="t.ex. KTH-7F3A"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            className="h-12 text-center text-xl font-mono tracking-widest uppercase"
            autoComplete="off"
            autoCapitalize="characters"
          />
        </div>

        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={loading}
        >
          {loading ? 'Söker...' : 'Öppna sittning'}
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </motion.form>
    );
  }
);
