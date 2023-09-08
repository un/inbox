<script setup lang="ts">
  definePageMeta({ skipAuth: true });

  const inviteId = useRoute().params.inviteId;
  //! Check inviteId against database
  //! Detect if user is logged in
  //! Render Invite message
  //! if logged in > "Join Org" button
  //! if not logged in > "Sign up"/SignIn button
  //! Nav to flow

  useCookie('un-invite-code').value = inviteId as string;
  console.log(inviteId);
</script>

<template>
  <div>{{ inviteId }}</div>
</template>
