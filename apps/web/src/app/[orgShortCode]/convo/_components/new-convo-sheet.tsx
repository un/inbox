'use client';

import { Button } from '@/src/components/shadcn-ui/button';
import { Plus, X } from '@phosphor-icons/react';
import { useState } from 'react';

import CreateConvoForm from './create-convo-form';
import {
  Drawer,
  DrawerContent,
  DrawerPortal,
  DrawerTrigger
} from '@/src/components/shadcn-ui/drawer';

export function NewConvoSheet() {
  const [open, setOpen] = useState(false);

  return (
    <Drawer
      dismissible={false}
      open={open}
      direction="bottom"
      modal={false}>
      <DrawerTrigger
        asChild
        onClick={() => setOpen(true)}>
        <Button className="fixed bottom-4 right-4">
          <Plus className="mr-1 h-4 w-4" /> Convo
        </Button>
      </DrawerTrigger>
      <DrawerContent className="bg-popover fixed bottom-0 right-0 flex max-h-[36rem] w-full flex-col overflow-hidden rounded-lg border md:right-4 md:w-[30rem]">
        <Button
          variant={'ghost'}
          onClick={() => setOpen(false)}
          className="fixed right-1 top-1">
          <X className="h-4 w-4" />
        </Button>

        <CreateConvoForm />
      </DrawerContent>
    </Drawer>
  );
}
