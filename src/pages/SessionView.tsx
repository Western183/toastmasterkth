import { useState, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Plus,
  Pencil,
  Check,
  ChevronDown,
  Filter,
  Loader2,
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';

import { Button } from '@/components/ui/button';
import { TempoCard } from '@/components/TempoCard';
import { EditTempoModal } from '@/components/EditTempoModal';
import { ShareDialog } from '@/components/ShareDialog';
import { DeleteSessionDialog } from '@/components/DeleteSessionDialog';
import { useSession } from '@/hooks/useSession';
import { getEditToken } from '@/lib/session-utils';
import {
  updateTempoDone,
  createTempoItemWithToken,
  updateTempoItemWithToken,
  deleteTempoItemWithToken,
  updateTempoOrderWithToken,
} from '@/lib/secure-api';
import { TempoItem } from '@/types/session';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function SessionView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { session, people, tempoItems, loading, error } = useSession(id);

  const [isEditMode, setIsEditMode] = useState(false);
  const [showOnlyUndone, setShowOnlyUndone] = useState(false);
  const [editingItem, setEditingItem] = useState<TempoItem | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const listRef = useRef<HTMLDivElement>(null);

  const activeItem = activeId ? tempoItems.find((item) => item.id === activeId) : null;

  // Get edit token from localStorage - this is just for UI display
  // The actual authorization happens server-side
  const editToken = session ? getEditToken(session.id) : null;
  const canEdit = !!editToken;

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const filteredItems = useMemo(() => {
    if (showOnlyUndone) {
      return tempoItems.filter((item) => !item.done);
    }
    return tempoItems;
  }, [tempoItems, showOnlyUndone]);

  const nextUndoneItem = useMemo(() => {
    return tempoItems.find((item) => !item.done);
  }, [tempoItems]);

  const doneCount = useMemo(() => {
    return tempoItems.filter((item) => item.done).length;
  }, [tempoItems]);

  const handleToggleDone = async (itemId: string, done: boolean) => {
    try {
      await updateTempoDone(itemId, done);
    } catch {
      toast.error('Kunde inte uppdatera status');
    }
  };

  const handleSaveItem = async (data: Partial<TempoItem>) => {
    if (!editToken || !id) {
      toast.error('Du har inte behörighet att redigera');
      return;
    }

    try {
      if (editingItem) {
        const success = await updateTempoItemWithToken(editingItem.id, editToken, data);
        if (!success) {
          toast.error('Kunde inte uppdatera - ogiltig token');
          return;
        }
        toast.success('Tempo uppdaterat');
      } else {
        const newId = await createTempoItemWithToken(id, editToken, {
          title: data.title!,
          page: data.page ?? null,
          note: data.note ?? null,
          video_count: data.video_count ?? null,
          live_count: data.live_count ?? null,
          person_id: data.person_id ?? null,
          order_index: data.order_index!,
          done: false,
        });
        if (!newId) {
          toast.error('Kunde inte skapa - ogiltig token');
          return;
        }
        toast.success('Tempo tillagt');
      }
      setEditingItem(null);
      setIsAddingNew(false);
    } catch {
      toast.error('Kunde inte spara');
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!editToken || !id) {
      toast.error('Du har inte behörighet att ta bort');
      return;
    }

    try {
      const success = await deleteTempoItemWithToken(itemId, editToken);
      if (!success) {
        toast.error('Kunde inte ta bort - ogiltig token');
        return;
      }

      // Reindex remaining items after deletion
      const remainingItems = tempoItems
        .filter((item) => item.id !== itemId)
        .sort((a, b) => a.order_index - b.order_index);

      if (remainingItems.length > 0) {
        const reindexUpdates = remainingItems.map((item, index) => ({
          id: item.id,
          order_index: index + 1,
        }));
        await updateTempoOrderWithToken(id, editToken, reindexUpdates);
      }

      toast.success('Tempo borttaget');
    } catch {
      toast.error('Kunde inte ta bort');
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
    setOverId(null);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
    setOverId(over ? (over.id as string) : null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setOverId(null);

    if (!over || active.id === over.id) return;
    if (!editToken || !id) return;

    const oldIndex = tempoItems.findIndex((item) => item.id === active.id);
    const newIndex = tempoItems.findIndex((item) => item.id === over.id);

    // Create reordered array
    const reorderedItems = [...tempoItems];
    const [removed] = reorderedItems.splice(oldIndex, 1);
    reorderedItems.splice(newIndex, 0, removed);

    // Update order indices
    const updates = reorderedItems.map((item, index) => ({
      id: item.id,
      order_index: index + 1,
    }));

    try {
      await updateTempoOrderWithToken(id, editToken, updates);
    } catch {
      toast.error('Kunde inte ändra ordning');
    }
  };

  const scrollToNextUndone = () => {
    if (nextUndoneItem) {
      const element = document.getElementById(`tempo-${nextUndoneItem.id}`);
      element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4">
        <p className="text-lg text-muted-foreground">Sittningen hittades inte</p>
        <Button onClick={() => navigate('/')}>Till startsidan</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background safe-top safe-bottom">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center gap-2 px-4">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={() => navigate('/')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>

          <div className="flex-1 min-w-0">
            <h1 className="truncate text-lg font-semibold">{session.name}</h1>
            <p className="text-xs text-muted-foreground">
              {doneCount}/{tempoItems.length} körda
            </p>
          </div>

          <ShareDialog shareCode={session.share_code} sessionId={session.id} />

          {canEdit && (
            <div className="flex items-center gap-2">
              <Button
                variant={isEditMode ? 'default' : 'outline'}
                size="sm"
                onClick={() => setIsEditMode(!isEditMode)}
              >
                {isEditMode ? (
                  <>
                    <Check className="mr-1 h-4 w-4" />
                    Klar
                  </>
                ) : (
                  <>
                    <Pencil className="mr-1 h-4 w-4" />
                    Redigera
                  </>
                )}
              </Button>
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="container flex items-center justify-between border-t px-4 py-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={() => setShowOnlyUndone(!showOnlyUndone)}
          >
            <Filter className="mr-1 h-4 w-4" />
            {showOnlyUndone ? 'Visa alla' : 'Endast ej körda'}
          </Button>

          {nextUndoneItem && !showOnlyUndone && (
            <Button variant="ghost" size="sm" onClick={scrollToNextUndone}>
              <ChevronDown className="mr-1 h-4 w-4" />
              Nästa ({nextUndoneItem.order_index})
            </Button>
          )}
        </div>
      </header>

      {/* Tempo list */}
      <main className="container px-4 py-4" ref={listRef}>
        {tempoItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-lg text-muted-foreground">Inga tempon ännu</p>
            {canEdit && (
              <Button className="mt-4" onClick={() => setIsAddingNew(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Lägg till första tempot
              </Button>
            )}
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={filteredItems.map((item) => item.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-3">
                <AnimatePresence mode="popLayout">
                  {filteredItems.map((item, index) => {
                    const isHoveredOver = overId === item.id && activeId !== item.id;
                    const activeIndex = activeId ? filteredItems.findIndex(i => i.id === activeId) : -1;
                    const currentIndex = index;
                    const showDropBefore = isHoveredOver && activeIndex > currentIndex;
                    const showDropAfter = isHoveredOver && activeIndex < currentIndex;
                    
                    return (
                      <div
                        key={item.id}
                        id={`tempo-${item.id}`}
                        className={cn(
                          'relative',
                          activeId && activeId !== item.id && 'transition-all duration-200'
                        )}
                      >
                        {/* Drop indicator line before item */}
                        {showDropBefore && (
                          <motion.div
                            initial={{ scaleX: 0, opacity: 0 }}
                            animate={{ scaleX: 1, opacity: 1 }}
                            className="absolute -top-1.5 left-0 right-0 h-1 rounded-full bg-primary z-10"
                          />
                        )}
                        
                        <TempoCard
                          item={item}
                          people={people}
                          onToggleDone={handleToggleDone}
                          isEditMode={isEditMode && canEdit}
                          onEdit={(item) => setEditingItem(item)}
                          onDelete={handleDeleteItem}
                          isDragTarget={activeId !== null && activeId !== item.id}
                        />
                        
                        {/* Drop indicator line after item */}
                        {showDropAfter && (
                          <motion.div
                            initial={{ scaleX: 0, opacity: 0 }}
                            animate={{ scaleX: 1, opacity: 1 }}
                            className="absolute -bottom-1.5 left-0 right-0 h-1 rounded-full bg-primary z-10"
                          />
                        )}
                      </div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </SortableContext>

            <DragOverlay dropAnimation={{
              duration: 200,
              easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
            }}>
              {activeItem ? (
                <div className="drag-overlay-item p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary text-lg font-bold text-primary-foreground">
                      {activeItem.order_index}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="font-semibold">{activeItem.title}</span>
                      {activeItem.page && (
                        <span className="ml-2 text-xs text-muted-foreground">s. {activeItem.page}</span>
                      )}
                    </div>
                  </div>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}

        {/* Add button in edit mode */}
        {isEditMode && canEdit && tempoItems.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4">
            <Button variant="outline" className="w-full" onClick={() => setIsAddingNew(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Lägg till tempo
            </Button>
          </motion.div>
        )}

        {/* Delete section - only visible to creator */}
        {canEdit && (
          <div className="mt-8 border-t pt-6">
            <p className="mb-3 text-sm text-muted-foreground">Farozon</p>
            <DeleteSessionDialog sessionId={session.id} sessionName={session.name} />
          </div>
        )}
      </main>

      {/* Edit modal */}
      {(editingItem || isAddingNew) && (
        <EditTempoModal
          item={editingItem}
          people={people}
          nextOrderIndex={tempoItems.length + 1}
          onSave={handleSaveItem}
          onClose={() => {
            setEditingItem(null);
            setIsAddingNew(false);
          }}
        />
      )}
    </div>
  );
}
