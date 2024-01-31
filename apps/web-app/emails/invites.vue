<script setup lang="ts">
  interface Props {
    inviterName?: string;
    inviterAvatarId?: string;
    orgName?: string;
    orgAvatarId?: string;
    inviteCode?: string;
    expiryDate?: Date;
  }

  const props = withDefaults(defineProps<Props>(), {
    inviterName: 'inviterName',
    inviterAvatarId: 'https://avatars.githubusercontent.com/u/135225712',
    orgName: 'orgName',
    orgAvatarId: 'https://avatars.githubusercontent.com/u/135225712',
    inviteCode: 'XXX-NNN-XN',
    expiryDate: () => new Date('June 23, 2022 4:06:00 pm UTC')
  });

  const inviteLink = 'https://uninbox.com/invite';

  const previewText = `Hey ${props.inviterName} Invited You On ${props.orgName}`;
</script>

<template>
  <ETailwind>
    <EHtml>
      <EHead />
      <EPreview>{{ previewText }}</EPreview>
      <EBody
        class="bg-white my-auto mx-auto font-sans"
        :style="{
          fontFamily:
            '-apple-system,BlinkMacSystemFont,&quot;Segoe UI&quot;,Roboto,Oxygen-Sans,Ubuntu,Cantarell,&quot;Helvetica Neue&quot;,sans-serif'
        }">
        <EContainer
          class="border border-solid border-[#eaeaea] p-[20px] md:p-7 rounded-md my-[20px] mx-auto max-w-[565px]">
          <ESection class="mt-[20px]">
            <EText class="text-4xl font-bold text-center"
              >UnInbox Replacing Email</EText
            >
          </ESection>
          <EHr />
          <EHeading
            class="text-black text-[20px] font-normal text-center p-0 my-[30px] mx-0">
            Hey
            <strong>{{ inviterName }}</strong> from (
            <ELink
              :href="inviteLink"
              class="text-blue-600 no-underline">
              {{ orgName }}
            </ELink>
            ) has invited you to the
            <strong>{{ orgName }}</strong> Team.
          </EHeading>
          <ESection>
            <ERow>
              <EColumn align="right">
                <EImg
                  src="/static/uninbox-user.png"
                  class="rounded-full"
                  width="64"
                  height="64" />
              </EColumn>
              <EColumn align="center">
                <EImg
                  src="/static/uninbox-arrow.png"
                  width="12"
                  height="10"
                  alt="invited you to" />
              </EColumn>
              <EColumn align="left">
                <EImg
                  src="/static/uninbox-team.png"
                  class="rounded-full"
                  width="64"
                  height="64" />
              </EColumn>
            </ERow>
          </ESection>
          <ESection class="text-center mt-[32px] mb-[32px]">
            <ERow class="px-10 pt-0"
              ><EColumn
                class="flex justify-center"
                col-span="{4}"
                ><EText
                  class="bg-gray-800 rounded px-10 py-4 cursor-pointer text-white text-xl font-bold no-underline text-center">
                  {{ inviteCode }}
                </EText></EColumn
              ></ERow
            >
          </ESection>
          <EText class="text-black text-md leading-5 text-center">
            copy and paste this into UnInbox Join Page:
            <ELink
              :href="inviteLink"
              class="text-blue-600 no-underline">
              {{ inviteLink }}
            </ELink>
            <br />
            <strong>Note :</strong> This code will expire within time & data [
            {{ expiryDate }} ]
          </EText>
          <EHr
            class="border border-solid border-[#eaeaea] my-[26px] mx-0 w-full" />
          <EText class="text-[#666666] text-sm leading-5">
            This invitation was sent by
            <span class="text-black">{{ orgName }} </span>
            located in <span class="text-black">Earth</span>. If you were not
            expecting this invitation, you can ignore this email. If you are
            concerned about your account's safety, please reply to this email to
            get in touch with us.
          </EText>
        </EContainer>
        <EContainer>
          <ESection class="py-4">
            <EImg
              width="620"
              src="/static/footer.png" />
          </ESection>
          <EText class="text-center text-sm text-gray-700 py-2">
            © 2024 | UnInbox Inc..., Earth |
            <ELink href="https://unibox.com">UnInbox.com</ELink>
          </EText>
        </EContainer>
      </EBody>
    </EHtml>
  </ETailwind>
</template>
