import { Flex, Text } from '@radix-ui/themes';
import Stepper from '../Stepper';
import { cookies } from 'next/headers';
import CreateOrgButton from './CreateOrg';
import JoinOrgButton from './JoinOrg';

export default async function JoinOrg() {
  const inviteCode = cookies().get('un-invite-code')?.value;
  const hasInviteCode = !!inviteCode;

  return (
    <Flex
      direction="column"
      gap="3"
      className="mx-auto w-full max-w-[560px] px-4">
      <Text
        mt="3"
        size="4"
        weight="bold">
        Setup Your Organization
      </Text>
      <Stepper
        step={3}
        total={4}
      />
      <Flex
        direction="column"
        gap="2">
        <Text
          size="2"
          className="text-balance"
          weight="medium">
          With an organization you can share conversations, notes and email
          identities between members and groups.
        </Text>
        <Text
          size="2"
          className="text-balance"
          weight="medium">
          If you're planning on using UnInbox alone, you'll still need an
          organization to manage all the settings.
        </Text>
        <Text
          size="2"
          className="text-balance"
          weight="medium">
          You can be a member of multiple organizations.
        </Text>
      </Flex>
      <Flex
        align="center"
        justify="center"
        className="w-full py-4"
        wrap="wrap"
        gap="2">
        <CreateOrgButton hasInviteCode={hasInviteCode} />
        <JoinOrgButton
          hasInviteCode={hasInviteCode}
          inviteCode={inviteCode}
        />
      </Flex>
      {hasInviteCode && (
        <Text
          size="2"
          color="grass">
          We have detected an invite code! Click on Join to use the code
        </Text>
      )}
    </Flex>
  );
}
