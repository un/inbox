import { Flex, Button, Text, Badge } from '@radix-ui/themes';
import { Fingerprint, Key } from '@phosphor-icons/react';

type Selected = {
  selected: 'passkey' | 'password';
  setSelected: (selected: 'passkey' | 'password') => void;
};

export function PasskeyCard({ selected, setSelected }: Selected) {
  return (
    <Button
      onClick={() => setSelected('passkey')}
      variant="soft"
      color={selected === 'passkey' ? undefined : 'gray'}
      className="min-h-48 flex-1 p-4">
      <Flex
        direction="column"
        align="center"
        justify="center"
        gap="1"
        className="h-full w-full">
        <Fingerprint size={36} />
        <Text
          size="3"
          weight="bold">
          Passkey
        </Text>
        <Text size="2">Fingerprint, Face ID, etc</Text>
        <Badge
          color="grass"
          variant="surface"
          my="1">
          More Secure and Convenient
        </Badge>
      </Flex>
    </Button>
  );
}

export function PasswordCard({ selected, setSelected }: Selected) {
  return (
    <Button
      onClick={() => setSelected('password')}
      variant="soft"
      color={selected === 'password' ? undefined : 'gray'}
      className="min-h-48 flex-1 p-4">
      <Flex
        direction="column"
        align="center"
        justify="center"
        gap="1"
        className="h-full w-full">
        <Key size={32} />

        <Text
          size="3"
          weight="bold">
          Password & 2FA
        </Text>
        <Text size="2">Alphanumeric and Rolling Codes</Text>
        <Badge
          color="yellow"
          variant="surface"
          my="1">
          Less Secure and Inconvenient
        </Badge>
      </Flex>
    </Button>
  );
}
