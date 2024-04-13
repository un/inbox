import { Button, Flex, Box, Heading, Separator, Badge } from '@radix-ui/themes';
import PasskeyLoginButton from './PasskeyLogin';

export default function Page() {
  return (
    <Flex
      className="h-full"
      align="center"
      justify="center">
      <Box className="text-center">
        <Heading
          as="h1"
          className="font-display text-2xl">
          Login to your
        </Heading>
        <Heading
          as="h2"
          className="font-display text-5xl">
          UnInbox
        </Heading>
        <Box className="py-6">
          <PasskeyLoginButton />
          <Flex
            align="center"
            gap="2"
            className="py-4">
            <Separator
              size="4"
              color="grass"
            />
            <Badge className="uppercase">or</Badge>
            <Separator
              size="4"
              color="grass"
            />
          </Flex>
          <Button
            size="3"
            className="w-full cursor-pointer font-semibold"
            variant="surface">
            Login With Password
          </Button>
        </Box>
      </Box>
    </Flex>
  );
}
