<script setup lang="ts">
  const { data: page } = await useAsyncData('index', () =>
    queryContent('/').findOne()
  );

  const emit = defineEmits(['openWaitlistModal']);

  useSeoMeta({
    title:
      'UnInbox - Modern email for teams and professionals. 100% Open Source.',
    ogSiteName: 'UnInbox',
    ogDescription:
      'Modern email for teams and professionals. 100% Open Source.',
    twitterCard: 'summary_large_image'
  });

  defineOgImage({
    component: 'Landing',
    title: 'UnInbox',
    description: 'Modern email for teams and professionals. 100% Open Source.'
  });

  const heroLinks = [
    {
      label: 'Join the waitlist',
      icon: 'i-heroicons-rocket-launch',
      size: 'xl',
      click: () => emit('openWaitlistModal')
    },
    {
      label: 'Star us on GitHub',
      'trailing-icon': 'i-simple-icons-github',
      color: 'gray',
      size: 'xl',

      click: () => window.open('https://github.com/uninbox/UnInbox', '_blank')
    }
  ];

  const features = [
    {
      title: 'Simplicity',
      description: 'The simplest ways to manage all your email.',
      icon: 'i-ph-star',
      badge: 'At Launch',
      badgeColor: 'primary'
    },
    {
      title: 'Conversations',
      description:
        'Focus on the conversations you have instead of the noise around them. Signatures, lost attachments & endless RE: RE: RE: are a thing of the past.',
      icon: 'i-ph-chat-circle',
      badge: 'At Launch',
      badgeColor: 'primary'
    },
    {
      title: 'Flexibility',
      description:
        'Have 1 or 10 email addresses? Create as many as you like. Want to give multiple people access to a single address? Just make a group.',
      icon: 'i-ph-wave-sine',
      badge: 'At Launch',
      badgeColor: 'primary'
    },
    {
      title: 'Silence',
      description:
        'Spam and cold emails can get annoying really quick. Our screener helps you cut the noise by deciding who can and cant email you.',
      icon: 'i-ph-bell-simple-slash',
      badge: 'Soon',
      badgeColor: 'gray'
    },
    {
      title: 'Portability',
      description:
        'Your emails are yours. If you want to manage your own UnInbox, you should be able to do that. We even give you easy migration tools.',
      icon: 'i-ph-truck',
      badge: 'Soon',
      badgeColor: 'gray'
    },
    {
      title: 'Privacy',
      description:
        'None of this "Your privacy is important to us" marketing speak. Privacy is our default. 100% of our system code is open source, proving nothing happens with your data.',
      icon: 'i-ph-key',
      badge: 'At Launch',
      badgeColor: 'primary'
    }
  ];

  const pricingPlans: {
    title: string;
    description: string;
    button?: any;
    ui?: {};
    features: string[];
    class?: any;
    align: 'top' | 'bottom';
    highlight: boolean;
    scale: boolean;
    badge?: any;
    price: string;
    discount: string;
    cycle: string;
  }[] = [
    {
      title: 'Free',
      description: 'For a Great Free Email Account.',
      // button: { label: 'Buy now' },
      align: 'top',
      features: [
        '@uninbox.me email address',
        'Forwarding Address',
        'Invite people to your organization',
        'Notes, Drafts & Reminders',
        'Community/email based support'
      ],
      price: '$0',
      discount: '',
      cycle: '/month',
      highlight: false,
      scale: false
    },
    {
      title: 'Pro',
      description: 'For Teams and Professionals.',
      // button: { label: 'Buy now' },
      align: 'top',
      features: [
        '@unin.me email address',
        'Unlimited Custom Domains',
        'User Groups',
        'SMTP, API & Webhooks',
        'Priority Chat Support'
      ],
      badge: { label: 'Introductory Price' },
      price: '$8',
      discount: '',
      cycle: '/user /month',
      highlight: true,
      scale: true
    },
    {
      title: 'Self Host',
      description: 'For the brave.',
      align: 'top',
      features: [
        'All features from the app',
        'Install on your own servers',
        'The ultimate privacy',
        'Free lifetime updates',
        'Sleepless nights'
      ],
      price: '$0',
      discount: '',
      cycle: '/lifetime',
      highlight: false,
      scale: false
    }
  ];

  const testimonials = [
    {
      quote: "Can't wait to check it out.",
      icon: 'i-simple-icons-x',
      author: {
        name: 'Caspar',
        avatar: {
          src: 'https://twitter.com/caspar_g/photo',
          loading: 'lazy'
        }
      }
    },
    {
      quote: "Can't wait to check it out.",
      icon: 'i-simple-icons-x',
      author: {
        name: 'Caspar',
        avatar: {
          src: 'https://twitter.com/caspar_g/photo',
          loading: 'lazy'
        }
      }
    }
  ];

  const cta: Partial<{
    title: string;
    description: string;
    ui: {};
    links: (Button & { click?: Function })[];
    class: any;
    align: 'left' | 'center' | 'right';
    card: boolean;
  }> = {
    title: 'Launching Soon 🚀',
    description:
      'Join the waitlist to be the first to know when we launch. Currently scheduled for early March 2024.',

    links: [
      {
        label: 'Join the waitlist',
        color: 'black',
        size: 'xl',
        trailingIcon: 'i-heroicons-rocket-launch',
        click: () => emit('openWaitlistModal')
      }
    ]
  };

  const faq = [
    {
      label: 'Can I use UnInbox for my personal email?',
      content:
        'Yes, most of our features are designed for collaboration, but everything should work if its just you. '
    },
    {
      label: 'Can I use custom domains?',
      content: 'Yes, either by self-hosting or by upgrading to our paid plan.'
    },
    {
      label: 'Why are custom domains not available on the free plan?',
      content:
        'There is a high risk of spam and abuse with custom domains, and this could damage the all our sending infrastructure. We require a paid plan as verification and to cover the additional technical requirements of ensuring safe email sending across our platform.'
    },
    {
      label: 'Do you offer technical support?',
      content:
        'Yes, free users can either email us directly in UnInbox or use our community chat server on Discord. Paid users receive chat support.'
    },
    {
      label: 'Can I self-host UnInbox?',
      content:
        "Yes, we'll even give you a handy guide to get things set up. Support for self-hosting is through our Discord community or by purchasing a support contract."
    },
    {
      label: 'Will you have a calendar?',
      content: "It's planned, but will come after the email app is stable."
    },
    {
      label: 'Will you have an email aliasing feature?',
      content:
        'Yes, it will come soon after launch and let you create email aliases either with our domain UnAlias.com or your own custom domains.'
    },
    {
      label: 'Any plans for a document writing feature?',
      content: 'Yes.'
    },
    {
      label: 'Will you support / have encryption?',
      content:
        "Yes, initially encryption won't be available, but it's a top priority for us. Once we're out of Beta mode, expect robust encryption measures. We're working to seamlessly implement encryption without disrupting any features / functioning, ensuring smooth data storage and sharing within the organization."
    },
    {
      label: 'Can I migrate my emails from Google or another provider?',
      content:
        'We want to make De-Googling and migrating from other providers super easy. Its not yet possible but its on our priorities list.'
    },
    {
      label: 'Will your prices ever increase?',
      content:
        'Yes, as time goes on things become more expensive. BUT, when you have an active subscription, the price is locked in till your subscription expires.'
    },
    {
      label: 'Can I use UnInbox with another email client?',
      content:
        'No, we are built on very different technologies and theres simply no way to make them compatible. If you really need to use another email client, check for another service or use our forwarding feature.'
    },
    {
      label: 'Can I forward mail in from another service?',
      content:
        'Yes, you get a personal email address with UnInbox, and a dedicated forwarding address. Any emails sent to your forwarding address will appear in your UnInbox. You can also forward all emails for a custom domain to your UnInbox organization.'
    },
    {
      label: 'Will you do what Skiff did and abandon us?',
      content:
        "No, we do not plan on getting acquired, that's not our end goal. If we were ever to shut down, our code will remain freely available for you to self-host and we will take some steps to ensure the online platform can remain active."
    },
    {
      label: 'Do you plan on raising funds or taking investments?',
      content:
        'Yes, in order to bring our vision to life, we will need significant time and resources. Crowdfunding, donations and bootstrapping were deeply considered, but deemed not viable enough for our vision. Any potential investor will be carefully vetted by our founders - and by peers in the open source community - to ensure they align with our open source principles, and it will be made abundantly clear that an acquisition is not in our future. Special agreements will be put into place to ensure the longevity of UnInbox if we were ever to halt doing business.'
    },
    {
      label: 'What does "100% Open Source" mean?',
      content:
        '100% of the code for all the features and functionality needed to run your own instance of UnInbox are released under a permissive software license called AGPLv3. This allows anyone to copy the code and modify it however they want, so long as they also release the code publicly under the same license. A few features or modules in the app are not open source, but instead released under a commercial license and mostly publicly available. These features or modules are things that are only relevant to large enterprise companies such as SSO or OIDC - or related to the billing system of UnInbox.'
    }
  ];
