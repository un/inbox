<script setup lang="ts">
  const { $trpc } = useNuxtApp();

  const userHasAdminOrgs = ref(false);
  const activeOrg = ref('');
  const route = useRoute();
  const router = useRouter();

  watch(activeOrg, (newVal) => {
    const currentOrgRoute = route.params.orgId as string;
    if (currentOrgRoute) {
      const newPath = route.path.replace(currentOrgRoute, newVal);
      router.push(newPath);
    }
  });

  const userOrgs = await $trpc.org.settings.getUserOrgs.query({
    onlyAdmin: true
  });
  if (userOrgs.userOrgs.length > 0) {
    userHasAdminOrgs.value = true;
    activeOrg.value = userOrgs.userOrgs[0].org.publicId;
  }

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
      <div
        class="flex flex-col gap-2"
        v-if="userHasAdminOrgs">
        <div>
          <span class="font-display text-lg">Org</span>
        </div>
        <div class="flex flex-col gap-1">
          <SettingsOrgSelector
            v-for="org in userOrgs.userOrgs"
            :orgData="org"
            :key="org.org.publicId"
            @click="activeOrg = org.org.publicId"
            :isActive="activeOrg === org.org.publicId" />
        </div>
        <div>
          <span
            class="text-xs uppercase font-semibold text-base-11 border-b-1 border-base-3 pb-1">
            Setup
          </span>
        </div>
        <div class="flex flex-col gap-2 pb-2 pl-2">
          <nuxt-link :to="`/settings/org/${activeOrg}`">
            <span class="text-sm">Org Profile</span>
          </nuxt-link>
          <nuxt-link :to="`/settings/org/${activeOrg}/members`">
            <span class="text-sm">Members</span>
          </nuxt-link>
          <nuxt-link :to="`/settings/org/${activeOrg}/invites`">
            <span class="text-sm">Invites</span>
          </nuxt-link>
          <nuxt-link :to="`settings/org/${activeOrg}/groups`">
            <span class="text-sm">Groups</span>
          </nuxt-link>
          <nuxt-link :to="`/settings/org/${activeOrg}/features`">
            <span class="text-sm">Modules/features</span>
          </nuxt-link>
          <nuxt-link :to="`/settings/org/${activeOrg}/billing`">
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
            <span class="text-sm">Domains</span>
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
