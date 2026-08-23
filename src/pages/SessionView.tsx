import { useState, useMemo, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Plus,
  Pencil,
  Check,
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
import { InlineTempoCard } from '@/components/InlineTempoCard';
import { EditTempoModal } from '@/components/EditTempoModal';
import { ShareDialog } from '@/components/ShareDialog';
import { PinGate } from '@/components/PinGate';
import { SyncStatus } from '@/components/SyncStatus';
import { useSession } from '@/hooks/useSession';
import { getSessionEditToken, saveSessionEditToken } from '@/lib/session-utils';
import {
  updateTempoDonePublic,
  createTempoItemWithToken,
  updateTempoItemWithToken,
  deleteTempoItemWithToken,
  updateTempoOrderWithToken,
} from '@/lib/secure-api';
import { TempoItem, getPersonColor } from '@/types/session';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function SessionView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    session,
    people,
    tempoItems,
    loading,
    error,
    isSyncing,
    lastSyncTime,
    optimisticUpdate,
    revertUpdate,
    optimisticDelete,
    optimisticAdd,
    optimisticInsert,
    optimisticReorder,
    confirmSync,
  } = useSession(id);

  const [isEditMode, setIsEditMode] = useState(false);
  const [showOnlyUndone, setShowOnlyUndone] = useState(false);
  const [isAddingNew, setIsAddingNew] = useState(false);
  // order_index where a new tempo should be inserted (null = append at bottom)
  const [insertPosition, setInsertPosition] = useState<number | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [editToken, setEditToken] = useState<string | null>(() => {
    if (id) return getSessionEditToken(id);
    return null;
  });
  const [showPinDialog, setShowPinDialog] = useState(false);

  const listRef = useRef<HTMLDivElement>(null);
  const activeItem = activeId ? tempoItems.find((item) => item.id === activeId) : null;

  // Everyone who unlocks the sittning with the PIN can edit it
  const canEdit = !!session && !!editToken;

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
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

  const doneCount = useMemo(() => {
    return tempoItems.filter((item) => item.done).length;
  }, [tempoItems]);

  // Tempo count per person (all items, done or not) + unassigned count
  const { personCounts, unassignedCount } = useMemo(() => {
    const counts = new Map<string, number>();
    let unassigned = 0;
    for (const item of tempoItems) {
      if (item.person_id) {
        counts.set(item.person_id, (counts.get(item.person_id) ?? 0) + 1);
      } else {
        unassigned++;
      }
    }
    return { personCounts: counts, unassignedCount: unassigned };
  }, [tempoItems]);

  // Handle toggle done - optimistic update
  const handleToggleDone = useCallback(async (itemId: string, done: boolean) => {
    const original = tempoItems.find((item) => item.id === itemId);
    if (!original) return;

    // Optimistic update - instant UI response
    optimisticUpdate(itemId, { done });

    try {
      const success = await updateTempoDonePublic(itemId, done);
      if (success) {
        confirmSync([itemId]);
      } else {
        revertUpdate(itemId, original);
        toast.error('Kunde inte uppdatera status');
      }
    } catch {
      revertUpdate(itemId, original);
      toast.error('Kunde inte uppdatera status');
    }
  }, [tempoItems, optimisticUpdate, revertUpdate, confirmSync]);

  // Handle inline update - debounced save to backend
  const handleInlineUpdate = useCallback(async (itemId: string, updates: Partial<TempoItem>) => {
    if (!editToken || !id) {
      toast.error('Du har inte behörighet att redigera');
      return;
    }

    const original = tempoItems.find((item) => item.id === itemId);
    if (!original) return;

    // Optimistic update
    optimisticUpdate(itemId, updates);

    try {
      const success = await updateTempoItemWithToken(itemId, editToken, updates);
      if (success) {
        confirmSync([itemId]);
      } else {
        revertUpdate(itemId, original);
        toast.error('Kunde inte spara ändring');
      }
    } catch {
      revertUpdate(itemId, original);
      toast.error('Kunde inte spara ändring');
    }
  }, [editToken, id, tempoItems, optimisticUpdate, revertUpdate, confirmSync]);

  // Open the new-tempo modal. position = order_index to insert at (null = bottom).
  const openAddModal = useCallback((position: number | null) => {
    setInsertPosition(position);
    setIsAddingNew(true);
  }, []);

  // Handle adding new item — supports both appending at the bottom and inserting
  // at a specific position. The item is inserted into local state exactly once,
  // using the id returned by the database (no temporary placeholder card).
  const handleAddNewItem = async (data: Partial<TempoItem>) => {
    if (!editToken || !id) {
      toast.error('Du har inte behörighet att redigera');
      return;
    }

    // data.order_index carries the requested position (modal gets nextOrderIndex).
    const targetIndex = Math.max(
      1,
      Math.min(data.order_index ?? tempoItems.length + 1, tempoItems.length + 1)
    );

    const fields = {
      title: data.title!,
      page: data.page ?? null,
      note: data.note ?? null,
      video_count: data.video_count ?? null,
      live_count: data.live_count ?? null,
      person_id: data.person_id ?? null,
      link: data.link ?? null,
      video_link: data.video_link ?? null,
      order_index: targetIndex,
      done: false,
    };

    setIsAddingNew(false);
    setInsertPosition(null);

    try {
      // Inserting in the middle: shift the affected items down one position in
      // the database first (realtime broadcasts the shift to local state).
      if (targetIndex <= tempoItems.length) {
        const shifted = tempoItems
          .filter((item) => item.order_index >= targetIndex)
          .map((item) => ({ id: item.id, order_index: item.order_index + 1 }))
          // Descending order is the safest write order for +1 shifts
          .sort((a, b) => b.order_index - a.order_index);

        const shiftSuccess = await updateTempoOrderWithToken(id, editToken, shifted);
        if (!shiftSuccess) {
          toast.error('Kunde inte skapa - ogiltig token');
          return;
        }
      }

      const realId = await createTempoItemWithToken(id, editToken, fields);

      if (!realId) {
        toast.error('Kunde inte skapa - ogiltig token');
        return;
      }

      const now = new Date().toISOString();
      // Single atomic local update with the real database id: the new item is
      // placed at targetIndex and everything after it shifts down one step.
      optimisticInsert({
        ...fields,
        id: realId,
        session_id: id,
        created_at: now,
        updated_at: now,
      });
      toast.success('Tempo tillagt');
    } catch {
      toast.error('Kunde inte skapa');
    }
  };


  // Handle delete with optimistic UI and reindex
  const handleDeleteItem = useCallback(async (itemId: string) => {
    if (!editToken || !id) {
      toast.error('Du har inte behörighet att ta bort');
      return;
    }

    const originalItems = [...tempoItems];

    // Optimistic delete and reindex
    optimisticDelete(itemId);

    try {
      const success = await deleteTempoItemWithToken(itemId, editToken);
      if (!success) {
        // Revert by adding back the original items
        originalItems.forEach((item) => {
          if (!tempoItems.some((t) => t.id === item.id)) {
            optimisticAdd(item);
          }
        });
        toast.error('Kunde inte ta bort - ogiltig token');
        return;
      }

      // Reindex remaining items in database
      const remainingItems = tempoItems
        .filter((item) => item.id !== itemId)
        .map((item, index) => ({ id: item.id, order_index: index + 1 }));

      if (remainingItems.length > 0) {
        await updateTempoOrderWithToken(id, editToken, remainingItems);
      }

      confirmSync(remainingItems.map((i) => i.id));
      toast.success('Tempo borttaget');
    } catch {
      // Restore original state
      originalItems.forEach((item) => optimisticAdd(item));
      toast.error('Kunde inte ta bort');
    }
  }, [editToken, id, tempoItems, optimisticDelete, optimisticAdd, confirmSync]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
    setOverId(null);
  };

  const handleDragOver = (event: DragOverEvent) => {
    setOverId(event.over ? (event.over.id as string) : null);
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

    // Renumber 1..N
    const updatedItems = reorderedItems.map((item, index) => ({
      ...item,
      order_index: index + 1,
    }));

    // Optimistic reorder
    optimisticReorder(updatedItems);

    try {
      const updates = updatedItems.map((item) => ({
        id: item.id,
        order_index: item.order_index,
      }));
      const success = await updateTempoOrderWithToken(id, editToken, updates);
      if (success) {
        confirmSync(updates.map((u) => u.id));
      } else {
        // On failure, refetch will fix it
        toast.error('Kunde inte ändra ordning');
      }
    } catch {
      toast.error('Kunde inte ändra ordning');
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
            <div className="flex items-center gap-2">
              <p className="text-xs text-muted-foreground">
                {doneCount}/{tempoItems.length} körda
              </p>
              <SyncStatus isSyncing={isSyncing} lastSyncTime={lastSyncTime} />
            </div>
          </div>

          <ShareDialog />

          {(
            <Button
              variant={isEditMode ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                if (!canEdit) {
                  setShowPinDialog(true);
                  return;
                }
                setIsEditMode(!isEditMode);
              }}
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
          )}
        </div>

        {/* Person distribution summary */}
        {(personCounts.size > 0 || unassignedCount > 0) && (
          <div className="container overflow-x-auto border-t px-4 py-1.5">
            <div className="flex w-max items-center gap-1.5">
              {people
                .filter((p) => (personCounts.get(p.id) ?? 0) > 0)
                .map((p) => {
                  const color = getPersonColor(p.color);
                  return (
                    <span
                      key={p.id}
                      className="flex items-center gap-1 whitespace-nowrap rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                    >
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: color.hsl }}
                      />
                      {p.name} {personCounts.get(p.id)}
                    </span>
                  );
                })}
              {unassignedCount > 0 && (
                <span className="whitespace-nowrap rounded-full bg-muted/60 px-2 py-0.5 text-xs text-muted-foreground/70">
                  Ej tilldelade {unassignedCount}
                </span>
              )}
            </div>
          </div>
        )}

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
        </div>
      </header>

      {/* Tempo list */}
      <main className="container px-4 py-4" ref={listRef}>
        {tempoItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-lg text-muted-foreground">Inga tempon ännu</p>
            {canEdit && (
              <Button className="mt-4" onClick={() => openAddModal(null)}>
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
                    const activeIndex = activeId
                      ? filteredItems.findIndex((i) => i.id === activeId)
                      : -1;
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
                        {showDropBefore && (
                          <motion.div
                            initial={{ scaleX: 0, opacity: 0 }}
                            animate={{ scaleX: 1, opacity: 1 }}
                            className="absolute -top-1.5 left-0 right-0 h-1 rounded-full bg-primary z-10"
                          />
                        )}

                        <InlineTempoCard
                          item={item}
                          people={people}
                          onToggleDone={handleToggleDone}
                          isEditMode={isEditMode && canEdit}
                          onUpdate={handleInlineUpdate}
                          onDelete={handleDeleteItem}
                          isDragTarget={activeId !== null && activeId !== item.id}
                          isAnyDragging={activeId !== null}
                        />

                        {showDropAfter && (
                          <motion.div
                            initial={{ scaleX: 0, opacity: 0 }}
                            animate={{ scaleX: 1, opacity: 1 }}
                            className="absolute -bottom-1.5 left-0 right-0 h-1 rounded-full bg-primary z-10"
                          />
                        )}

                        {/* Insert tempo between this card and the next (edit mode) */}
                        {isEditMode && canEdit && !activeId && (
                          <div className="group relative z-10 -my-1.5 flex h-5 items-center justify-center">
                            <div className="absolute inset-x-6 h-px bg-border opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100" />
                            <button
                              type="button"
                              aria-label={`Lägg till tempo på plats ${item.order_index + 1}`}
                              onClick={() => openAddModal(item.order_index + 1)}
                              className="relative flex h-6 w-6 items-center justify-center rounded-full border border-dashed border-muted-foreground/40 bg-background text-muted-foreground/60 opacity-60 transition-all hover:scale-110 hover:border-primary hover:text-primary hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-primary active:scale-95"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </SortableContext>

            <DragOverlay
              dropAnimation={{
                duration: 200,
                easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
              }}
            >
              {activeItem ? (
                <div className="drag-overlay-item p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary text-lg font-bold text-primary-foreground">
                      {activeItem.order_index}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="font-semibold">{activeItem.title}</span>
                      {activeItem.page && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          s. {activeItem.page}
                        </span>
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
            <Button variant="outline" className="w-full" onClick={() => openAddModal(null)}>
              <Plus className="mr-2 h-4 w-4" />
              Lägg till tempo
            </Button>
          </motion.div>
        )}

      </main>

      {session && (
        <PinGate
          sessionId={session.id}
          open={showPinDialog}
          onOpenChange={setShowPinDialog}
          onUnlocked={(token) => {
            saveSessionEditToken(session.id, token);
            setEditToken(token);
            setIsEditMode(true);
            toast.success('Redigering upplåst');
          }}
        />
      )}

      {/* Add new modal */}
      {isAddingNew && (
        <EditTempoModal
          item={null}
          people={people}
          nextOrderIndex={insertPosition ?? tempoItems.length + 1}
          onSave={handleAddNewItem}
          onClose={() => {
            setIsAddingNew(false);
            setInsertPosition(null);
          }}
        />
      )}
    </div>
  );
}
