'use client';

import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger
} from '@/src/components/shadcn-ui/drawer';
import { showNewConvoPanel } from '@/src/app/[orgShortcode]/convo/atoms';
import { Button } from '@/src/components/shadcn-ui/button';
import CreateConvoForm from './create-convo-form';
import { Plus, X } from '@phosphor-icons/react';
import { useAtom } from 'jotai';

export function NewConvoSheet() {
  const [open, setOpen] = useAtom(showNewConvoPanel);

  return (
    <Drawer
      dismissible={false}
      open={open}
      direction="bottom"
      modal={false}>
      <DrawerTrigger
        asChild
        onClick={() => setOpen(true)}>
        <div className="group fixed -bottom-5 -right-6 h-10 w-10 cursor-pointer transition-all hover:bottom-0 hover:right-0">
          <Button size={'icon'}>
            <Plus className="-ml-3 -mt-3 h-3 w-3 group-hover:ml-0 group-hover:mt-0 group-hover:h-4 group-hover:w-4" />
          </Button>
        </div>
      </DrawerTrigger>
      <DrawerContent className="left-auto flex w-full flex-col overflow-hidden md:max-w-[30rem]">
        {/* Everything inside Drawer Header is visually hidden and is used for accessibility purposes */}
        <DrawerHeader className="sr-only">
          <DrawerTitle>Create a new conversation</DrawerTitle>
          <DrawerDescription>
            Start a new conversation with your contacts and teams
          </DrawerDescription>
        </DrawerHeader>

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
