'use client';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger
} from '@/src/components/shadcn-ui/dropdown-menu';
import { useGlobalStore } from '@/src/providers/global-store-provider';
import { Button } from '@/src/components/shadcn-ui/button';
import { ChatCircle, Plus } from '@phosphor-icons/react';
import { OrgMenuContent } from './sidebar-content';
import { Avatar } from '@/src/components/avatar';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

export function BottomNav() {
  // const [showSpacesDrawer, setShowSpacesDrawer] = useState(false);

  return (
    <>
      {/* Bottom Nav */}
      <div className="flex flex-col gap-0">
        {/* <SpacesDrawer
          drawerOpen={showSpacesDrawer}
          setDrawerOpen={setShowSpacesDrawer}
        /> */}
        <div className="bg-base-1 z-[1000] grid h-fit w-full grid-cols-3 content-end justify-items-center rounded-t-xl border border-b-0 px-4 pb-2 pt-3">
          <ConvoSpacesButton />
          <NewConvoButton />
          <UserContextMenu />
        </div>
      </div>
    </>
  );
}

function NewConvoButton() {
  const orgShortcode = useGlobalStore((state) => state.currentOrg.shortcode);
  const pathname = usePathname();
  const isActive = pathname.endsWith('/convo/new');

  return (
    <>
      <Button
        variant="ghost"
        aria-current={isActive}
        className="hover:bg-accent-2 hover:text-base-9 text-base-9 [&[aria-current=true]]:text-base-12 group flex h-20 w-24 flex-col items-center justify-center gap-2 px-1 py-1"
        asChild>
        <Link href={`/${orgShortcode}/convo/new`}>
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
function ConvoSpacesButton() {
  const orgShortcode = useGlobalStore((state) => state.currentOrg.shortcode);
  const pathname = usePathname();
  const isActive = pathname.endsWith('/convo');

  return (
    <>
      <Button
        variant={'ghost'}
        aria-current={isActive}
        className="hover:bg-accent-2 hover:text-base-9 text-base-9 [&[aria-current=true]]:text-base-12 flex h-20 w-24 flex-col items-center justify-center gap-2 px-1 py-1"
        asChild>
        <Link href={`/${orgShortcode}/convo`}>
          <div className="p-1">
            <ChatCircle
              size={24}
              className="size-6"
            />
          </div>
          <span className="text-sm">Convos</span>
        </Link>
      </Button>
    </>
  );
}

//! Add back in when spaces are implemented
// function ConvoSpacesButton(
//   {
//     showSpacesDrawer,
//     setShowSpacesDrawer
//   }: {
//     showSpacesDrawer: boolean;
//     setShowSpacesDrawer: (value: boolean) => void;
//   }
// ) {
//   const orgShortcode = useGlobalStore((state) => state.currentOrg.shortcode);
//   const params = useParams();
//   const isInConvo = !!params.convoId;

//   return (
//     <>
//       Add back in when spaces are implemented
//       {!isInConvo ? (
//         <Button
//           variant="ghost"
//           className="hover:bg-accent-2 hover:text-base-9 text-base-9 flex h-20 w-24 flex-col items-center justify-center gap-2 px-1 py-1"
//           onClick={() => setShowSpacesDrawer(!showSpacesDrawer)}>
//           <ChatsCircle
//             size={24}
//             className="size-6"
//           />
//           <span className="text-sm">Spaces</span>
//         </Button>
//       ) : (
//         <Button asChild>
//           <Link href={`/${orgShortcode}/convo`}>
//             <div className="hover:bg-accent-2 hover:text-base-9 text-base-9 flex w-24 flex-col items-center justify-center gap-2 px-1 py-1">
//               <div className="p-2">
//                 <ChatCircle
//                   size={24}
//                   className="size-6"
//                 />
//               </div>
//               <span className="text-base-9 text-sm">
//                 {isInConvo ? 'In Convo' : 'Not In Convo'}
//               </span>
//             </div>
//           </Link>
//         </Button>
//       )}
//     </>
//   );
// }

//! Add back in when spaces are implemented
// export function SpacesDrawer({
//   drawerOpen,
//   setDrawerOpen
// }: {
//   drawerOpen: boolean;
//   setDrawerOpen: (value: boolean) => void;
// }) {
//   return (
//     <Drawer
//       open={drawerOpen}
//       modal={false}
//       direction={'bottom'}
//       onClose={() => setDrawerOpen(false)}>
//       <DrawerContent className="-bottom-4 p-0">
//         <DrawerHeader className="sr-only">
//           <DrawerTitle>Spaces Sidebar</DrawerTitle>
//           <DrawerDescription>
//             Sidebar shows all your spaces you have access to
//           </DrawerDescription>
//         </DrawerHeader>
//         <div className="mb-24">
//           <SidebarContent />
//         </div>
//       </DrawerContent>
//     </Drawer>
//   );
// }

function UserContextMenu() {
  const currentOrg = useGlobalStore((state) => state.currentOrg);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={
          'data-[state=open]:text-base-12 text-base-9 group flex h-20 w-24 flex-row items-center justify-between opacity-90 data-[state=open]:opacity-100'
        }>
        <div className={'flex w-full flex-col items-center gap-2'}>
          <Avatar
            avatarProfilePublicId={currentOrg.publicId}
            avatarTimestamp={currentOrg.avatarTimestamp}
            name={currentOrg.name}
            size="lg"
            hideTooltip
          />
          <span className="text-sm font-medium">Menu</span>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="bg-base-1 border-base-5 mb-4 flex min-w-96 flex-col gap-0 p-0">
        <OrgMenuContent />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
