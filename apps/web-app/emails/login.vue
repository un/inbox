<script setup lang="ts">
  import { defineProps, withDefaults } from 'vue';
  import {
    EBody,
    EColumn,
    EContainer,
    EHead,
    EHeading,
    EHtml,
    EImg,
    EPreview,
    ERow,
    ESection,
    EText,
    ELink,
    ETailwind,
    EHr
  } from 'vue-email';

  interface Props {
    username?: string;
    loginCode?: string;
  }

  const props = withDefaults(defineProps<Props>(), {
    username: 'userName',
    loginCode: 'XXX-XXX'
  });

  const login = 'https://uninbox.com/login';

  const support = 'https://uninbox.com/support';

  const previewText = `Hey ${props.username} you have recived Login Code !`;
</script>

<template>
  <ETailwind>
    <EHtml>
      <EHead />
      <EPreview>{{ previewText }}</EPreview>
      <EBody
        class="bg-white"
        :style="{
          fontFamily:
            '-apple-system,BlinkMacSystemFont,&quot;Segoe UI&quot;,Roboto,Oxygen-Sans,Ubuntu,Cantarell,&quot;Helvetica Neue&quot;,sans-serif'
        }">
        <EContainer
          class="border border-solid border-[#eaeaea] p-[20px] md:p-7 rounded-md my-[20px] mx-auto max-w-[565px]">
          <ESection class="border border-opacity-10 rounded-lg overflow-hidden">
            <EText class="text-4xl font-bold text-center"> UnInbox </EText>
            <EHr />
            <ERow class="px-10">
              <EColumn class="text-black">
                <EHeading class="text-2xl text-slate-250 font-bold text-center">
                  Hi {{ username }},
                </EHeading>
                <EHeading class="text-2xl font-bold text-center">
                  We noticed a recent login to your UnInbox account.
                </EHeading>
                <EText class="text-base mt-0.5">
                  If this wasn't you or if you have additional questions, please
                  see our
                  <ELink
                    :href="support"
                    class="text-blue-600 no-underline"
                    >support page</ELink
                  >.
                </EText>
                <EHeading class="text-lg font-bold text-center mt-0.5">
                  Here Is Your Login Code
                </EHeading>
              </EColumn>
            </ERow>
            <ERow class="px-10 pt-0">
              <EColumn
                class="flex justify-center"
                col-span="{4}">
                <EText
                  class="bg-gray-800 px-10 py-4 rounded cursor-pointer text-white font-bold text-xl">
                  {{ loginCode }}
                </EText>
              </EColumn>
            </ERow>
            <EText class="text-black text-[14px] leading-[24px] text-center">
              copy the <strong>code</strong> and paste it on this page:
              <ELink
                :href="login"
                class="text-blue-600 no-underline">
                {{ login }}
              </ELink>
            </EText>
          </ESection>
        </EContainer>
        <EContainer>
          <ESection class="py-4">
            <EImg
              width="620"
              src="https://vue-email-demo.vercel.app/static/yelp-footer.png" />
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
