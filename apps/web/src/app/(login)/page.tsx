import { Flex, Box, Heading, Separator, Badge, Button } from '@radix-ui/themes';
import PasskeyLoginButton from './_components/passkey-login';
import PasswordLoginButton from './_components/password-login';
import Link from 'next/link';

export default async function Page() {
  return (
    <Flex
      height="100%"
      align="center"
      justify="center">
      <Box className="-mt-4 text-center">
        <Heading
          as="h1"
          className="mb-2 text-2xl font-medium">
          Login to your
        </Heading>
        <Heading
          as="h2"
          className="font-display mb-6 text-5xl">
          UnInbox
        </Heading>
        <Box py="6">
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
          <Flex
            py="2"
            gap="4"
            align="center"
            justify="center"
            direction="column">
            <PasswordLoginButton />
            <Button
              size="3"
              className="mt-4 w-72 cursor-pointer text-sm font-semibold"
              variant="soft">
              <Link href="/join">Not a member yet? Join instead</Link>
            </Button>
          </Flex>
        </Box>
        <Button
          size="3"
          className="w-fit cursor-pointer font-semibold"
          variant="ghost">
          <Link href="/recovery">Recover your Account</Link>
        </Button>
      </Box>
    </Flex>
  );
}
