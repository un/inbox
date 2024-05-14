'use client';
import { Flex, Text } from '@radix-ui/themes';
import Stepper from '../_components/stepper';
import CreateOrgButton from './_components/create-org';
import JoinOrgButton from './_components/join-org';
import { useCookies } from 'next-client-cookies';

export default function JoinOrg() {
  const cookies = useCookies();
  const inviteCode = cookies.get('un-invite-code');
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
          If you&apos;re planning on using UnInbox alone, you&apos;ll still need
          an organization to manage all the settings.
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
