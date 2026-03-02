import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { PERSON_COLORS } from '@/types/session';
import { createSession } from '@/lib/secure-api';
import { toast } from 'sonner';

interface PersonInput {
  id: string;
  name: string;
  color: string;
}

export function CreateSessionForm() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [people, setPeople] = useState<PersonInput[]>([
    { id: '1', name: '', color: '1' },
  ]);
  const [loading, setLoading] = useState(false);

  const addPerson = () => {
    const nextColorIndex = people.length % PERSON_COLORS.length;
    setPeople([
      ...people,
      {
        id: crypto.randomUUID(),
        name: '',
        color: PERSON_COLORS[nextColorIndex].id,
      },
    ]);
  };

  const removePerson = (id: string) => {
    if (people.length > 1) {
      setPeople(people.filter((p) => p.id !== id));
    }
  };

  const updatePerson = (id: string, field: 'name' | 'color', value: string) => {
    setPeople(people.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Ange ett namn för sittningen');
      return;
    }

    if (pinCode.length !== 4) {
      toast.error('PIN-koden måste vara exakt 4 siffror');
      return;
    }

    const validPeople = people.filter((p) => p.name.trim());
    if (validPeople.length === 0) {
      toast.error('Lägg till minst en sångledare');
      return;
    }

    setLoading(true);
    try {
      const session = await createSession(
        name.trim(),
        validPeople.map((p) => ({ name: p.name.trim(), color: p.color })),
        pinCode
      );
      toast.success('Sittning skapad!');
      navigate(`/session/${session.id}`);
    } catch (error) {
      if (import.meta.env.DEV) console.error('Error creating session:', error);
      toast.error('Kunde inte skapa sittningen');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.form
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
      onSubmit={handleSubmit}
    >
      <div className="space-y-2">
        <Label htmlFor="name" className="text-base font-medium">
          Namn på sittningen
        </Label>
        <Input
          id="name"
          type="text"
          placeholder="t.ex. Vårgasque 2026"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-12 text-base"
          autoComplete="off"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-base font-medium">
          PIN-kod (4 siffror)
        </Label>
        <p className="text-sm text-muted-foreground">
          Denna kod behövs för att öppna sittningen
        </p>
        <div className="flex justify-center py-2">
          <InputOTP 
            maxLength={4} 
            value={pinCode} 
            onChange={setPinCode}
          >
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
              <InputOTPSlot index={3} />
            </InputOTPGroup>
          </InputOTP>
        </div>
      </div>

      <div className="space-y-3">
        <Label className="text-base font-medium">Sångledare</Label>
        
        <div className="space-y-2">
          {people.map((person, index) => (
            <motion.div
              key={person.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="flex items-center gap-2"
            >
              <div className="flex-1">
                <Input
                  type="text"
                  placeholder={`Sångledare ${index + 1}`}
                  value={person.name}
                  onChange={(e) => updatePerson(person.id, 'name', e.target.value)}
                  className="h-12 text-base"
                  autoComplete="off"
                />
              </div>
              
              <div className="flex gap-1">
                {PERSON_COLORS.slice(0, 6).map((color) => (
                  <button
                    key={color.id}
                    type="button"
                    onClick={() => updatePerson(person.id, 'color', color.id)}
                    className={`h-8 w-8 rounded-full transition-all ${
                      person.color === color.id ? 'ring-2 ring-offset-2 ring-primary' : ''
                    }`}
                    style={{ backgroundColor: color.hsl }}
                    title={color.name}
                  />
                ))}
              </div>

              {people.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground"
                  onClick={() => removePerson(person.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </motion.div>
          ))}
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addPerson}
          className="mt-2"
        >
          <Plus className="mr-1 h-4 w-4" />
          Lägg till sångledare
        </Button>
      </div>

      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={loading}
      >
        {loading ? 'Skapar...' : 'Skapa sittning'}
      </Button>
    </motion.form>
  );
}
