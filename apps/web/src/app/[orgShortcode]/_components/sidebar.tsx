'use client';

import { useIsSidebarAutoCollapsed } from '@/src/hooks/use-is-mobile';
import { usePreferencesState } from '@/src/stores/preferences-store';
import { CaretDoubleLeft, PushPin, X } from '@phosphor-icons/react';
import { SidebarContent } from './sidebar-content';
import { sidebarSubmenuOpenAtom } from './atoms';
import { cn } from '@/src/lib/utils';
import { useAtomValue } from 'jotai';

export default function Sidebar() {
  const {
    sidebarDocked,
    sidebarExpanded,
    setSidebarExpanded,
    setSidebarDocking
  } = usePreferencesState();

  const sidebarSubmenuOpen = useAtomValue(sidebarSubmenuOpenAtom);
  const isSidebarAutoCollapsed = useIsSidebarAutoCollapsed();

  return (
    <div
      className={cn(
        'flex h-full max-h-svh w-fit resize-x flex-row items-start gap-4 overflow-visible p-0 transition-all duration-200 ease-in-out',
        !isSidebarAutoCollapsed ? (sidebarDocked ? 'w-60' : 'w-0') : 'w-0'
      )}>
      <div
        className={cn(
          'duration-400 absolute m-0 flex h-full flex-row items-start justify-center gap-0 p-2 transition-all ease-in-out',
          !isSidebarAutoCollapsed && sidebarDocked
            ? 'left-0 w-60 pr-0'
            : 'w-[252px] pr-3',
          !sidebarDocked || isSidebarAutoCollapsed
            ? sidebarExpanded
              ? 'left-0'
              : '-left-[232px]'
            : ''
        )}
        onMouseEnter={() => {
          setSidebarExpanded(true);
        }}
        onMouseLeave={() => {
          !sidebarSubmenuOpen &&
            !isSidebarAutoCollapsed &&
            setSidebarExpanded(false);
        }}
        onFocus={() => {
          setSidebarExpanded(true);
        }}>
        <SidebarContent />

        {!isSidebarAutoCollapsed && (
          <div
            className={cn(
              'bg-base-3 focus-within:bg-base-5 border-base-5 duration-400 absolute top-[34px] z-[1] flex h-6 w-4 max-w-4 cursor-pointer items-center justify-end overflow-visible rounded-br-[7px] rounded-tr-[7px] border border-l-0 transition-all ease-in-out',
              sidebarExpanded ? 'visible opacity-100' : 'invisible opacity-0',
              sidebarDocked ? '-right-[15px]' : '-right-[3px]'
            )}>
            <div
              className={cn(
                'hover:bg-base-5 duration-400 flex h-[22px] w-[22px] min-w-[22px] cursor-pointer items-center justify-center rounded-md transition-all ease-in-out',
                sidebarExpanded ? 'visible opacity-100' : 'invisible opacity-0'
              )}
              onClick={() => setSidebarDocking(!sidebarDocked)}>
              <div>
                {sidebarDocked ? (
                  <CaretDoubleLeft className="size-4" />
                ) : (
                  <PushPin className="size-4" />
                )}
              </div>
            </div>
          </div>
        )}
        {isSidebarAutoCollapsed && (
          <div
            className={cn(
              'bg-base-3 focus-within:bg-base-5 border-base-5 absolute -right-[19px] top-[26px] flex h-10 w-8 max-w-8 cursor-pointer items-center justify-end overflow-visible rounded-br-[7px] rounded-tr-[7px] border border-l-0 transition-all duration-1000 ease-in-out',
              sidebarExpanded ? 'visible opacity-100' : 'invisible opacity-0'
            )}>
            <button
              className={cn(
                'hover:bg-base-5 flex h-[38px] w-[38px] min-w-[38px] cursor-pointer items-center justify-center rounded-md transition-all duration-1000 ease-in-out',
                sidebarExpanded ? 'visible opacity-100' : 'invisible opacity-0'
              )}
              onClick={() => setSidebarExpanded(false)}>
              <X className="size-6" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
