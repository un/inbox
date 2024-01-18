<script setup lang="ts">
  import { defineProps, withDefaults } from 'vue';

  interface Props {
    invitedByUsername?: string;
    teamName?: string;
    username?: string;
    invitedByEmail?: string;
    inviteLink?: string;
    inviteFromIp?: string;
    inviteFromLocation?: string;
  }

  const props = withDefaults(defineProps<Props>(), {
    teamName: 'My project',
    username: 'John Doe',
    invitedByEmail: 'anpch@example.com',
    inviteLink: 'https://vercel.com/teams/invite/foo',
    inviteFromIp: '172.0.0.1',
    inviteFromLocation: 'San Francisco, CA'
  });

  const previewText = `Join ${props.invitedByUsername} on Vercel`;
</script>

<template>
  <ETailwind>
    <EHtml>
      <EHead />
      <EPreview>{{ previewText }}</EPreview>
      <EBody class="mx-auto my-auto bg-white font-sans">
        <EContainer
          class="mx-auto my-[40px] max-w-[465px] border border-[#eaeaea] rounded border-solid p-[20px] md:p-7">
          <ESection class="mt-[32px]">
            <EImg
              src="/static/vercel-logo.png"
              width="40"
              height="37"
              alt="Vercel"
              class="mx-auto my-0" />
          </ESection>
          <Hello />
          <EHeading
            class="mx-0 my-[30px] p-0 text-center text-[24px] text-black font-normal">
            Join <strong>{{ teamName }}</strong> on <strong>Vercel</strong>
          </EHeading>
          <EText class="text-[14px] text-black leading-[24px]">
            Hello {{ username }},
          </EText>
          <EText class="text-[14px] text-black leading-[24px]">
            <strong>bukinoshita</strong> (
            <ELink
              :href="`mailto:${invitedByEmail}`"
              class="text-blue-600 no-underline">
              {{ invitedByEmail }}
            </ELink>
            ) has invited you to the <strong>{{ teamName }}</strong> team on
            <strong>Vercel</strong>.
          </EText>
          <ESection>
            <ERow>
              <EColumn align="right">
                <EImg
                  class="rounded-full"
                  src="/static/vercel-user.png"
                  width="64"
                  height="64" />
              </EColumn>
              <EColumn align="center">
                <EImg
                  src="/static/vercel-arrow.png"
                  width="12"
                  height="9"
                  alt="invited you to" />
              </EColumn>
              <EColumn align="left">
                <EImg
                  class="rounded-full"
                  src="/static/vercel-team.png"
                  width="64"
                  height="64" />
              </EColumn>
            </ERow>
          </ESection>
          <ESection class="mb-[32px] mt-[32px] text-center">
            <EButton
              px="20"
              py="12"
              class="rounded bg-[#000000] text-center text-[12px] text-white font-semibold no-underline"
              :href="inviteLink">
              Join the team
            </EButton>
          </ESection>
          <EText class="text-[14px] text-black leading-[24px]">
            or copy and paste this URL into your browser:
            <ELink
              :href="inviteLink"
              class="text-blue-600 no-underline">
              {{ inviteLink }}
            </ELink>
          </EText>
          <EHr
            class="mx-0 my-[26px] w-full border border-[#eaeaea] border-solid" />
          <EText class="text-[12px] text-[#666666] leading-[24px]">
            This invitation was intended for
            <span class="text-black">{{ username }} </span>.This invite was sent
            from <span class="text-black">{{ inviteFromIp }}</span> located in
            <span class="text-black">{{ inviteFromLocation }}</span
            >. If you were not expecting this invitation, you can ignore this
            email. If you are concerned about your account's safety, please
            reply to this email to get in touch with us.
          </EText>
        </EContainer>
      </EBody>
    </EHtml>
  </ETailwind>
</template>
