import { Fingerprint, Key } from '@phosphor-icons/react';
import { Button } from '@/src/components/shadcn-ui/button';
import { Badge } from '@/src/components/shadcn-ui/badge';

type Selected = {
  selected: 'passkey' | 'password';
  setSelected: (selected: 'passkey' | 'password') => void;
};

export function PasskeyCard({ selected, setSelected }: Selected) {
  return (
    <Button
      onClick={() => setSelected('passkey')}
      variant={selected === 'passkey' ? 'secondary' : 'outline'}
      className="min-h-48 flex-1 p-4">
      <div className="flex h-full w-full flex-col items-center justify-center gap-2">
        <Fingerprint size={36} />
        <span className="font-bold">Passkey</span>
        <span className="text-sm">Fingerprint, Face ID, etc</span>
        <Badge
          variant="secondary"
          className="border-green-7 bg-green-3">
          More Secure and Convenient
        </Badge>
      </div>
    </Button>
  );
}

export function PasswordCard({ selected, setSelected }: Selected) {
  return (
    <Button
      onClick={() => setSelected('password')}
      variant={selected === 'passkey' ? 'outline' : 'secondary'}
      className="min-h-48 flex-1 p-4">
      <div className="flex h-full w-full flex-col items-center justify-center gap-2">
        <Key size={32} />
        <span className="font-bold">Password & 2FA</span>
        <span className="text-sm">Alphanumeric and Rolling Codes</span>
        <Badge
          variant="secondary"
          className="border-yellow-7 bg-yellow-3">
          Less Secure and Inconvenient
        </Badge>
      </div>
    </Button>
  );
}
