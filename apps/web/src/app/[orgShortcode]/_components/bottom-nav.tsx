'use client';

import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger
} from '@/src/components/shadcn-ui/drawer';
import { ChatCircle, ChatsCircle, GearSix, Plus } from '@phosphor-icons/react';
import { useGlobalStore } from '@/src/providers/global-store-provider';
import { convoSidebarTunnel, settingsSidebarTunnel } from '../tunnels';
import { Button } from '@/src/components/shadcn-ui/button';
import Link from 'next/link';

type BottomNavProps = {
  convoHidden?: boolean;
  type?: 'convos' | 'settings';
};

export function BottomNav({
  convoHidden = false,
  type = 'convos'
}: BottomNavProps) {
  const orgShortcode = useGlobalStore((state) => state.currentOrg.shortcode);

  return (
    <>
      {/* Spacer  */}
      <div className="h-20 w-full" />
      {/* Bottom Nav */}
      <div className="bg-base-1 absolute bottom-0 z-[1] flex h-20 w-full items-center justify-around rounded-t-xl border border-b-0 px-4">
        <Button
          variant="ghost"
          className="hover:bg-accent-2 hover:text-base-11 text-base-11 flex h-20 w-24 flex-col items-center justify-center gap-2 px-1 py-1"
          asChild>
          <Link href={`/${orgShortcode}/convo`}>
            <ChatCircle
              size={24}
              className="size-6"
            />
            <span className="text-sm">
              {convoHidden ? 'Hidden Convos' : 'Convos'}
            </span>
          </Link>
        </Button>
        <Button
          variant="ghost"
          className="hover:bg-accent-2 hover:text-base-11 text-base-11 flex h-20 w-24 flex-col items-center justify-center gap-1"
          asChild>
          <Link href={`/${orgShortcode}/convo/new`}>
            <div className="bg-accent-11 text-base-1 rounded-xl p-2">
              <Plus
                size={16}
                className="size-4"
              />
            </div>
            <span className="text-sm">New Convo</span>
          </Link>
        </Button>
        {type === 'convos' ? <SpacesSidebar /> : <SettingsSidebar />}
      </div>
    </>
  );
}

export function SpacesSidebar() {
  return (
    <Drawer
      shouldScaleBackground={false}
      noBodyStyles
      direction="right">
      <DrawerTrigger asChild>
        <Button
          variant="ghost"
          className="hover:bg-accent-2 hover:text-base-11 text-base-11 flex h-20 w-24 flex-col items-center justify-center gap-2 px-1 py-1">
          <ChatsCircle
            size={24}
            className="size-6"
          />
          <span className="text-sm">Spaces</span>
        </Button>
      </DrawerTrigger>
      <DrawerContent className="w-[80%] p-0">
        <DrawerHeader className="sr-only">
          <DrawerTitle>Spaces Sidebar</DrawerTitle>
          <DrawerDescription>
            Sidebar shows all your spaces you have access to
          </DrawerDescription>
        </DrawerHeader>
        <convoSidebarTunnel.Out />
      </DrawerContent>
    </Drawer>
  );
}

export function SettingsSidebar() {
  return (
    <Drawer
      shouldScaleBackground={false}
      noBodyStyles
      direction="right">
      <DrawerTrigger asChild>
        <Button
          variant="ghost"
          className="hover:bg-accent-2 hover:text-base-11 text-base-11 flex h-20 w-24 flex-col items-center justify-center gap-2 px-1 py-1">
          <GearSix
            size={24}
            className="size-6"
          />
          <span className="text-sm">Settings</span>
        </Button>
      </DrawerTrigger>
      <DrawerContent className="w-[80%] p-0">
        <DrawerHeader className="sr-only">
          <DrawerTitle>Settings Sidebar</DrawerTitle>
          <DrawerDescription>
            All settings for your organization and account
          </DrawerDescription>
        </DrawerHeader>
        <settingsSidebarTunnel.Out />
      </DrawerContent>
    </Drawer>
  );
}
