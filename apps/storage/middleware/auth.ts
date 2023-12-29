// import { AdapterSession } from "@auth/core/adapters";
import { defineEventHandler } from "h3";
// import type { UserContext } from "@uninbox/types";

export default defineEventHandler(async (event) => {
  const sessionCookie = getCookie(event, "un.session-token");
  if (!sessionCookie) {
    event.context.user = null;
    return;
  }
  const sessionStorage = useStorage("sessions");
  //const sessionObject: AdapterSession | null = await sessionStorage.getItem(
  const sessionObject: Object | null = await sessionStorage.getItem(
    sessionCookie
  );
  if (!sessionObject) {
    event.context.user = null;
    return;
  }
  //const userContext: UserContext = {
  const userContext = {
    //@ts-ignore
    id: +sessionObject.userIdNumber,
    session: sessionObject,
  };
  event.context.user = userContext;
});
