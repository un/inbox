'use client';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle
} from '@/src/components/shadcn-ui/drawer';
import { ConvoView, ConvoNotFound } from './_components/convo-views';
import { Button } from '@/src/components/shadcn-ui/button';
import { useIsMobile } from '@/src/hooks/use-is-mobile';
import { validateTypeId } from '@u22n/utils/typeid';
import { CaretLeft } from '@phosphor-icons/react';
import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import tunnel from 'tunnel-rat';
import Link from 'next/link';

const convoViewTunnel = tunnel();

export default function ConvoPage({
  params
}: {
  params: {
    convoId: string;
  };
}) {
  const isMobile = useIsMobile();
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(true);
  const DismissButton = useCallback(
    () => (
      <Button
        variant={'outline'}
        size={'icon-sm'}
        onClick={() => isMobile && setDialogOpen(false)}>
        {isMobile ? (
          <CaretLeft size={16} />
        ) : (
          <Link href="./">
            <CaretLeft size={16} />
          </Link>
        )}
      </Button>
    ),
    [isMobile]
  );

  return (
    <>
      <convoViewTunnel.In>
        {!validateTypeId('convos', params.convoId) ? (
          <ConvoNotFound DismissButton={DismissButton} />
        ) : (
          <ConvoView
            convoId={params.convoId}
            DismissButton={DismissButton}
          />
        )}
      </convoViewTunnel.In>
      {!isMobile ? (
        <convoViewTunnel.Out />
      ) : (
        <Drawer
          noBodyStyles
          shouldScaleBackground={false}
          direction="right"
          open={dialogOpen}
          onClose={() => router.push('./')}>
          <DrawerContent className="w-full max-w-full p-0 focus-visible:outline-none">
            <DrawerHeader className="sr-only">
              <DrawerTitle>Convo</DrawerTitle>
              <DrawerDescription>Viewing convo</DrawerDescription>
            </DrawerHeader>
            <convoViewTunnel.Out />
          </DrawerContent>
        </Drawer>
      )}
    </>
  );
}
