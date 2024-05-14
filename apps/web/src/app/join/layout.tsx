'use client';

import { Flex, Box, Heading } from '@radix-ui/themes';

export default function Page({ children }: { children: React.ReactNode }) {
  return (
    <Flex
      className="h-full w-full"
      direction="column"
      align="center"
      justify="center">
      <Box className="w-full text-center">
        <Heading
          as="h1"
          className="font-display text-2xl">
          Let&apos;s Make your
        </Heading>
        <Heading
          as="h2"
          className="font-display text-5xl">
          UnInbox
        </Heading>
        {children}
      </Box>
    </Flex>
  );
}
