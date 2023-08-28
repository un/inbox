// import { useAuthSession } from './../session';

declare module 'h3' {
  interface H3EventContext {
    // useSession: typeof useAuthSession;
  }
}

export default eventHandler((event) => {
  //event.context.useSession = useAuthSession;
});
