'use client';
import { Button } from '@/src/components/shadcn-ui/button';
import { ConvoList } from './_components/convo-list';
import { usePreferencesState } from '@/src/stores/preferences-store';
import { useIsMobile } from '@/src/hooks/is-mobile';
import {
  CaretRight,
  ChatCircle,
  Eye,
  EyeSlash,
  List,
  User
} from '@phosphor-icons/react';
import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator
} from '@/src/components/shadcn-ui/breadcrumb';
import { useState } from 'react';
import Link from 'next/link';
import { useGlobalStore } from '@/src/providers/global-store-provider';
import { useEffect } from 'react';
import { useRealtime } from '@/src/providers/realtime-provider';

export default function Layout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  const orgShortCode = useGlobalStore((state) => state.currentOrg.shortCode);
  const { setSidebarExpanded } = usePreferencesState();
  const isMobile = useIsMobile();
  const [showHidden, setShowHidden] = useState(false);
  // TODO: Implement the realtime event handlers and update query cache accordingly

  const client = useRealtime();

  useEffect(() => {
    client.on('convo:new', async ({ publicId }) => {
      //TODO: Handle new convo added
      console.info('New convo added', publicId);
    });

    client.on('convo:hidden', async ({ publicId }) => {
      // TODO: Handle convo updated
      console.info('Convo Hidden', publicId);
    });

    client.on('convo:deleted', async ({ publicId }) => {
      // TODO: Handle convo deleted
      console.info('Convo Delete', publicId);
    });

    client.on(
      'convo:entry:new',
      async ({ convoPublicId, convoEntryPublicId }) => {
        // TODO: Handle new convo entry
        console.info('New convo entry', convoPublicId, convoEntryPublicId);
      }
    );

    return () => {
      client.off('convo:new');
      client.off('convo:hidden');
      client.off('convo:deleted');
      client.off('convo:entry:new');
    };
  }, [client]);

  return (
    <div className="flex h-full w-full flex-row gap-0 lg:grid-cols-3 xl:grid">
      <div className="flex h-full min-w-96 max-w-[450px] flex-col gap-2 p-4 pt-3 xl:col-span-1 xl:min-w-80">
        <div
          className={
            'flex w-full flex-row items-center justify-between gap-2 overflow-visible p-2.5 pt-0'
          }>
          {isMobile && (
            <Button
              onClick={() => setSidebarExpanded(true)}
              variant="outline"
              size="icon">
              <List />
            </Button>
          )}
          <div
            className={
              'flex h-fit w-full grow flex-row gap-2 overflow-visible'
            }>
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <div className="bg-blue-5 text-blue-9 flex h-6 w-6 items-center justify-center rounded-sm">
                    <User
                      weight="bold"
                      className="h-4 w-4"
                    />
                  </div>
                  <BreadcrumbEllipsis />
                </BreadcrumbItem>
                <BreadcrumbSeparator>
                  <CaretRight />
                </BreadcrumbSeparator>
                <BreadcrumbItem>
                  <div className="bg-base-5 text-base-9 flex h-6 w-6 items-center justify-center rounded-sm">
                    <ChatCircle
                      weight="bold"
                      className="h-4 w-4"
                    />
                  </div>
                  <BreadcrumbLink href={`/${orgShortCode}/convo`}>
                    {showHidden ? 'Hidden Conversations' : 'Conversations'}
                  </BreadcrumbLink>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <div className={'flex w-fit flex-row gap-2'}>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowHidden((prev) => !prev)}>
              {showHidden ? <EyeSlash /> : <Eye />}
            </Button>
            <Button
              variant="default"
              asChild
              size="xs">
              <Link href={`/${orgShortCode}/convo/new`}>New</Link>
            </Button>
          </div>
        </div>
        <ConvoList hidden={showHidden} />
      </div>
      <div className="border-base-5 h-full max-h-full w-full rounded-2xl border-l xl:col-span-2">
        {children}
      </div>
    </div>
  );
}
