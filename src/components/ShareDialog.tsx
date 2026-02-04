import { useState } from 'react';
import { Share, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

interface ShareDialogProps {
  sessionPin: string | null;
}

const APP_URL = 'https://toastmasterkth.lovable.app/';

export function ShareDialog({ sessionPin }: ShareDialogProps) {
  const [copied, setCopied] = useState<'link' | 'pin' | 'both' | null>(null);

  const copyToClipboard = async (text: string, type: 'link' | 'pin' | 'both') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      const messages = {
        link: 'Länk kopierad!',
        pin: 'PIN kopierad!',
        both: 'Länk och PIN kopierade!',
      };
      toast.success(messages[type]);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      toast.error('Kunde inte kopiera');
    }
  };

  const handleCopyBoth = async () => {
    if (!sessionPin) {
      copyToClipboard(APP_URL, 'link');
      return;
    }
    const text = `Öppna appen: ${APP_URL}\nPIN-kod: ${sessionPin}`;
    copyToClipboard(text, 'both');
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        const text = sessionPin 
          ? `Öppna appen och ange PIN-kod: ${sessionPin}`
          : 'Öppna appen';
        await navigator.share({
          title: 'Sittningsschema',
          text,
          url: APP_URL,
        });
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          toast.error('Kunde inte dela');
        }
      }
    } else {
      handleCopyBoth();
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Share className="mr-2 h-4 w-4" />
          Dela
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle asChild>
            <h2>Dela sittningen</h2>
          </DialogTitle>
          <DialogDescription>
            Dela länken och PIN-koden med andra sångledare
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* App link */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Öppna appen:</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 overflow-hidden rounded-lg bg-muted px-4 py-3">
                <p className="truncate text-sm font-mono">
                  toastmasterkth.lovable.app
                </p>
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => copyToClipboard(APP_URL, 'link')}
              >
                {copied === 'link' ? (
                  <Check className="h-4 w-4 text-success" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* PIN code */}
          {sessionPin && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Ange PIN-kod:</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 rounded-lg bg-muted px-4 py-3 text-center">
                  <span className="font-mono text-2xl font-bold tracking-[0.5em]">
                    {sessionPin}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(sessionPin, 'pin')}
                >
                  {copied === 'pin' ? (
                    <Check className="h-4 w-4 text-success" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          )}

          {!sessionPin && (
            <div className="rounded-lg border border-dashed border-muted-foreground/30 p-4 text-center">
              <p className="text-sm text-muted-foreground">
                PIN-koden kunde inte hämtas. Sessionen kan delas via länken ovan.
              </p>
            </div>
          )}

          <Button onClick={handleCopyBoth} className="w-full" variant="secondary">
            <Copy className="mr-2 h-4 w-4" />
            {copied === 'both' ? 'Kopierat!' : 'Kopiera länk + PIN'}
          </Button>

          <Button onClick={handleShare} className="w-full">
            <Share className="mr-2 h-4 w-4" />
            Dela via...
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
