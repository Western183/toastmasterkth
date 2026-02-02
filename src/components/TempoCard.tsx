import { forwardRef } from 'react';
import { motion } from 'framer-motion';
import { Check, RotateCcw, GripVertical, Video, Mic, Trash2, Pencil } from 'lucide-react';
import { TempoItem, Person, getPersonColor } from '@/types/session';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface TempoCardProps {
  item: TempoItem;
  people: Person[];
  onToggleDone: (id: string, done: boolean) => void;
  isEditMode?: boolean;
  onEdit?: (item: TempoItem) => void;
  onDelete?: (id: string) => void;
  isDragTarget?: boolean;
}

export const TempoCard = forwardRef<HTMLDivElement, TempoCardProps>(
  function TempoCard(
    { item, people, onToggleDone, isEditMode = false, onEdit, onDelete, isDragTarget = false },
    _ref
  ) {
    const person = people.find((p) => p.id === item.person_id);
    const personColor = person ? getPersonColor(person.color) : null;

    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: item.id, disabled: !isEditMode });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      zIndex: isDragging ? 50 : undefined,
    };

    return (
      <motion.div
        ref={setNodeRef}
        style={style}
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className={cn(
          'relative rounded-lg border-l-4 bg-card p-4 shadow-sm transition-all',
          item.done ? 'border-l-success bg-success-muted' : personColor ? personColor.border : 'border-l-muted',
          isDragging && 'shadow-lg opacity-90',
          isDragTarget && 'ring-2 ring-primary ring-offset-2 ring-offset-background'
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

          {/* Content */}
          <div className="min-w-0 flex-1">
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
          </div>

          {/* Actions */}
          <div className="flex flex-shrink-0 flex-col gap-1">
            {isEditMode ? (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onEdit?.(item)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => onDelete?.(item.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            ) : (
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
            )}
          </div>
        </div>
      </motion.div>
    );
  }
);
