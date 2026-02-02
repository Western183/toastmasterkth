import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TempoItem, Person, PERSON_COLORS } from '@/types/session';

interface EditTempoModalProps {
  item?: TempoItem | null;
  people: Person[];
  onSave: (data: Partial<TempoItem>) => void;
  onClose: () => void;
  nextOrderIndex?: number;
}

export function EditTempoModal({ item, people, onSave, onClose, nextOrderIndex = 1 }: EditTempoModalProps) {
  const [title, setTitle] = useState(item?.title || '');
  const [page, setPage] = useState(item?.page || '');
  const [note, setNote] = useState(item?.note || '');
  const [videoCount, setVideoCount] = useState(item?.video_count?.toString() || '');
  const [liveCount, setLiveCount] = useState(item?.live_count?.toString() || '');
  const [personId, setPersonId] = useState(item?.person_id || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onSave({
      title: title.trim(),
      page: page.trim() || null,
      note: note.trim() || null,
      video_count: videoCount ? parseInt(videoCount) : null,
      live_count: liveCount ? parseInt(liveCount) : null,
      person_id: personId || null,
      order_index: item?.order_index ?? nextOrderIndex,
      done: item?.done ?? false,
    });
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 backdrop-blur-sm sm:items-center"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="w-full max-w-lg rounded-t-2xl bg-card p-6 shadow-lg sm:rounded-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold">
              {item ? 'Redigera tempo' : 'Nytt tempo'}
            </h2>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Titel *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="t.ex. Porthos"
                className="h-12"
                autoFocus
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label htmlFor="page">Sidnummer</Label>
                <Input
                  id="page"
                  value={page}
                  onChange={(e) => setPage(e.target.value)}
                  placeholder="42"
                  className="h-12"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="video">Video 📹</Label>
                <Input
                  id="video"
                  type="number"
                  min="0"
                  value={videoCount}
                  onChange={(e) => setVideoCount(e.target.value)}
                  placeholder="0"
                  className="h-12"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="live">Live 🎤</Label>
                <Input
                  id="live"
                  type="number"
                  min="0"
                  value={liveCount}
                  onChange={(e) => setLiveCount(e.target.value)}
                  placeholder="0"
                  className="h-12"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="note">Kodord / notering</Label>
              <Input
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="t.ex. Välkomna!"
                className="h-12"
              />
            </div>

            <div className="space-y-2">
              <Label>Ansvarig person</Label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setPersonId('')}
                  className={`flex h-10 items-center gap-2 rounded-lg border px-3 transition-all ${
                    !personId ? 'border-primary bg-primary/10' : 'border-border'
                  }`}
                >
                  <div className="h-4 w-4 rounded-full bg-muted" />
                  <span className="text-sm">Ingen</span>
                </button>
                
                {people.map((person) => {
                  const color = PERSON_COLORS.find((c) => c.id === person.color);
                  return (
                    <button
                      key={person.id}
                      type="button"
                      onClick={() => setPersonId(person.id)}
                      className={`flex h-10 items-center gap-2 rounded-lg border px-3 transition-all ${
                        personId === person.id ? 'border-primary bg-primary/10' : 'border-border'
                      }`}
                    >
                      <div
                        className="h-4 w-4 rounded-full"
                        style={{ backgroundColor: color?.hsl }}
                      />
                      <span className="text-sm">{person.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
                Avbryt
              </Button>
              <Button type="submit" className="flex-1" disabled={!title.trim()}>
                {item ? 'Spara' : 'Lägg till'}
              </Button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
