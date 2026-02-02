import { useState } from 'react';
import { Share, Copy, Check, Link2 } from 'lucide-react';
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
  shareCode: string;
  sessionId: string;
}

export function ShareDialog({ shareCode, sessionId }: ShareDialogProps) {
  const [copied, setCopied] = useState<'code' | 'link' | null>(null);
  const shareUrl = `${window.location.origin}/join/${shareCode}`;

  const copyToClipboard = async (text: string, type: 'code' | 'link') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      toast.success(type === 'code' ? 'Kod kopierad!' : 'Länk kopierad!');
      setTimeout(() => setCopied(null), 2000);
    } catch {
      toast.error('Kunde inte kopiera');
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Sittningsschema',
          text: `Öppna sittningen med kod: ${shareCode}`,
          url: shareUrl,
        });
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          toast.error('Kunde inte dela');
        }
      }
    } else {
      copyToClipboard(shareUrl, 'link');
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
          <DialogTitle>Dela sittningen</DialogTitle>
          <DialogDescription>
            Dela koden eller länken med andra sångledare
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Share code */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Delningskod</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 rounded-lg bg-muted px-4 py-3 text-center">
                <span className="font-mono text-2xl font-bold tracking-widest">
                  {shareCode}
                </span>
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => copyToClipboard(shareCode, 'code')}
              >
                {copied === 'code' ? (
                  <Check className="h-4 w-4 text-success" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Share link */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Delningslänk</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 overflow-hidden rounded-lg bg-muted px-4 py-3">
                <p className="truncate text-sm font-mono text-muted-foreground">
                  {shareUrl}
                </p>
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => copyToClipboard(shareUrl, 'link')}
              >
                {copied === 'link' ? (
                  <Check className="h-4 w-4 text-success" />
                ) : (
                  <Link2 className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <Button onClick={handleShare} className="w-full">
            <Share className="mr-2 h-4 w-4" />
            Dela via...
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
