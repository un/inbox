/**
 * Auth.js can be integrated with _any_ data layer (database, ORM, or backend API, HTTP client)
 * in order to automatically create users, handle account linking automatically, support passwordless login,
 * and to store session information.
 *
 * This module contains utility functions and types to create an Auth.js compatible adapter.
 *
 * Auth.js supports 2 session strategies to persist the login state of a user.
 * The default is to use a cookie + {@link https://authjs.dev/concepts/session-strategies#jwt JWT}
 * based session store (`strategy: "jwt"`),
 * but you can also use a database adapter to store the session in a database.
 *
 * Before you continue, Auth.js has a list of {@link https://authjs.dev/reference/adapters/overview official database adapters}. If your database is listed there, you
 * probably do not need to create your own. If you are using a data solution that cannot be integrated with an official adapter, this module will help you create a compatible adapter.
 *
 * :::caution Note
 * Although `@auth/core` _is_ framework/runtime agnostic, an adapter might rely on a client/ORM package,
 * that is not yet compatible with your framework/runtime (e.g. it might rely on [Node.js APIs](https://nodejs.org/docs/latest/api)).
 * Related issues should be reported to the corresponding package maintainers.
 * :::
 *
 * ## Installation
 *
 * ```bash npm2yarn2pnpm
 * npm install @auth/core
 * ```
 *
 * Then, you can import this submodule from `@auth/core/adapters`.
 *
 * ## Usage
 *
 * Each adapter method and its function signature is documented in the {@link Adapter} interface.
 *
 * ```ts title=my-adapter.ts
 * import { type Adapter } from "@auth/core/adapters"
 *
 * // 1. Simplest form, a plain object.
 * export const MyAdapter: Adapter {
 *  // implement the adapter methods here
 * }
 *
 * // or
 *
 * // 2. A function that returns an object. Official adapters use this pattern.
 * export function MyAdapter(config: any): Adapter {
 *  // Instantiate a client/ORM here with the provided config, or pass it in as a parameter.
 *  // Usually, you might already have a client instance elsewhere in your application,
 *  // so you should only create a new instance if you need to or you don't have one.
 *
 *  return {
 *    // implement the adapter methods
 *  }
 * }
 *
 * ```
 *
 * Then, you can pass your adapter to Auth.js as the `adapter` option.
 *
 * ```ts title=index.ts
 * import { MyAdapter } from "./my-adapter"
 *
 * const response = await Auth(..., {
 *   adapter: MyAdapter, // 1.
 *   // or
 *   adapter: MyAdapter({ /* config *\/ }), // 2.
 *   ...
 * })
 * ```
 *
 * Note, you might be able to tweak an existing adapter to work with your data layer, instead of creating one from scratch.
 *
 * ```ts title=my-adapter.ts
 * import { type Adapter } from "@auth/core/adapters"
 * import { PrismaAdapter } from "@auth/prisma-adapter"
 * import { PrismaClient } from "@prisma/client"
 *
 * const prisma = new PrismaClient()
 *
 * const adapter: Adapter = {
 *   ...PrismaAdapter(prisma),
 *   // Add your custom methods here
 * }
 *
 * const request = new Request("https://example.com")
 * const response = await Auth(request, { adapter, ... })
 * ```
 *
 * ## Testing
 *
 * There is a test suite [available](https://github.com/nextauthjs/next-auth/tree/main/packages/adapter-test)
 * to ensure that your adapter is compatible with Auth.js.
 *
 * ## Known issues
 *
 * The following are missing built-in features in Auth.js but can be solved in user land. If you would like to help implement these features, please reach out.
 *
 * ### Token rotation
 *
 * Auth.js _currently_ does not support {@link https://authjs.dev/concepts/oauth#token-rotation `access_token` rotation} out of the box.
 * The necessary information (`refresh_token`, expiry, etc.) is being stored in the database, but the logic to rotate the token is not implemented
 * in the core library.
 * [This guide](https://authjs.dev/guides/basics/refresh-token-rotation#database-strategy) should provide the necessary steps to do this in user land.
 *
 * ### Federated logout
 *
 * Auth.js _currently_ does not support {@link https://authjs.dev/concepts/oauth#federated-logout federated logout} out of the box.
 * This means that even if an active session is deleted from the database, the user will still be signed in to the identity provider,
 * they will only be signed out of the application.
 * Eg. if you use Google as an identity provider, and you delete the session from the database,
 * the user will still be signed in to Google, but they will be signed out of your application.
 *
 * If your users might be using the application from a publicly shared computer (eg: library), you might want to implement federated logout.
 * {@link https://authjs.dev/guides/providers/federated-logout This guide} should provide the necessary steps.
 *
 * @module adapters
 */
export {};
