<script setup lang="ts">
  definePageMeta({ auth: false });

  useSeoMeta({
    title: 'UnInbox - OSS Friends',
    description: 'Our amazing open source friends'
  });
  defineOgImageStatic({
    component: 'LandingOG',
    description: 'Our amazing open source friends',
    sub: 'Open Source Email + Chat communication platform'
  });
</script>

<template>
  <div>
    <TopNav />
    <div
      class="flex flex-col justify-center items-center gap-8 container m-auto mb-16">
      <h1 class="text-7xl font-display mt-16">The UnInbox Manifesto</h1>
      <p class="max-w-prose text-xl font-normal text-sand-12">
        Email is the standard, the de facto, the default<br />
        A technology to reflect a 2000 year old system<br />
        An invention modeled on the physical world<br />
        A time before realizing the power of the internet<br />
        <br />
        Inboxes are overflowing with anything and everything<br />
        A chaotic mixture of news, updates and conversations<br />
        An open door for anyone anywhere to disrupt our flow<br />
        Where important things are too easily pushed out of view<br />
        <br />
        An inbox gives the world control over your communications<br />
        What you receive, should be your own choice<br />
        When you see it should be a decision made by you<br />
        How you process it should be however you want<br />
        <br />
        If we free ourselves from the idea of an inbox<br />
        Free ourselves from restrictive technology<br />
        Free ourselves from an outdated system<br />
        We have conversations without the cons<br />
        <br />
        When we <span class="font-display">UnInbox</span> - we are back in
        control
      </p>

      <div
        class="grid grid-flow-row gap-8 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 mt-16"></div>
    </div>
  </div>
</template>
