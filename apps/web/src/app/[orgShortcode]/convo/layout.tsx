'use client';
import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator
} from '@/src/components/shadcn-ui/breadcrumb';
import {
  useAddSingleConvo$Cache,
  useDeleteConvo$Cache,
  useToggleConvoHidden$Cache,
  useUpdateConvoMessageList$Cache
} from './utils';
import {
  CaretRight,
  ChatCircle,
  Eye,
  EyeSlash,
  List,
  User
} from '@phosphor-icons/react';
import { useGlobalStore } from '@/src/providers/global-store-provider';
import { usePreferencesState } from '@/src/stores/preferences-store';
import { useRealtime } from '@/src/providers/realtime-provider';
import { OrgIssueAlerts } from './_components/org-issue-alerts';
import { Button } from '@/src/components/shadcn-ui/button';
import { ConvoList } from './_components/convo-list';
import { useIsMobile } from '@/src/hooks/is-mobile';
import { usePathname } from 'next/navigation';
import { showNewConvoPanel } from './atoms';
import { platform } from '@/src/lib/trpc';
import { useEffect } from 'react';
import { useState } from 'react';
import { useAtom } from 'jotai';
import Link from 'next/link';

export default function Layout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  const orgShortcode = useGlobalStore((state) => state.currentOrg.shortcode);
  const { setSidebarExpanded } = usePreferencesState();
  const isMobile = useIsMobile();
  const [showHidden, setShowHidden] = useState(false);
  const { data: issueData, refetch: refetchIssues } =
    platform.org.store.getOrgIssues.useQuery({
      orgShortcode
    });

  const addConvo = useAddSingleConvo$Cache();
  const toggleConvoHidden = useToggleConvoHidden$Cache();
  const deleteConvo = useDeleteConvo$Cache();
  const updateConvoMessageList = useUpdateConvoMessageList$Cache();
  const client = useRealtime();

  const pathname = usePathname();
  const [, setNewPanelOpen] = useAtom(showNewConvoPanel);

  useEffect(() => {
    client.on('convo:new', ({ publicId }) => addConvo(publicId));
    client.on('convo:hidden', ({ publicId, hidden }) =>
      toggleConvoHidden(publicId, hidden)
    );
    client.on('convo:deleted', ({ publicId }) => deleteConvo(publicId));
    client.on('convo:entry:new', ({ convoPublicId, convoEntryPublicId }) =>
      updateConvoMessageList(convoPublicId, convoEntryPublicId)
    );
    client.on('admin:issue:refresh', async () => void refetchIssues());

    return () => {
      client.off('convo:new');
      client.off('convo:hidden');
      client.off('convo:deleted');
      client.off('convo:entry:new');
      client.off('admin:issue:refresh');
    };
  }, [
    client,
    addConvo,
    toggleConvoHidden,
    deleteConvo,
    updateConvoMessageList,
    refetchIssues
  ]);

  const isInConvo =
    !pathname.endsWith('/convo') && !pathname.endsWith('/convo/new');

  return (
    <div className="flex h-full w-full flex-row gap-0 xl:grid xl:grid-cols-3">
      <div className="flex h-full min-w-96 flex-col gap-2 p-2 pt-3 xl:col-span-1 xl:min-w-80">
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
                  <BreadcrumbLink asChild>
                    <Link href={`/${orgShortcode}/convo`}>
                      {showHidden ? 'Hidden Conversations' : 'Conversations'}
                    </Link>
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
            {!isInConvo ? (
              <Button
                variant="default"
                asChild
                size="xs">
                <Link href={`/${orgShortcode}/convo/new`}>New</Link>
              </Button>
            ) : (
              <Button
                variant="default"
                size="xs"
                onClick={() => isInConvo && setNewPanelOpen(true)}>
                <span>New</span>
              </Button>
            )}
          </div>
        </div>
        <ConvoList hidden={showHidden} />
      </div>
      <div className="border-base-5 h-full max-h-full w-full rounded-2xl border-l xl:col-span-2">
        {issueData && issueData.issues.length > 0 && (
          <OrgIssueAlerts issues={issueData.issues} />
        )}
        {children}
      </div>
    </div>
  );
}
