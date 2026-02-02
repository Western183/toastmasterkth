import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Check, RotateCcw, GripVertical, Video, Mic, Trash2 } from 'lucide-react';
import { TempoItem, Person, getPersonColor, PERSON_COLORS } from '@/types/session';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface InlineTempoCardProps {
  item: TempoItem;
  people: Person[];
  onToggleDone: (id: string, done: boolean) => void;
  isEditMode?: boolean;
  onUpdate: (id: string, updates: Partial<TempoItem>) => void;
  onDelete?: (id: string) => void;
  isDragTarget?: boolean;
}

export function InlineTempoCard({
  item,
  people,
  onToggleDone,
  isEditMode = false,
  onUpdate,
  onDelete,
  isDragTarget = false,
}: InlineTempoCardProps) {
  const person = people.find((p) => p.id === item.person_id);
  const personColor = person ? getPersonColor(person.color) : null;

  // Local state for editing
  const [localTitle, setLocalTitle] = useState(item.title);
  const [localPage, setLocalPage] = useState(item.page || '');
  const [localNote, setLocalNote] = useState(item.note || '');
  const [localVideoCount, setLocalVideoCount] = useState(item.video_count?.toString() || '');
  const [localLiveCount, setLocalLiveCount] = useState(item.live_count?.toString() || '');
  const [localPersonId, setLocalPersonId] = useState(item.person_id || '');

  // Debounce refs
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync local state when item changes from server
  useEffect(() => {
    setLocalTitle(item.title);
    setLocalPage(item.page || '');
    setLocalNote(item.note || '');
    setLocalVideoCount(item.video_count?.toString() || '');
    setLocalLiveCount(item.live_count?.toString() || '');
    setLocalPersonId(item.person_id || '');
  }, [item.id]); // Only reset when item ID changes, not on every prop update

  // Debounced save function
  const debouncedSave = useCallback((updates: Partial<TempoItem>) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      onUpdate(item.id, updates);
    }, 300);
  }, [item.id, onUpdate]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const handleTitleChange = (value: string) => {
    setLocalTitle(value);
    if (value.trim()) {
      debouncedSave({ title: value.trim() });
    }
  };

  const handlePageChange = (value: string) => {
    setLocalPage(value);
    debouncedSave({ page: value.trim() || null });
  };

  const handleNoteChange = (value: string) => {
    setLocalNote(value);
    debouncedSave({ note: value.trim() || null });
  };

  const handleVideoCountChange = (value: string) => {
    setLocalVideoCount(value);
    const num = value ? parseInt(value) : null;
    debouncedSave({ video_count: num });
  };

  const handleLiveCountChange = (value: string) => {
    setLocalLiveCount(value);
    const num = value ? parseInt(value) : null;
    debouncedSave({ live_count: num });
  };

  const handlePersonChange = (personId: string) => {
    setLocalPersonId(personId);
    onUpdate(item.id, { person_id: personId || null });
  };

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    over,
  } = useSortable({ id: item.id, disabled: !isEditMode });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  };

  const isOverThis = over?.id === item.id && !isDragging;

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      data-dragging={isDragging}
      className={cn(
        'relative rounded-lg border-l-4 bg-card p-4 shadow-sm transition-all',
        item.done ? 'border-l-success bg-success-muted' : personColor ? personColor.border : 'border-l-muted',
        isDragging && 'opacity-50 scale-95 border-dashed border-2 border-primary/30 bg-muted/50',
        isOverThis && 'ring-2 ring-primary ring-offset-2 ring-offset-background scale-[1.01]',
        isDragTarget && !isOverThis && 'transition-transform duration-150'
      )}
    >
      <div className="flex items-start gap-3">
        {isEditMode && (
          <button
            {...attributes}
            {...listeners}
            className="mt-1 cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing"
          >
            <GripVertical className="h-5 w-5" />
          </button>
        )}

        {/* Order number */}
        <div
          className={cn(
            'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg text-lg font-bold',
            item.done
              ? 'bg-success text-success-foreground'
              : 'bg-primary text-primary-foreground'
          )}
        >
          {item.done ? (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="animate-check-bounce"
            >
              <Check className="h-5 w-5" />
            </motion.div>
          ) : (
            item.order_index
          )}
        </div>

        {/* Content - either editable or read-only */}
        <div className="min-w-0 flex-1">
          {isEditMode ? (
            <div className="space-y-2">
              {/* Title row */}
              <div className="flex items-center gap-2">
                <Input
                  value={localTitle}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="Titel"
                  className="h-8 font-semibold"
                />
                <Input
                  value={localPage}
                  onChange={(e) => handlePageChange(e.target.value)}
                  placeholder="s."
                  className="h-8 w-16"
                />
              </div>

              {/* Note row */}
              <Input
                value={localNote}
                onChange={(e) => handleNoteChange(e.target.value)}
                placeholder="Notering/kodord..."
                className="h-8 text-sm"
              />

              {/* Counts row */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <Video className="h-4 w-4 text-muted-foreground" />
                  <Input
                    type="number"
                    min="0"
                    value={localVideoCount}
                    onChange={(e) => handleVideoCountChange(e.target.value)}
                    placeholder="0"
                    className="h-7 w-14 text-sm"
                  />
                </div>
                <div className="flex items-center gap-1">
                  <Mic className="h-4 w-4 text-muted-foreground" />
                  <Input
                    type="number"
                    min="0"
                    value={localLiveCount}
                    onChange={(e) => handleLiveCountChange(e.target.value)}
                    placeholder="0"
                    className="h-7 w-14 text-sm"
                  />
                </div>
              </div>

              {/* Person selector */}
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => handlePersonChange('')}
                  className={cn(
                    'flex h-7 items-center gap-1.5 rounded-md border px-2 text-xs transition-all',
                    !localPersonId ? 'border-primary bg-primary/10' : 'border-border hover:bg-accent'
                  )}
                >
                  <div className="h-3 w-3 rounded-full bg-muted" />
                  <span>Ingen</span>
                </button>
                {people.map((p) => {
                  const color = PERSON_COLORS.find((c) => c.id === p.color);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handlePersonChange(p.id)}
                      className={cn(
                        'flex h-7 items-center gap-1.5 rounded-md border px-2 text-xs transition-all',
                        localPersonId === p.id ? 'border-primary bg-primary/10' : 'border-border hover:bg-accent'
                      )}
                    >
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: color?.hsl }}
                      />
                      <span>{p.name}</span>
                    </button>
                  );
                })}
              </div>

              {/* Delete button */}
              <Button
                variant="destructive"
                size="sm"
                className="w-full"
                onClick={() => onDelete?.(item.id)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Ta bort tempo
              </Button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <h3 className={cn('text-lg font-semibold', item.done && 'line-through opacity-60')}>
                  {item.title}
                </h3>
                {item.page && (
                  <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
                    s. {item.page}
                  </span>
                )}
              </div>

              {item.note && (
                <p className={cn('mt-0.5 text-sm text-muted-foreground', item.done && 'opacity-60')}>
                  {item.note}
                </p>
              )}

              <div className="mt-2 flex flex-wrap items-center gap-3">
                {item.video_count != null && item.video_count > 0 && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Video className="h-3.5 w-3.5" />
                    <span>{item.video_count}</span>
                  </div>
                )}

                {item.live_count != null && item.live_count > 0 && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Mic className="h-3.5 w-3.5" />
                    <span>{item.live_count}</span>
                  </div>
                )}

                {personColor && person && (
                  <div className="flex items-center gap-1.5">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: personColor.hsl }}
                    />
                    <span className="text-xs text-muted-foreground">{person.name}</span>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Actions - only show toggle when not in edit mode */}
        {!isEditMode && (
          <div className="flex flex-shrink-0 flex-col gap-1">
            <Button
              variant={item.done ? 'outline' : 'default'}
              size="sm"
              className={cn(
                'touch-target transition-all',
                item.done && 'border-success text-success hover:bg-success/10'
              )}
              onClick={() => onToggleDone(item.id, !item.done)}
            >
              {item.done ? (
                <>
                  <RotateCcw className="mr-1 h-4 w-4" />
                  Ångra
                </>
              ) : (
                <>
                  <Check className="mr-1 h-4 w-4" />
                  Kört
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
