import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getSessionByCode } from '@/lib/api';
import { Loader2 } from 'lucide-react';

export default function JoinSession() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    async function findSession() {
      if (!code) {
        navigate('/');
        return;
      }

      try {
        const session = await getSessionByCode(code);
        if (session) {
          navigate(`/session/${session.id}`, { replace: true });
        } else {
          navigate('/', { replace: true });
        }
      } catch {
        navigate('/', { replace: true });
      }
    }

    findSession();
  }, [code, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
