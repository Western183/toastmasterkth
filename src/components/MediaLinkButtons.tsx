import { Music2, PlayCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { openLinkInNewTab } from '@/lib/link-utils';

interface MediaLinkButtonsProps {
  link?: string | null;
  videoLink?: string | null;
  className?: string;
}

const baseClass =
  'inline-flex min-h-8 items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium text-primary no-underline transition-colors hover:bg-accent hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background';

function stopDrag(e: React.SyntheticEvent) {
  e.stopPropagation();
}

/** Compact link section shown on program items. Clicks never reach the drag handler. */
export function MediaLinkButtons({ link, videoLink, className }: MediaLinkButtonsProps) {
  if (!link && !videoLink) return null;

  const handleClick = (url: string) => (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    openLinkInNewTab(url);
  };

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {link && (
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          title="Öppnas i en ny flik"
          aria-label="Öppna låtlänk i en ny flik"
          onPointerDown={stopDrag}
          onMouseDown={stopDrag}
          onTouchStart={stopDrag}
          onKeyDown={stopDrag}
          onClick={handleClick(link)}
          className={baseClass}
        >
          <Music2 className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Öppna låtlänk</span>
        </a>
      )}

      {videoLink && (
        <a
          href={videoLink}
          target="_blank"
          rel="noopener noreferrer"
          title="Öppnas i en ny flik"
          aria-label="Öppna videolänk i en ny flik"
          onPointerDown={stopDrag}
          onMouseDown={stopDrag}
          onTouchStart={stopDrag}
          onKeyDown={stopDrag}
          onClick={handleClick(videoLink)}
          className={baseClass}
        >
          <PlayCircle className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Öppna videolänk</span>
        </a>
      )}
    </div>
  );
}