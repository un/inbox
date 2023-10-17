<script setup lang="ts">
  const { $trpc } = useNuxtApp();

  const navStore = useNavStore();
  const { settingsSelectedOrg, userHasAdminOrgs } = storeToRefs(navStore);
  const route = useRoute();
  const router = useRouter();

  watch(settingsSelectedOrg, (newVal) => {
    const currentOrgRoute = route.params.orgId as string;
    if (currentOrgRoute) {
      const newPath = route.path.replace(currentOrgRoute, newVal);
      router.push(newPath);
    }
  });

  const {
    data: userOrgs,
    pending,
    error,
    refresh
  } = await $trpc.org.crud.getUserOrgs.useLazyQuery(
    {
      onlyAdmin: true
    },
    { server: false, queryKey: 'getUserOrgsSidebar' }
  );

  watch(userOrgs, (newVal) => {
    console.log('new userOrgs Val', newVal);
    if (newVal && newVal.userOrgs.length > 0) {
      if (!userHasAdminOrgs.value) userHasAdminOrgs.value = true;
      if (!settingsSelectedOrg.value) {
        settingsSelectedOrg.value = newVal.userOrgs[0].org.publicId;
      }
    }
  });

  // TODO: fix scroll bar positioning, move to right, approx 20 px (may need to move to a parent div)
  const eeBilling = useEE().config.modules.billing;
</script>
<template>
  <div
    class="h-full max-h-full flex flex-col gap-2 overflow-y-scroll border-r-1 border-base-6 pr-4">
    <div
      class="h-full max-h-full flex grow flex-col gap-4 overflow-hidden overflow-y-scroll">
      <div class="w-full flex flex-col gap-2 border-b-1 border-base-6 pb-4">
        <div>
          <span class="text-lg font-display">Personal</span>
        </div>
        <div class="flex flex-col gap-2 pl-2">
          <!-- <div>
            <span class="text-sm">Account</span>
          </div> -->
          <div>
            <span class="text-sm">Profile</span>
          </div>
          <div>
            <span class="text-sm">Personal Addresses</span>
          </div>
          <!-- <div>
            <span class="text-sm">Security & Passkeys</span>
          </div> -->
          <nuxt-link
            v-if="eeBilling"
            :to="`/settings/user/lifetime`">
            <span class="text-sm">Lifetime License</span>
          </nuxt-link>
        </div>
      </div>
      <div class="mb-[48px] flex flex-col gap-4">
        <div>
          <span class="text-lg font-display">Org</span>
        </div>
        <div
          v-if="pending"
          class="w-full flex flex-row justify-center gap-4 rounded-xl rounded-tl-2xl bg-base-3 p-8">
          <icon
            name="svg-spinners:3-dots-fade"
            size="24" />
          <span>Loading organizations</span>
        </div>
        <div
          v-if="!userHasAdminOrgs && !pending"
          class="w-full flex flex-row justify-center gap-4 rounded-xl rounded-tl-2xl bg-base-3 p-8">
          <icon
            name="ph-identification-badge"
            size="24" />
          <span>You are not an admin in any organizations</span>
        </div>
        <div
          v-if="userHasAdminOrgs && !pending"
          class="flex flex-col gap-8">
          <div
            v-if="userOrgs"
            class="flex flex-col gap-1">
            <SettingsOrgSelector
              v-for="org in userOrgs.userOrgs"
              :key="org.org.publicId"
              :org-data="org"
              :is-active="settingsSelectedOrg === org.org.publicId"
              @click="settingsSelectedOrg = org.org.publicId" />
          </div>
        </div>
        <div
          v-if="!pending"
          class="flex flex-col gap-8">
          <nuxt-link
            class="max-w-full w-full flex flex-row items-center justify-start gap-2 overflow-hidden rounded bg-base-2 p-2 pl-4 hover:bg-base-4"
            to="/settings/org/new">
            <icon
              name="ph-plus"
              size="16" />

            <span class="text-xs font-medium">Create New Org</span>
          </nuxt-link>
        </div>
        <div
          v-if="userHasAdminOrgs && !pending"
          class="flex flex-col gap-8">
          <div class="flex flex-col gap-2 pb-2 pl-2">
            <span
              class="border-b-1 border-base-3 pb-1 text-xs font-semibold uppercase text-base-11">
              Setup
            </span>
            <nuxt-link :to="`/settings/org/${settingsSelectedOrg}`">
              <span class="text-sm">Org Profile</span>
            </nuxt-link>
            <!-- <nuxt-link
              :to="`/settings/org/${settingsSelectedOrg}/setup/features`">
              <span class="text-sm">Modules/features</span>
            </nuxt-link> -->
            <nuxt-link
              v-if="eeBilling"
              :to="`/settings/org/${settingsSelectedOrg}/setup/billing`">
              <span class="text-sm">Billing</span>
            </nuxt-link>
          </div>

          <div class="flex flex-col gap-2 pb-2 pl-2">
            <span
              class="border-b-1 border-base-3 pb-1 text-xs font-semibold uppercase text-base-11">
              Users
            </span>
            <nuxt-link
              :to="`/settings/org/${settingsSelectedOrg}/users/members`">
              <span class="text-sm">Members</span>
            </nuxt-link>
            <nuxt-link
              :to="`/settings/org/${settingsSelectedOrg}/users/invites`">
              <span class="text-sm">Invites</span>
            </nuxt-link>
            <nuxt-link
              :to="`/settings/org/${settingsSelectedOrg}/users/groups`">
              <span class="text-sm">Groups</span>
            </nuxt-link>
          </div>

          <div class="flex flex-col gap-2 pb-2 pl-2">
            <span
              class="border-b-1 border-base-3 pb-1 text-xs font-semibold uppercase text-base-11">
              Mail
            </span>
            <nuxt-link
              :to="`/settings/org/${settingsSelectedOrg}/mail/domains`">
              <span class="text-sm">Domains</span>
            </nuxt-link>
            <nuxt-link
              :to="`/settings/org/${settingsSelectedOrg}/mail/addresses`">
              <span class="text-sm">Email Addresses</span>
            </nuxt-link>
            <!-- <nuxt-link
              :to="`/settings/org/${settingsSelectedOrg}/mail/addresses`">
              <span class="text-sm">Routing Rules</span>
            </nuxt-link> -->
            <!-- <nuxt-link
              :to="`/settings/org/${settingsSelectedOrg}/mail/addresses`">
              <span class="text-sm">External identities</span>
            </nuxt-link> -->
            <!-- <nuxt-link
              :to="`/settings/org/${settingsSelectedOrg}/mail/addresses`">
              <span class="text-sm">Limits</span>
            </nuxt-link> -->
          </div>
        </div>
      </div>

      <div class="mt-[-48px] h-[48px] from-base-1 bg-gradient-to-t" />
    </div>
  </div>
</template>
