import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList
} from '@/src/components/shadcn-ui/breadcrumb';
import { ArrowLeft, SquaresFour } from '@phosphor-icons/react';
import { Button } from '@/src/components/shadcn-ui/button';
import { useIsMobile } from '@/src/hooks/use-is-mobile';
import Link from 'next/link';
import React from 'react';

export function TopBar() {
  const isMobile = useIsMobile();

  return (
    <div className="border-base-5 bg-base-1 flex w-full flex-col items-center justify-between border-b p-0">
      <div className="border-base-5 flex h-14 w-full flex-row items-center justify-between border-b p-4">
        <div className="flex flex-1 flex-row items-center gap-4 overflow-hidden">
          {isMobile && (
            <Button
              variant="outline"
              size="icon-sm"
              asChild>
              <Link href={`./`}>
                <ArrowLeft className="size-4" />
              </Link>
            </Button>
          )}
          <span className="min-w-0 truncate text-lg font-medium leading-tight">
            Welcome to UnInbox
          </span>
        </div>
      </div>
      <div className="flex w-full max-w-full items-center justify-between gap-2 sm:flex-col md:flex-row">
        <div className="flex w-full max-w-full flex-col items-center justify-between gap-2 overflow-clip p-2">
          <div className="flex w-full max-w-full flex-row items-center justify-between gap-2 overflow-clip">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <div className="flex w-full max-w-full flex-row items-center gap-2 truncate p-1">
                    <div
                      className="flex h-6 min-h-6 w-6 min-w-6 items-center justify-center rounded-sm"
                      style={{
                        backgroundColor: `var(--slate-4)`,
                        color: `var(--slate-9)`
                      }}>
                      <SquaresFour
                        className="h-4 w-4"
                        weight="bold"
                      />
                    </div>
                    <span className="text-slate-11 h-full truncate">
                      Welcome Space
                    </span>
                  </div>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </div>
      </div>
    </div>
  );
}
