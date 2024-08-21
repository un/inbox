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
import { ArrowsOutSimple, Plus, X } from '@phosphor-icons/react';
import { useOrgScopedRouter } from '@/src/hooks/use-params';
import { Button } from '@/src/components/shadcn-ui/button';
import CreateConvoForm from './create-convo-form';
import { useAtom } from 'jotai';

export function NewConvoSheet() {
  const [open, setOpen] = useAtom(showNewConvoPanel);
  const { scopedNavigate } = useOrgScopedRouter();

  return (
    <Drawer
      dismissible={false}
      open={open}
      direction="bottom"
      modal={false}
      shouldScaleBackground={false}
      noBodyStyles>
      <DrawerTrigger asChild>
        <div className="group fixed -bottom-5 -right-6 h-10 w-10 cursor-pointer transition-all hover:bottom-0 hover:right-0">
          <Button
            size={'icon'}
            onClick={() => setOpen(true)}>
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

        <div className="absolute right-1 top-1 flex gap-0 p-1">
          <Button
            size={'icon'}
            variant={'ghost'}
            onClick={() => {
              scopedNavigate('/convo/new', true);
              setOpen(false);
            }}>
            <ArrowsOutSimple
              className="size-4"
              size={16}
            />
          </Button>
          <Button
            size={'icon'}
            variant={'ghost'}
            onClick={() => setOpen(false)}>
            <X
              className="size-4"
              size={16}
            />
          </Button>
        </div>

        <CreateConvoForm />
      </DrawerContent>
    </Drawer>
  );
}
