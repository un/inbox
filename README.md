<p align="center">
   <a href="https://discord.gg/QMV9p9sgza"><img src="https://img.shields.io/badge/Discord-uninbox.com-informational?logo=discord&style=for-the-badge" alt="Join The UnInbox Discord Community"></a> 
   <a href="https://github.com/uninbox/UnInbox/stargazers"><img src="https://img.shields.io/github/stars/uninbox/UnInbox?logo=github&style=for-the-badge&color=yellow" alt="Github Stars"></a>
</p>
<p align="center">
   <a href="https://github.com/uninbox/UnInbox/pulse"><img src="https://img.shields.io/github/commit-activity/m/uninbox/UnInbox?style=for-the-badge&color=green" alt="Commits-per-month"></a>
</p>
<p align="center" style="margin-top: 12px">
  <a href="https://uninbox.com">
   <img width="250px" src="https://avatars.githubusercontent.com/u/135225712?s=400&u=72ad315d63b0326e5bb34377c3f59389373edc9a&v=4" alt="UnInbox Logo">
  </a>

  <h1 align="center"><tt>UnInbox</tt></h1>
  <h2 align="center">The Open Source Communication Infrastructure</h2>

<p align="center">
    <a href="https://UnInbox.com"><strong>To our Website & App »</strong></a>
    <br />
    <br />
    <a href="https://twitter.com/UnInbox">UnInbox Twitter</a>
    ·
    <a href="https://discord.gg/QMV9p9sgza">UnInbox Discord Server</a>
  </p>
</p>

---

## :construction: Current Status

`UnInbox` is currently in under heavy development. The initial public release is expected in March 2024

---

## About

Our core infrastructure is designed from the ground up for effective communication between you and the rest of the world.

The webapp provides a flavoured experience of what email communication would be if it was re-imagined for how we communicate today.

Features like "team collaboration", "conversation notes" and "new sender screener" are native, making communication easier and more intuitive.

Built to work with your current email infrastructure or replace it entirely.

We're not here to kill email, we're bringing it up to date, killing inboxes along the way.

UnInbox isn't another email service, its a better way to do email.

_And email is just the start_

---

## Why

The first email was sent almost 45 years ago (1979). Before the invention of the mobile telephone.

Communication workflows have changed dramatically since then, but the email experience has remained the same.

The volume of emails we receive has exploded in recent years, with more noise than actual conversations.

Email is not built for today's noisy, remote, highly collaborative world.

But email is universal, so we can't force the world to replace it.

Instead, we're detaching from its legacy underpinnings, to build something modern on top.

---

## Tech Stack

`UnInbox` is built with the following epic technologies & tools:

- [Nuxt JS](https://nuxt.com) Vue based FrontEnd & Backend + modules
- [Nitro](https://nitro.unjs.io/) Public API + Misc tooling
- [Tailwind](https://tailwindcss.com/) CSS Engine
- [tRPC](https://trpc.io/) Typesafe APIs
- [DrizzleORM](https://orm.drizzle.team/) ORM + MySQL

_p.s. Things will change over time!_

## Running Locally
To get a local copy up and running, follow these simple steps.

### Prerequisites

Here is what you need to be able to run UnInbox locally.

- Node.js (Version: >=20.x)
- Docker
- pnpm (see https://pnpm.io/installation)

### Setup

1. Clone the repo into a public GitHub repository (or fork https://github.com/uninbox/UnInbox/fork). If you plan to distribute the code, keep the source code public to comply with [AGPLv3](https://github.com/uninbox/UnInbox/blob/main/LICENSE). To clone in a private repository, contact us to acquire a commercial license

   ```sh
   git clone https://github.com/uninbox/UnInbox.git
   ```

   > If you are on Windows, run the following command on `gitbash` with admin privileges: <br> > `git clone -c core.symlinks=true https://github.com/uninbox/UnInbox.git` <br>
   > See [docs](https://cal.com/docs/how-to-guides/how-to-troubleshoot-symbolic-link-issues-on-windows#enable-symbolic-links) for more details.

2. Go to the project folder

   ```sh
   cd UnInbox
   ```

3. Install packages with pnpm

   ```sh
   pnpm i
   ```

4. Set up your `.env.local` file

   - Duplicate `.env.local.example` to `.env.local`. This file is already pre-configured for use with the local docker containers

      mac
     ```sh
      cp .env.local.example .env.local
     ```
     windows
     ```sh
      copy .env.local.example .env.local
     ```

5. Start the docker containers

   ```sh
   pnpm run docker:up
   ```
   
6. Sync the schema with the database:

    ```sh 
   pnpm run db:push
    ```

7. In another terminal window, start the app and all services

   ```sh
   pnpm run dev
   ```

## Self Hosting

Self hosting will be possible, but requires some additional manual configuration for email. Please check out Discord community for information on how to self-host UnInbox in production
