import { Flex, Box, Heading } from '@radix-ui/themes';
import { CookiesProvider } from 'next-client-cookies/server';

export default function Page({ children }: { children: React.ReactNode }) {
  return (
    <CookiesProvider>
      <Flex
        className="h-full w-full"
        direction="column"
        align="center"
        justify="center">
        <Box className="w-full text-center">
          <Heading
            as="h1"
            className="font-display text-2xl">
            Let's Make your
          </Heading>
          <Heading
            as="h2"
            className="font-display text-5xl">
            UnInbox
          </Heading>
          {children}
        </Box>
      </Flex>
    </CookiesProvider>
  );
}
