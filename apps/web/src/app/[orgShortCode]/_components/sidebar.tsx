'use client';

import { cn } from '@/src/lib/utils';
import { usePreferencesState } from '@/src/stores/preferences-store';
import { CaretDoubleLeft, PushPin, X } from '@phosphor-icons/react';
import SidebarContent from './sidebar-content';
import { sidebarSubmenuOpenAtom } from './atoms';
import { useAtom } from 'jotai';
import { useEffect } from 'react';
import { useIsMobile } from '@/src/hooks/is-mobile';

export default function Sidebar() {
  const {
    sidebarDocked,
    sidebarExpanded,
    setSidebarExpanded,
    setSidebarDocking
  } = usePreferencesState();

  const [sidebarSubmenuOpen] = useAtom(sidebarSubmenuOpenAtom);
  const isMobile = useIsMobile();
  useEffect(() => {
    setSidebarExpanded(true);

    setTimeout(() => {
      setSidebarExpanded(false);
    }, 1000);
  }, [setSidebarExpanded]);
  return (
    <div
      className={cn(
        'flex h-full max-h-svh resize-x flex-row items-start gap-4 overflow-visible p-0 transition-all duration-500 ease-in-out',
        !isMobile ? (sidebarDocked ? 'w-60' : 'w-0') : 'w-0'
      )}>
      <div
        className={cn(
          'absolute z-[100] m-0 flex h-full flex-row items-start justify-center gap-0 p-2 transition-all duration-1000 ease-in-out',
          !isMobile && sidebarDocked ? 'left-0 w-60 pr-0' : 'w-[252px] pr-3',
          !sidebarDocked || isMobile
            ? sidebarExpanded
              ? 'left-0'
              : '-left-[232px]'
            : ''
        )}
        onMouseEnter={() => {
          setSidebarExpanded(true);
        }}
        onMouseLeave={() => {
          !sidebarSubmenuOpen && !isMobile && setSidebarExpanded(false);
        }}
        onFocus={() => {
          setSidebarExpanded(true);
        }}>
        <SidebarContent />
        {!isMobile && (
          <div
            className={cn(
              'bg-slate-3 focus-within:bg-slate-5 border-slate-5 absolute top-[34px] z-[90] flex h-6 w-4 max-w-4 cursor-pointer items-center justify-end overflow-visible rounded-br-[7px] rounded-tr-[7px] border border-l-0 transition-all duration-1000 ease-in-out ',
              sidebarExpanded ? 'visible opacity-100' : 'invisible opacity-0',
              sidebarDocked ? '-right-[15px]' : '-right-[3px]'
            )}>
            <div
              className={cn(
                'hover:bg-slate-5 flex h-[22px] w-[22px] min-w-[22px] cursor-pointer items-center justify-center rounded-md transition-all duration-1000 ease-in-out',
                sidebarExpanded ? 'visible opacity-100' : 'invisible opacity-0'
              )}
              onClick={() => setSidebarDocking(!sidebarDocked)}>
              <div>
                {sidebarDocked ? (
                  <CaretDoubleLeft className="h-4 w-4" />
                ) : (
                  <PushPin className="h-4 w-4" />
                )}
              </div>
            </div>
          </div>
        )}
        {isMobile && (
          <div
            className={cn(
              'bg-slate-3 focus-within:bg-slate-5 border-slate-5 absolute -right-[19px] top-[26px] z-[90] flex h-10 w-8 max-w-8 cursor-pointer items-center justify-end overflow-visible rounded-br-[7px] rounded-tr-[7px] border border-l-0 transition-all duration-1000 ease-in-out ',
              sidebarExpanded ? 'visible opacity-100' : 'invisible opacity-0'
            )}>
            <div
              className={cn(
                'hover:bg-slate-5 flex h-[38px] w-[38px] min-w-[38px] cursor-pointer items-center justify-center rounded-md transition-all duration-1000 ease-in-out',
                sidebarExpanded ? 'visible opacity-100' : 'invisible opacity-0'
              )}
              onClick={() => setSidebarExpanded(false)}>
              <div>
                <X className="h-6 w-6" />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
