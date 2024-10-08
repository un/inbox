'use client';

import { Button } from '@/src/components/shadcn-ui/button';
import { useOrgShortcode } from '@/src/hooks/use-params';
import { useIsMobile } from '@/src/hooks/use-is-mobile';
import { ArrowLeft } from '@phosphor-icons/react';
import Link from 'next/link';

type PageTitleProps = {
  title: string;
  description?: string;
  children?: React.ReactNode;
  backButtonLink?: string;
};
export function PageTitle({
  title,
  description,
  children,
  backButtonLink
}: PageTitleProps) {
  const orgShortcode = useOrgShortcode();
  const isMobile = useIsMobile();

  return (
    <div className="border-base-5 flex w-full flex-row items-center justify-between gap-2 border-b pb-2">
      <div className="flex flex-row items-center gap-4">
        {isMobile && (
          <Button
            variant="outline"
            size="icon-sm"
            asChild>
            <Link href={backButtonLink ?? `/${orgShortcode}/settings`}>
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
        )}
        <div className="flex flex-col gap-1">
          <span className="font-display text-lg">{title}</span>
          {description && (
            <span className="text-base-11 text-sm">{description}</span>
          )}
        </div>
      </div>

      {children}
    </div>
  );
}
