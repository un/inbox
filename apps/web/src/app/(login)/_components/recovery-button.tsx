'use client';
import { Button } from '@radix-ui/themes';
import { toast } from 'sonner';

export default function RecoveryButton() {
  return (
    <Button
      size="3"
      className="w-fit cursor-pointer font-semibold"
      variant="ghost"
      onClick={() => toast.warning('This feature is not yet implemented!')}>
      Recover your Account
    </Button>
  );
}
