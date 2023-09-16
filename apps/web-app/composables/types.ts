const { $trpc } = useNuxtApp();
type PromiseType<T> = T extends Promise<infer U> ? U : never;
export type UserConvosDataType = PromiseType<
  ReturnType<typeof $trpc.convos.getUserConvos.query>
>['data'];
