'use client';

import { Button } from '@/src/components/shadcn-ui/button';
import { Badge } from '@/src/components/shadcn-ui/badge';
import { CaretRight, Dot } from '@phosphor-icons/react';
import { usePathname } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { cn } from '@/src/lib/utils';

export function SidebarNavButton({
  link,
  label,
  icon,
  isActive,
  isExpanded,
  disabled,
  badge,
  children,
  ...props
}: {
  link: string;
  label: string;
  icon: ReactNode;
  isActive: boolean;
  isExpanded?: boolean | undefined;
  disabled?: boolean;
  badge?: ReactNode;
  children?: ReactNode;
}) {
  const [expanded, setExpanded] = useState(isExpanded);
  const [active, setActive] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  if (isActive) {
    setActive(true);
    setExpanded(true);
  }
  useEffect(() => {
    if (
      (!children && pathname.startsWith(link)) ??
      (children && pathname === link)
    ) {
      setActive(true);
      setExpanded(true);
    } else {
      setActive(false);
    }
  }, [children, link, pathname]);
  return (
    <div className={'flex w-full max-w-full flex-col gap-0 p-0'}>
      <div
        className={cn(
          'text-base-12 flex w-full max-w-full flex-row items-center justify-start gap-0 overflow-hidden truncate rounded-md pl-1 text-left',
          active ? 'bg-base-5' : '',
          disabled ? 'opacity-80' : 'hover:bg-base-4'
        )}
        {...props}>
        {children ? (
          <div
            className="text-base-12 h-5 w-5 cursor-pointer rounded-sm p-0.5"
            onClick={() => {
              setExpanded(!expanded);
            }}>
            <CaretRight
              weight="duotone"
              className={cn(
                'h-4 w-4 transition-transform',
                expanded ? 'rotate-90' : 'rotate-0'
              )}
            />
          </div>
        ) : (
          <div className="h-5 w-5 rounded-sm p-0.5">
            <Dot
              weight="duotone"
              className={'h-4 w-4'}
            />
          </div>
        )}
        <Button
          variant="child"
          onClick={() => {
            !disabled && router.push(link);
          }}
          disabled={disabled}
          asChild>
          <div
            className={cn(
              'text-base-12 flex h-full w-full flex-row gap-0 overflow-hidden px-2 py-2',
              disabled ? 'cursor-not-allowed' : 'cursor-pointer'
            )}>
            <div className="mr-2 h-5 w-5 rounded-sm p-0 *:h-5 *:w-5">
              {icon}
            </div>
            <div className="text-base-12 flex w-full max-w-full flex-row justify-between gap-2 overflow-hidden">
              <span className={cn('text-base-12 truncate text-sm')}>
                {label}
              </span>
              {badge && <Badge variant={'secondary'}>{badge}</Badge>}
            </div>
          </div>
        </Button>
      </div>
      {children && (
        <div
          className={cn(
            'w-full p-0 pl-7 transition-transform',
            expanded ? 'max-h-64 delay-0' : 'max-h-0 delay-1000 duration-1000'
          )}>
          <div
            className={cn(
              'w-full p-0 transition-opacity duration-100',
              expanded ? 'opacity-100' : 'opacity-0'
            )}>
            {children}
          </div>
        </div>
      )}
    </div>
  );
}
