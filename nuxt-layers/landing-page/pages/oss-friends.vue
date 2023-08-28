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

  const OSSFriends = [
    {
      name: 'BoxyHQ',
      description:
        'BoxyHQ’s suite of APIs for security and privacy helps engineering teams build and ship compliant cloud applications faster.',
      href: 'https://boxyhq.com'
    },
    {
      name: 'Cal.com',
      description:
        'Cal.com is a scheduling tool that helps you schedule meetings without the back-and-forth emails.',
      href: 'https://cal.com'
    },
    {
      name: 'Crowd.dev',
      description:
        'Centralize community, product, and customer data to understand which companies are engaging with your open source project.',
      href: 'https://www.crowd.dev'
    },
    {
      name: 'Documenso',
      description:
        'The Open-Source DocuSign Alternative. We aim to earn your trust by enabling you to self-host the platform and examine its inner workings.',
      href: 'https://documenso.com'
    },
    {
      name: 'Erxes',
      description:
        'The Open-Source HubSpot Alternative. A single XOS enables to create unique and life-changing experiences ​​that work for all types of business.',
      href: 'https://erxes.io'
    },
    {
      name: 'Formbricks',
      description:
        'Survey granular user segments at any point in the user journey. Gather up to 6x more insights with targeted micro-surveys. All open-source.',
      href: 'https://formbricks.com'
    },
    {
      name: 'GitWonk',
      description:
        'GitWonk is an open-source technical documentation tool, designed and built focusing on the developer experience.',
      href: 'https://gitwonk.com'
    },
    {
      name: 'Hanko',
      description:
        'Open-source authentication and user management for the passkey era. Integrated in minutes, for web and mobile apps.',
      href: 'https://www.hanko.io'
    },
    {
      name: 'HTMX',
      description:
        'HTMX is a dependency-free JavaScript library that allows you to access AJAX, CSS Transitions, WebSockets, and Server Sent Events directly in HTML.',
      href: 'https://htmx.org'
    },
    {
      name: 'Infisical',
      description:
        'Open source, end-to-end encrypted platform that lets you securely manage secrets and configs across your team, devices, and infrastructure.',
      href: 'https://infisical.com'
    },
    {
      name: 'Novu',
      description:
        'The open-source notification infrastructure for developers. Simple components and APIs for managing all communication channels in one place.',
      href: 'https://novu.co'
    },
    {
      name: 'OpenBB',
      description:
        'Democratizing investment research through an open source financial ecosystem. The OpenBB Terminal allows everyone to perform investment research, from everywhere.',
      href: 'https://openbb.co'
    },
    {
      name: 'Sniffnet',
      description:
        'Sniffnet is a network monitoring tool to help you easily keep track of your Internet traffic.',
      href: 'https://www.sniffnet.net'
    },
    {
      name: 'Typebot',
      description:
        'Typebot gives you powerful blocks to create unique chat experiences. Embed them anywhere on your apps and start collecting results like magic.',
      href: 'https://typebot.io'
    },
    {
      name: 'Webiny',
      description:
        'Open-source enterprise-grade serverless CMS. Own your data. Scale effortlessly. Customize everything.',
      href: 'https://www.webiny.com'
    },
    {
      name: 'Webstudio',
      description: 'Webstudio is an open source alternative to Webflow',
      href: 'https://webstudio.is'
    }
  ];
</script>

<template>
  <div>
    <div
      class="flex flex-col justify-center items-center gap-8 container m-auto mb-16">
      <h1 class="text-7xl font-display mt-16">Our Open Source Friends</h1>
      <p class="max-w-prose">
        We believe in a better and more sustainable future powered by Open
        Source software. Below you can find a list of our friends who are just
        as passionate about open source and the future as we are.
      </p>

      <div
        class="grid grid-flow-row gap-8 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 mt-16">
        <div
          v-for="friend of OSSFriends"
          :key="friend.name"
          class="border-2 p-8 rounded-md border-gray-600 flex flex-col items-center gap-4 bg-blue-500/10 hover:border-gray-400 transition-colors cursor-pointer"
          @click="navigateTo(friend.href, { external: true })">
          <h3 class="font-display text-2xl">{{ friend.name }}</h3>
          <p class="max-w-prose">{{ friend.description }}</p>
        </div>
      </div>
    </div>
  </div>
</template>
