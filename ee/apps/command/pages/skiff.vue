<script setup lang="ts">
  import { ref, useNuxtApp, useToast } from '#imports';

  const { $trpc } = await useNuxtApp();

  const orgShortcode = ref<string>('');
  const orgPublicId = ref<string>('');
  const orgId = ref<number>();
  const functionResult = ref({});
  const toast = useToast();

  const orgData = ref({});

  async function getOrgData() {
    const { data } = await $trpc.orgs.getOrgData.useQuery({
      orgShortcode: orgShortcode.value
    });
    orgData.value = data.value || {};
    orgId.value = data?.value?.org?.id;
  }

  async function giveSkiffDomain() {
    if (!orgId.value) return;
    const result = await $trpc.orgs.addSkiffOffer.mutate({
      orgId: orgId.value
    });
    if (!result) {
      toast.add({
        title: 'Error',
        description: 'failed',
        color: 'red',
        timeout: 5000
      });
    }
    functionResult.value = result.orgMetadata || {};
    toast.add({
      title: 'Success',
      description: 'success',
      color: 'green',
      timeout: 5000
    });
  }
</script>

<template>
  <div class="flex flex-col gap-8">
    <h1 class="font-display">Skiff</h1>
    <span>Active org id: {{ orgId }}</span>
    <div class="flex flex-row gap-4">
      <NuxtUiInput
        v-model="orgShortcode"
        label="orgShortcode"
        placeholder="OrgShortcode" />
      <NuxtUiInput
        v-model="orgPublicId"
        disabled
        label="orgPublicId"
        placeholder="Org Public Id" />
      <NuxtUiButton
        label="Get Org"
        @click="getOrgData()" />
    </div>
    {{ orgData }}

    <div class="flex flex-col gap-4">
      <span>Offers to give to orgId: {{ orgId }}</span>
      <NuxtUiButton
        label="Give Skiff 1 Domain"
        @click="giveSkiffDomain()" />
    </div>
    {{ functionResult }}
  </div>
</template>
