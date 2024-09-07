import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle
} from '@/components/shadcn-ui/drawer';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger
} from '@/components/shadcn-ui/dropdown-menu';
import {
  useCurrentConvoId,
  useOrgScopedRouter,
  useOrgShortcode
} from '@/hooks/use-params';
import {
  ChatCircle,
  ChatsCircle,
  Plus,
  SpinnerGap
} from '@phosphor-icons/react';
import { OrgMenuContent, SidebarContent } from './sidebar-content';
import { Button } from '@/components/shadcn-ui/button';
import { Link, useLocation } from '@remix-run/react';
import { Avatar } from '@/components/avatar';
import { useMemo, useState } from 'react';
import { platform } from '@/lib/trpc';
import { ms } from '@u22n/utils/ms';

export function BottomNav() {
  const [showSpacesDrawer, setShowSpacesDrawer] = useState(false);

  return (
    <>
      {/* Bottom Nav */}
      <div className="flex flex-col gap-0">
        <SpacesDrawer
          drawerOpen={showSpacesDrawer}
          setDrawerOpen={setShowSpacesDrawer}
        />
        <div className="bg-base-1 z-[1000] grid h-fit w-full grid-cols-3 content-end justify-items-center rounded-t-xl border border-b-0 px-4 pb-2 pt-3">
          <ConvoSpacesButton
            showSpacesDrawer={showSpacesDrawer}
            setShowSpacesDrawer={setShowSpacesDrawer}
          />
          <NewConvoButton />
          <UserContextMenu />
        </div>
      </div>
    </>
  );
}

function NewConvoButton() {
  const { scopedUrl } = useOrgScopedRouter();
  const { pathname } = useLocation();
  const isActive = pathname.endsWith('/convo/new');

  return (
    <>
      <Button
        variant="ghost"
        aria-current={isActive}
        className="hover:bg-accent-2 hover:text-base-9 text-base-9 [&[aria-current=true]]:text-base-12 group flex h-20 w-24 flex-col items-center justify-center gap-2 px-1 py-1"
        asChild>
        <Link to={scopedUrl('/convo/new', true)}>
          <div className="bg-accent-9 text-base-1 group-[&[aria-current=true]]:bg-accent-10 rounded-lg p-2">
            <Plus
              size={16}
              className="size-4"
            />
          </div>
          <span className="text-sm">New Convo</span>
        </Link>
      </Button>
    </>
  );
}

// function ConvoSpacesButton() {
//   const { scopedUrl } = useOrgScopedRouter();
//   const pathname = usePathname();
//   const isActive = pathname.endsWith('/convo');

//   return (
//     <>
//       <Button
//         variant={'ghost'}
//         aria-current={isActive}
//         className="hover:bg-accent-2 hover:text-base-9 text-base-9 [&[aria-current=true]]:text-base-12 flex h-20 w-24 flex-col items-center justify-center gap-2 px-1 py-1"
//         asChild>
//         <Link to={scopedUrl('/convo', true)}>
//           <div className="p-1">
//             <ChatCircle
//               size={24}
//               className="size-6"
//             />
//           </div>
//           <span className="text-sm">Convos</span>
//         </Link>
//       </Button>
//     </>
//   );
// }

function ConvoSpacesButton({
  showSpacesDrawer,
  setShowSpacesDrawer
}: {
  showSpacesDrawer: boolean;
  setShowSpacesDrawer: (value: boolean) => void;
}) {
  const orgShortcode = useOrgShortcode();
  const convoId = useCurrentConvoId();

  return (
    <>
      {!convoId ? (
        <Button
          variant="ghost"
          className="hover:bg-accent-2 hover:text-base-9 text-base-9 flex h-20 w-24 flex-col items-center justify-center gap-2 px-1 py-1"
          onClick={() => setShowSpacesDrawer(!showSpacesDrawer)}>
          <ChatsCircle
            size={24}
            className="size-6"
          />
          <span className="text-sm">Spaces</span>
        </Button>
      ) : (
        <Button asChild>
          <Link to={`/${orgShortcode}/all/convo`}>
            <div className="hover:bg-accent-2 hover:text-base-9 text-base-9 flex w-24 flex-col items-center justify-center gap-2 px-1 py-1">
              <div className="p-2">
                <ChatCircle
                  size={24}
                  className="size-6"
                />
              </div>
              <span className="text-base-9 text-sm">
                {convoId ? 'In Convo' : 'Not In Convo'}
              </span>
            </div>
          </Link>
        </Button>
      )}
    </>
  );
}

export function SpacesDrawer({
  drawerOpen,
  setDrawerOpen
}: {
  drawerOpen: boolean;
  setDrawerOpen: (value: boolean) => void;
}) {
  return (
    <Drawer
      open={drawerOpen}
      modal={false}
      direction={'bottom'}
      noBodyStyles
      shouldScaleBackground={false}
      onClose={() => setDrawerOpen(false)}>
      <DrawerContent className="-bottom-4 p-0">
        <DrawerHeader className="sr-only">
          <DrawerTitle>Spaces Sidebar</DrawerTitle>
          <DrawerDescription>
            Sidebar shows all your spaces you have access to
          </DrawerDescription>
        </DrawerHeader>
        <div className="mb-24 max-h-96 overflow-x-scroll">
          <SidebarContent />
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function UserContextMenu() {
  const { data: orgData, isLoading } =
    platform.org.crud.getAccountOrgs.useQuery({}, { staleTime: ms('1 hour') });
  const orgShortcode = useOrgShortcode();

  const currentOrg = useMemo(
    () =>
      orgData?.userOrgs.find((org) => org.org.shortcode === orgShortcode)
        ?.org ?? null,
    [orgData?.userOrgs, orgShortcode]
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={
          'data-[state=open]:text-base-12 text-base-9 group flex h-20 w-24 flex-row items-center justify-between opacity-90 data-[state=open]:opacity-100'
        }>
        <div className={'flex w-full flex-col items-center gap-2'}>
          {isLoading || !currentOrg ? (
            <div className="flex size-8 items-center justify-center rounded-full border">
              <SpinnerGap
                className="size-6 animate-spin"
                size={24}
              />
            </div>
          ) : (
            <Avatar
              avatarProfilePublicId={currentOrg.publicId}
              avatarTimestamp={currentOrg.avatarTimestamp}
              name={currentOrg.name}
              size="lg"
              hideTooltip
            />
          )}
          <span className="text-sm font-medium">Menu</span>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="bg-base-1 border-base-5 mb-4 flex min-w-96 flex-col gap-0 p-0">
        <OrgMenuContent />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
