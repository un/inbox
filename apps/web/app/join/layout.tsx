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
          className="text-2xl font-light">
          Let&apos;s Make your
        </Heading>
        <Heading
          as="h2"
          className="text-5xl font-bold">
          UnInbox
        </Heading>
        {children}
      </Box>
    </Flex>
  );
}
