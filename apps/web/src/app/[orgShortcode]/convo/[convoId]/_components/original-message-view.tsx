import { Dialog, DialogContent } from '@/src/components/shadcn-ui/dialog';
import { useGlobalStore } from '@/src/providers/global-store-provider';
import { ScrollArea } from '@/src/components/shadcn-ui/scroll-area';
import { Separator } from '@/src/components/shadcn-ui/separator';
import { SpinnerGap } from '@phosphor-icons/react';
import { type TypeId } from '@u22n/utils/typeid';
import { memo, useRef, useState } from 'react';
import { platform } from '@/src/lib/trpc';

export function OriginalMessageView({
  setOpen,
  messagePublicId
}: {
  setOpen: (open: boolean) => void;
  messagePublicId: TypeId<'convoEntries'>;
}) {
  const orgShortcode = useGlobalStore((state) => state.currentOrg.shortcode);

  const { data, isLoading, error } =
    platform.convos.entries.getConvoSingleEntryRawEmail.useQuery({
      orgShortcode: orgShortcode,
      convoEntryPublicId: messagePublicId
    });

  return (
    // This Dialog is mounted when needed to save on rendering time, so its always open
    <Dialog
      open
      onOpenChange={setOpen}>
      <DialogContent className="h-[95svh] max-w-[95vw]">
        <div className="flex h-full w-full flex-col">
          {isLoading && (
            <div className="flex h-full w-full flex-col items-center justify-center gap-2">
              <SpinnerGap
                className="animate-spin"
                size={24}
              />
              <span className="text-lg font-bold">Loading...</span>
            </div>
          )}
          {error && (
            <div className="flex h-full w-full flex-col items-center justify-center gap-2">
              <span className="text-lg font-bold">Error</span>
              <span className="text-red-500">{error.message}</span>
            </div>
          )}
          {data && (
            <ScrollArea className="h-[92svh] w-[92vw]">
              <div className="flex flex-col gap-2">
                <div>
                  <span className="font-bold">Wipe Date: </span>
                  <span>{data.rawEmailData.wipeDate.toLocaleString()}</span>
                </div>
                <span className="font-bold">Email Headers</span>
                <div className="flex flex-col gap-1">
                  {Object.entries(
                    data.rawEmailData.headers as Record<string, unknown>
                  ).map(([key, value]) => (
                    <div
                      key={key}
                      className="flex w-full gap-2 border-b font-mono">
                      <div className="w-fit min-w-[10ch] border-r px-1 text-right font-bold">
                        {key}
                      </div>
                      <div className="w-fit break-all">
                        {JSON.stringify(value)}
                      </div>
                    </div>
                  ))}
                </div>
                <Separator className="my-4 w-full" />
                <span className="font-bold">Original Email</span>
                <OriginalMessageIframe html={data.rawEmailData.html} />
              </div>
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

const OriginalMessageIframe = memo(
  function OriginalMessageIframe({ html }: { html: string }) {
    const frameRef = useRef<HTMLIFrameElement | null>(null);
    const [height, setHeight] = useState('300px');

    const onLoad = () => {
      if (!frameRef.current) return;
      setHeight(
        `${(frameRef.current.contentWindow?.document.body.scrollHeight ?? 0) + 30}px`
      );
      frameRef.current.contentWindow?.document
        .querySelectorAll('a')
        .forEach((a) => {
          a.setAttribute('target', '_blank');
        });
    };

    return (
      <iframe
        title="Raw Email"
        ref={frameRef}
        onLoad={onLoad}
        className="w-full"
        sandbox="allow-same-origin allow-popups"
        srcDoc={html}
        height={height}
      />
    );
  },
  (prev, next) => prev.html === next.html
);
