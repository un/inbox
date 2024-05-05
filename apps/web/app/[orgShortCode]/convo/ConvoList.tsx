'use client';

// import { api } from '@/lib/trpc';
import { Flex, ScrollArea } from '@radix-ui/themes';

export default function ConvoList() {
  // const {} = api.convos.getOrgMemberConvos.useInfiniteQuery({});

  return (
    <Flex className="bg-slate-2 dark:bg-slatedark-2 h-full w-[350px] p-2">
      <ScrollArea>
        {/* {convos.map((convo) => (
          <Flex
            key={convo.publicId}
            className="p-2">
            {JSON.stringify(convo)}
          </Flex>
        ))} */}
      </ScrollArea>
    </Flex>
  );
}