</script>

<template>
  <div>
    <ULandingHero
      title="Modern email for teams and professionals"
      description="Bringing the best of email and messaging into a single, modern, and secure platform."
      :ui="{ title: 'font-display' }"
      :links="heroLinks">
      <template #headline>
        <UBadge
          variant="subtle"
          size="lg"
          class="relative rounded-full font-semibold">
          100% Open Source
        </UBadge>
      </template>

      <div class="flex flex-col gap-2">
        <img
          src="/images/screenshot.png?url"
          class="ring-gray-300 dark:ring-gray-700 w-full rounded-md shadow-xl ring-1" />
        <span class="text-gray-500 text-sm">
          This is a development screenshot
        </span>
        <NuxtLink
          class="text-gray-500 text-sm"
          to="https://youtu.be/AWQdAKmNrR4"
          target="_blank">
          Click here to see a video
        </NuxtLink>
      </div>

      <!-- <ULandingLogos
        title="People are talking about us"
        align="center">
        <UIcon
          v-for="icon in page.logos.icons"
          :key="icon"
          :name="icon"
          class="text-gray-900 h-12 w-12 flex-shrink-0 lg:h-16 lg:w-16 dark:text-white" />
      </ULandingLogos> -->
    </ULandingHero>

    <ULandingSection
      title="What you can expect"
      description="UnInbox is built from the ground up to renew your email experience. We're not limited by email technologies of the past, and we're not afraid to innovate. So here's what you can expect from UnInbox"
      headline="The UnInbox Way"
      :ui="{ title: 'font-display' }">
      <UPageGrid
        id="way"
        class="scroll-mt-[calc(var(--header-height)+140px+128px+96px)]">
        <ULandingCard
          v-for="(item, index) in features"
          :key="index"
          v-bind="item">
          <UBadge
            v-if="item.badge"
            :color="item.badgeColor"
            variant="subtle"
            size="sm"
            class="absolute right-2 top-2">
            {{ item.badge }}
          </UBadge>
        </ULandingCard>
      </UPageGrid>
    </ULandingSection>
    <div id="features" />
    <ULandingSection
      title="What we're building"
      description="Just some of the things we're working on for or soon after launch."
      headline="Planned Features"
      :ui="{ title: 'font-display' }"
      class="">
      <div class="w-full flex flex-col items-center gap-2 -mt-12">
        <span class="text-gray-500 text-xs">Productivity</span>
        <div class="flex flex-row flex-wrap justify-center gap-2">
          <UBadge
            variant="subtle"
            label="Snoozing & Reminders" />
          <UBadge
            variant="subtle"
            label="Automations" />
          <UBadge
            variant="subtle"
            label="Private/Shared Conversation Notes" />
          <UBadge
            variant="subtle"
            label="Private/Shared Drafts" />
          <UBadge
            variant="subtle"
            label="Contacts Management" />
          <UBadge
            variant="subtle"
            label="Invite to Chat" />
          <UBadge
            variant="subtle"
            label="Newsletter/Product Update Feed" />
          <UBadge
            variant="subtle"
            label="Easily Copy Login Codes" />
          <UBadge
            variant="subtle"
            label="Conversation Status" />
          <UBadge
            variant="subtle"
            label="Contact Context" />
        </div>
      </div>
      <div class="w-full flex flex-col items-center gap-2 -mt-12">
        <span class="text-gray-500 text-xs">Teams and Groups</span>
        <div class="flex flex-row flex-wrap gap-2">
          <UBadge
            variant="subtle"
            label="User Groups" />
          <UBadge
            variant="subtle"
            label="Assign Conversation" />
          <UBadge
            variant="subtle"
            label="Assignment Round-Robin" />
          <UBadge
            variant="subtle"
            label="Add Conversation Watchers" />
        </div>
      </div>
      <div class="w-full flex flex-col items-center gap-2 -mt-12">
        <span class="text-gray-500 text-xs">Email Sending & Receiving</span>
        <div class="flex flex-row flex-wrap gap-2">
          <UBadge
            variant="subtle"
            label="Advanced Email Routing" />
          <UBadge
            variant="subtle"
            label="Send Mail to a Webhook" />
          <UBadge
            variant="subtle"
            label="Transactional Email Sending" />
          <UBadge
            variant="subtle"
            label="Bulk Email Sending" />
          <UBadge
            variant="subtle"
            label="Migrate from Google" />
          <UBadge
            variant="subtle"
            label="API Support" />
          <UBadge
            variant="subtle"
            label="SMTP Support" />
          <UBadge
            variant="subtle"
            label="Send via External SMTP" />
        </div>
      </div>
    </ULandingSection>
    <ULandingSection
      title="Simple Affordability"
      description="No surprises, no hidden fees. Just simple, transparent pricing."
      headline="Pricing"
      :ui="{ title: 'font-display' }">
      <UPricingGrid
        id="pricing"
        compact
        class="scroll-mt-[calc(var(--header-height)+140px+128px+96px)]">
        <UPricingCard
          v-for="(plan, index) in pricingPlans"
          :key="index"
          v-bind="plan"
          :ui="{ title: 'font-display' }" />
      </UPricingGrid>
    </ULandingSection>

    <!-- <ULandingSection
      headline="Buzz"
      title="What people are saying"
      description="We havent launched yet, but lots of people are talking about us. We occasionally share screenshots or words about what we're doing, here are the responses">
      <UPageColumns
        id="testimonials"
        class="scroll-mt-[calc(var(--header-height)+140px+128px+96px)] xl:columns-4">
        <div
          v-for="(testimonial, index) in page.testimonials.items"
          :key="index"
          class="break-inside-avoid">
          <ULandingTestimonial v-bind="testimonial" />
        </div>
      </UPageColumns>
    </ULandingSection> -->

    <ULandingSection
      class="bg-primary-50 dark:bg-primary-400 dark:bg-opacity-10">
      <ULandingCTA
        v-bind="cta"
        :card="false"
        :ui="{ title: 'font-display' }" />
    </ULandingSection>

    <ULandingSection
      id="faq"
      title="Frequently asked questions"
      class="scroll-mt-[var(--header-height)]"
      :ui="{ title: 'font-display' }">
      <ULandingFAQ
        multiple
        :items="faq"
        :ui="{
          button: {
            label: 'font-semibold',
            trailingIcon: {
              base: 'w-6 h-6'
            }
          }
        }"
        class="mx-auto max-w-4xl" />
    </ULandingSection>
  </div>
</template>
