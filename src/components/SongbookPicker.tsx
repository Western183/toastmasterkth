import { useMemo, useState } from 'react';
import { BookOpen, Check } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  searchSongbook,
  SONGBOOK_FILTERS,
  SongbookSong,
} from '@/data/songbook';

interface SongbookPickerProps {
  onSelect: (song: SongbookSong) => void;
  /** Highlights the matching song when the current title exists in the songbook */
  selectedTitle?: string;
  compact?: boolean;
}

export function SongbookPicker({ onSelect, selectedTitle, compact = false }: SongbookPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string | null>(null);

  const results = useMemo(() => searchSongbook(query, category), [query, category]);

  const handleSelect = (song: SongbookSong) => {
    onSelect(song);
    setOpen(false);
    setQuery('');
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label="Sök i sångboken"
          className={cn(
            'w-full justify-start gap-2 font-normal text-muted-foreground',
            compact ? 'h-8 text-sm' : 'h-12'
          )}
        >
          <BookOpen className="h-4 w-4 flex-shrink-0" />
          <span className="truncate">Sök eller välj sång…</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={4}
        className="z-[70] w-[var(--radix-popover-trigger-width)] max-w-[calc(100vw-2rem)] p-0"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Sök eller välj sång…"
            value={query}
            onValueChange={setQuery}
          />
          {/* Category filter chips */}
          <div className="flex gap-1 overflow-x-auto border-b px-2 py-1.5">
            {SONGBOOK_FILTERS.map((filter) => (
              <button
                key={filter.label}
                type="button"
                onClick={() => setCategory(filter.category)}
                className={cn(
                  'flex h-7 flex-shrink-0 items-center rounded-full border px-2.5 text-xs transition-colors',
                  category === filter.category
                    ? 'border-primary bg-primary/10 text-foreground'
                    : 'border-border text-muted-foreground hover:bg-accent'
                )}
              >
                {filter.label}
              </button>
            ))}
          </div>
          <CommandList className="max-h-[260px]">
            <CommandEmpty>Ingen sång hittades.</CommandEmpty>
            <CommandGroup>
              {results.slice(0, 80).map((song) => {
                const isSelected =
                  selectedTitle &&
                  song.title.toLowerCase() === selectedTitle.trim().toLowerCase();
                return (
                  <CommandItem
                    key={`${song.page}-${song.title}`}
                    value={`${song.title} ${song.page}`}
                    onSelect={() => handleSelect(song)}
                    className="flex min-h-[44px] cursor-pointer items-center gap-2 py-1.5"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium leading-tight">{song.title}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        Sida {song.page} · {song.category}
                      </p>
                    </div>
                    {isSelected && <Check className="h-4 w-4 flex-shrink-0 text-primary" />}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
