import { Flex, Box, Heading, Separator, Badge, Button } from '@radix-ui/themes';
import PasskeyLoginButton from './PasskeyLogin';
import PasswordLoginButton from './PasswordLogin';
import Link from 'next/link';
import RecoveryButton from './RecoveryButton';

export default function Page() {
  return (
    <Flex
      height="100%"
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
          <PasswordLoginButton />
        </Box>
        <Flex
          py="8"
          gap="4"
          align="center"
          justify="center"
          direction="column">
          <Button
            size="3"
            className="w-fit cursor-pointer font-semibold"
            variant="ghost">
            <Link href="/join">Create an Account</Link>
          </Button>
          <RecoveryButton />
        </Flex>
      </Box>
    </Flex>
  );
}
