<p align="center">
   <a href="https://discord.gg/QMV9p9sgza"><img src="https://img.shields.io/badge/Discord-uninbox.com-informational?logo=discord&style=for-the-badge" alt="Join The UnInbox Discord Community"></a> 
   <a href="https://github.com/un/inbox/stargazers"><img src="https://img.shields.io/github/stars/un/inbox?logo=github&style=for-the-badge&color=yellow" alt="Github Stars"></a>
</p>
<p align="center">
   <a href="https://github.com/un/inbox/pulse"><img src="https://img.shields.io/github/commit-activity/m/un/inbox?style=for-the-badge&color=green" alt="Commits-per-month"></a>
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

`UnInbox` is Live! We are working on more features and infrastructure to make UnInbox better. Please join our Discord community to get the latest updates and to provide feedback. Join at [app.uninbox.com](https://app.uninbox.com).

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

- [Next JS](https://nextjs.org/) Vue based FrontEnd & Backend + modules
- [Hono](https://hono.dev/) Public API + Misc tooling
- [Tailwind](https://tailwindcss.com/) CSS Engine
- [tRPC](https://trpc.io/) Typesafe APIs
- [DrizzleORM](https://orm.drizzle.team/) ORM + MySQL

## Running Locally

To get a local copy up and running, follow these simple steps.

### Prerequisites

Here is what you need to be able to run UnInbox locally.

- Node.js (Version: >=20.x)
- NVM (Node Version Manager) (see https://github.com/nvm-sh/nvm)
- Docker
- pnpm (Version >= 9.x) (see https://pnpm.io/installation)

### Setup

1. Clone the repo into a public GitHub repository (or fork https://github.com/un/inbox/fork). If you plan to distribute the code, keep the source code public to comply with [AGPLv3](https://github.com/un/inbox/blob/main/LICENSE). To clone in a private repository, contact us to acquire a commercial license

   ```sh
   git clone https://github.com/un/inbox.git
   ```

   > If you are on Windows, run the following command on `gitbash` with admin privileges: <br> > `git clone -c core.symlinks=true https://github.com/un/inbox.git` <br>
   > See [docs](https://cal.com/docs/how-to-guides/how-to-troubleshoot-symbolic-link-issues-on-windows#enable-symbolic-links) for more details.

2. Go to the project folder

   ```sh
   cd UnInbox
   ```

3. Check and install the correct node/pnpm versions

   ```sh
   nvm install
   ```

4. Install packages with pnpm

   ```sh
   pnpm i
   ```

5. Set up your `.env.local` file

   - Duplicate `.env.local.example` to `.env.local`. This file is already pre-configured for use with the local docker containers

     mac

     ```sh
      cp .env.local.example .env.local
     ```

     windows

     ```sh
      copy .env.local.example .env.local
     ```

6. Start the docker containers

   ```sh
   pnpm run docker:up
   ```

7. Sync the schema with the database:

   ```sh
   pnpm run db:push
   ```

8. In another terminal window, start the app and all services

   ```sh
   pnpm run dev
   ```

## Self Hosting

Self hosting will be possible, but requires some additional manual configuration for email. Please check out Discord community for information on how to self-host UnInbox in production
