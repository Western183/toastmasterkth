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
  sessionUrl: string;
  sessionName: string;
}

export function ShareDialog({ sessionUrl, sessionName }: ShareDialogProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(sessionUrl);
      setCopied(true);
      toast.success('Länk kopierad');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Kunde inte kopiera');
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: sessionName,
          text: sessionName,
          url: sessionUrl,
        });
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          toast.error('Kunde inte dela');
        }
      }
    } else {
      copyToClipboard();
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
            Dela länken till sittningen
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Session link */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Länk</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 overflow-hidden rounded-lg bg-muted px-4 py-3">
                <p className="truncate text-sm font-mono">
                  {sessionUrl}
                </p>
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={copyToClipboard}
                aria-label="Kopiera länk"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-success" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <Button onClick={copyToClipboard} className="w-full" variant="secondary">
            <Copy className="mr-2 h-4 w-4" />
            {copied ? 'Länk kopierad' : 'Kopiera länk'}
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
