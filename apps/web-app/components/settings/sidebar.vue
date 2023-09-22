<script setup lang="ts">
  const { $trpc } = useNuxtApp();

  const navStore = useNavStore();
  const { settingsSelectedOrg, userHasAdminOrgs } = storeToRefs(navStore);
  const route = useRoute();
  const router = useRouter();

  watch(
    settingsSelectedOrg,
    (newVal) => {
      const currentOrgRoute = route.params.orgId as string;
      if (currentOrgRoute) {
        const newPath = route.path.replace(currentOrgRoute, newVal);
        router.push(newPath);
      }
    }
    // ,
    // { immediate: true }
  );

  const {
    data: userOrgs,
    pending,
    error,
    refresh
  } = await $trpc.org.settings.getUserOrgs.useLazyQuery(
    {
      onlyAdmin: true
    },
    { server: false }
  );

  watch(
    userOrgs,
    (newVal) => {
      console.log('new userOrgs Val', newVal);
      if (newVal && newVal.userOrgs.length > 0) {
        if (!userHasAdminOrgs.value) userHasAdminOrgs.value = true;
        if (!settingsSelectedOrg.value) {
          settingsSelectedOrg.value = newVal.userOrgs[0].org.publicId;
        }
      }
    }
    // ,
    // { immediate: true }
  );

  // if (userOrgs.value && userOrgs.value.userOrgs.length > 0) {
  //   userHasAdminOrgs.value = true;
  //   activeOrg.value = userOrgs.value.userOrgs[0].org.publicId;
  // }

  // TODO: fix scroll bar positioning, move to right, approx 20 px (may need to move to a parent div)
</script>
<template>
  <div
    class="border-r-1 border-base-6 pr-4 flex flex-col gap-2 h-full max-h-full overflow-y-scroll">
    <div
      class="flex flex-col gap-4 grow overflow-hidden h-full max-h-full overflow-y-scroll">
      <div class="flex flex-col gap-2 w-full border-b-1 border-base-6 pb-4">
        <div>
          <span class="font-display text-lg">Personal</span>
        </div>
        <div class="flex flex-col gap-2">
          <div>
            <span class="text-sm">Profiles</span>
          </div>
          <div>
            <span class="text-sm">Account</span>
          </div>
          <div>
            <span class="text-sm">Security & Passkeys</span>
          </div>
          <div>
            <span class="text-sm">Whatelse</span>
          </div>
        </div>
      </div>
      <div>
        <span class="font-display text-lg">Org</span>
      </div>
      <div
        v-if="pending"
        class="flex flex-row w-full p-8 bg-base-3 rounded-xl gap-4 justify-center rounded-tl-2xl">
        <icon
          name="svg-spinners:3-dots-fade"
          size="24" />
        <span>Loading organizations</span>
      </div>
      <div
        v-if="!userHasAdminOrgs && !pending"
        class="flex flex-row w-full p-8 bg-base-3 rounded-xl gap-4 justify-center rounded-tl-2xl">
        <icon
          name="ph-identification-badge"
          size="24" />
        <span>You are not an admin in any organizations</span>
      </div>
      <div
        class="flex flex-col gap-2"
        v-if="userHasAdminOrgs && !pending">
        <div class="flex flex-col gap-1">
          <SettingsOrgSelector
            v-if="userOrgs"
            v-for="org in userOrgs.userOrgs"
            :orgData="org"
            :key="org.org.publicId"
            @click="settingsSelectedOrg = org.org.publicId"
            :isActive="settingsSelectedOrg === org.org.publicId" />
        </div>
        <div>
          <span
            class="text-xs uppercase font-semibold text-base-11 border-b-1 border-base-3 pb-1">
            Setup
          </span>
        </div>
        <div class="flex flex-col gap-2 pb-2 pl-2">
          <nuxt-link :to="`/settings/org/${settingsSelectedOrg}`">
            <span class="text-sm">Org Profile</span>
          </nuxt-link>
          <nuxt-link :to="`/settings/org/${settingsSelectedOrg}/members`">
            <span class="text-sm">Members</span>
          </nuxt-link>
          <nuxt-link :to="`/settings/org/${settingsSelectedOrg}/invites`">
            <span class="text-sm">Invites</span>
          </nuxt-link>
          <nuxt-link :to="`settings/org/${settingsSelectedOrg}/groups`">
            <span class="text-sm">Groups</span>
          </nuxt-link>
          <nuxt-link :to="`/settings/org/${settingsSelectedOrg}/features`">
            <span class="text-sm">Modules/features</span>
          </nuxt-link>
          <nuxt-link :to="`/settings/org/${settingsSelectedOrg}/billing`">
            <span class="text-sm">Billing</span>
          </nuxt-link>
        </div>
        <div>
          <span
            class="text-xs uppercase font-semibold text-base-11 border-b-1 border-base-3 pb-1"
            >Mail</span
          >
        </div>
        <div class="flex flex-col gap-2 pb-2 pl-2">
          <div>
            <nuxt-link
              :to="`/settings/org/${settingsSelectedOrg}/mail/domains`">
              <span class="text-sm">Domains</span>
            </nuxt-link>
          </div>
          <div>
            <span class="text-sm">Email identities</span>
          </div>
          <div>
            <span class="text-sm">Routing Rules</span>
          </div>
          <div>
            <span class="text-sm">Forwarding address</span>
          </div>
          <div>
            <span class="text-sm">External identities</span>
          </div>
          <div>
            <span class="text-sm">Limits</span>
          </div>
        </div>
      </div>

      <div class="h-[48px] mt-[-48px] bg-gradient-to-t from-base-1" />
    </div>
  </div>
</template>
