import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTrigger
} from '@/src/components/shadcn-ui/dialog';
import {
  useCurrentConvoId,
  useOrgScopedRouter,
  useOrgShortcode,
  useSpaceShortcode
} from '@/src/hooks/use-params';
import { Button } from '@/src/components/shadcn-ui/button';
import { useDeleteConvo$Cache } from '../utils';
import { convoListSelection } from '../atoms';
import { platform } from '@/src/lib/trpc';
import { useState } from 'react';
import { useAtom } from 'jotai';

export function DeleteMultipleConvosModal({
  children
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const deleteConvoCache = useDeleteConvo$Cache();
  const orgShortcode = useOrgShortcode();
  const currentConvo = useCurrentConvoId();
  const { scopedNavigate } = useOrgScopedRouter();
  const [selections, setSelections] = useAtom(convoListSelection);
  const spaceShortcode = useSpaceShortcode(false);

  const { mutate: deleteConvo, isPending: deletingConvos } =
    platform.convos.deleteConvo.useMutation({
      onSuccess: async () => {
        setOpen(false);
        await deleteConvoCache(selections, spaceShortcode);
        setSelections([]);
      }
    });

  return (
    <Dialog
      open={open}
      onOpenChange={() => {
        if (deletingConvos) return;
        setOpen(!open);
      }}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Are you sure you want to delete these convos?
          </DialogTitle>
          <DialogDescription>
            You are about to delete {selections.length} convos. This action
            cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex gap-2">
          <DialogClose asChild>
            <Button
              variant="secondary"
              className="flex-1">
              Cancel
            </Button>
          </DialogClose>
          <Button
            variant="destructive"
            className="flex-1"
            loading={deletingConvos}
            onClick={() => {
              if (currentConvo && selections.includes(currentConvo)) {
                scopedNavigate('/convo', true);
              }
              deleteConvo({
                orgShortcode,
                convoPublicId: selections
              });
            }}>
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
