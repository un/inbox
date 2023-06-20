<script setup lang="ts">
  definePageMeta({ auth: false });

  useSeoMeta({
    title: 'The UnInbox Manifesto',
    description: "It's time to rethink email"
  });
  defineOgImageStatic({
    component: 'LandingOG',
    description: 'The UnInbox Manifesto',
    sub: "It's time to rethink email"
  });
</script>

<template>
  <div>
    <div
      class="container m-auto mb-16 flex flex-col items-center justify-center gap-8 p-6">
      <h1 class="font-display mt-16 text-center text-7xl">
        The UnInbox Manifesto
      </h1>
      <div
        class="text-sand-12 flex max-w-prose flex-col items-center gap-2 text-center text-xl font-normal">
        <p class="w-64 pb-1 leading-tight md:w-full md:pb-0">
          Email is the standard, the de facto, the default
        </p>
        <p class="w-64 pb-1 leading-tight md:w-full md:pb-0">
          A technology to reflect a 2000 year old system
        </p>
        <p class="w-64 pb-1 leading-tight md:w-full md:pb-0">
          An invention modeled on the physical world
        </p>
        <p class="w-64 pb-1 leading-tight md:w-full md:pb-0">
          A time before realizing the power of the internet
        </p>
        <br />
        <p class="w-64 pb-1 leading-tight md:w-full md:pb-0">
          Inboxes are overflowing with anything and everything
        </p>
        <p class="w-64 pb-1 leading-tight md:w-full md:pb-0">
          A chaotic mixture of news, updates and conversations
        </p>
        <p class="w-64 pb-1 leading-tight md:w-full md:pb-0">
          An open door for anyone anywhere to disrupt our flow
        </p>
        <p class="w-64 pb-1 leading-tight md:w-full md:pb-0">
          Where important things are too easily pushed out of view
        </p>
        <br />
        <p class="w-72 pb-1 leading-tight md:w-full md:pb-0">
          An inbox gives the world control over your communications
        </p>
        <p class="w-64 pb-1 leading-tight md:w-full md:pb-0">
          What you receive should be your own choice
        </p>
        <p class="w-64 pb-1 leading-tight md:w-full md:pb-0">
          When you see it should be a decision made by you
        </p>
        <p class="w-64 pb-1 leading-tight md:w-full md:pb-0">
          How you process it should be however you want
        </p>
        <br />
        <p class="w-60 pb-1 leading-tight md:w-full md:pb-0">
          If we free ourselves from the idea of an inbox
        </p>
        <p class="w-64 pb-1 leading-tight md:w-full md:pb-0">
          Free ourselves from restrictive technology
        </p>
        <p class="w-64 pb-1 leading-tight md:w-full md:pb-0">
          Free ourselves from an outdated system
        </p>
        <p class="w-64 pb-1 leading-tight md:w-full md:pb-0">
          We have conversations without the cons
        </p>
        <br />
        <p class="w-48 pb-1 leading-tight md:w-full md:pb-0">
          When we <span class="font-display">UnInbox</span> - we are back in
          control
        </p>
      </div>

      <div
        class="mt-16 grid grid-flow-row gap-8 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        <div
          class="flex cursor-pointer flex-col items-center gap-4 rounded-md border-2 border-gray-600 bg-blue-500/10 p-8 transition-colors hover:border-gray-400">
          <h3 class="font-display text-2xl">Now?</h3>
          <p class="max-w-prose">
            The first email was sent almost 45 years ago (1979), before the
            invention of the mobile telephone.<br /><br />
            We've seen some advancements in email technology, but very little
            changes in the way we process and use them.<br /><br />
            Emails have become a painpoint for many, and we're not alone in
            thinking that there must be a better way.<br /><br />
            So we're bringing the best minds together, working in the open, to
            build a sustainable and capable system to power our communication.
          </p>
        </div>
        <div
          class="flex cursor-pointer flex-col items-center gap-4 rounded-md border-2 border-gray-600 bg-blue-500/10 p-8 transition-colors hover:border-gray-400">
          <h3 class="font-display text-2xl">How?</h3>
          <p class="max-w-prose whitespace-pre-line">
            We are a communications platform with a connection to legacy email
            networks - not built on email technology.<br /><br />
            Incoming messages are matched against known templates, striped of
            extra fluff, and presented in a way that makes sense.<br /><br />
            Your conversations are moved to the forefront, everything else
            blends into the background.<br /><br />
            And because email is just a connector, we can expand to other ways
            of communicating with the outside world.
          </p>
        </div>
        <div
          class="flex cursor-pointer flex-col items-center gap-4 rounded-md border-2 border-gray-600 bg-blue-500/10 p-8 transition-colors hover:border-gray-400">
          <h3 class="font-display text-2xl">Wow?</h3>
          <p class="max-w-prose whitespace-pre-line">
            Your communications should feel intuitive and natural, be calm and
            organized.<br /><br />
            Whether you're working alone, or with a team; our tools and features
            help you focus on the things that matter and help your conversations
            flow freely.<br /><br />
            We're not going for the "WOW" factor. Our goal is simple:<br /><br />
            "This is how email should have been, This makes perfect sense".
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
