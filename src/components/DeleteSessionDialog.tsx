import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2 } from 'lucide-react';
import { deleteSessionWithToken } from '@/lib/secure-api';
import { getEditToken, removeFromMySessions } from '@/lib/session-utils';
import { toast } from 'sonner';

interface DeleteSessionDialogProps {
  sessionId: string;
  sessionName: string;
}

export function DeleteSessionDialog({ sessionId, sessionName }: DeleteSessionDialogProps) {
  const navigate = useNavigate();
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const isConfirmed = confirmText === 'DELETE';
  const editToken = getEditToken(sessionId);

  const handleDelete = async () => {
    if (!isConfirmed || !editToken) return;

    setLoading(true);
    try {
      const success = await deleteSessionWithToken(sessionId, editToken);
      
      if (success) {
        // Clean up local storage
        removeFromMySessions(sessionId);
        toast.success('Sittningen har tagits bort');
        navigate('/');
      } else {
        toast.error('Kunde inte ta bort sittningen - ogiltig behörighet');
      }
    } catch (error) {
      console.error('Error deleting session:', error);
      toast.error('Kunde inte ta bort sittningen');
    } finally {
      setLoading(false);
    }
  };

  // Don't show delete button if user doesn't have edit token
  if (!editToken) {
    return null;
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) setConfirmText('');
      }}
    >
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm">
          <Trash2 className="mr-2 h-4 w-4" />
          Ta bort sittning
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Ta bort "{sessionName}"?</AlertDialogTitle>
          <AlertDialogDescription className="space-y-4">
            <p>
              Detta kommer permanent ta bort sittningen och all dess data. Denna åtgärd kan inte
              ångras.
            </p>
            <div className="pt-2">
              <p className="mb-2 text-sm font-medium text-foreground">
                Skriv <span className="font-mono font-bold">DELETE</span> för att bekräfta:
              </p>
              <Input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="DELETE"
                className="font-mono"
                autoComplete="off"
              />
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Avbryt</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={!isConfirmed || loading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading ? 'Tar bort...' : 'Ta bort permanent'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
