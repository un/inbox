import { isAuthenticated, getAuthRedirection } from '@/lib/middleware-utils';
import { redirect } from '@remix-run/react';

// Known public routes, add more as needed
const publicRoutes = [
  '/',
  '/join',
  '/join/secure',
  '/recovery/reset-password/request',
  '/recovery/reset-password/reset',
  '/recovery/reset-password/verify'
];
const publicDynamicRoutes = ['/join/invite'];

export async function middleware<T>(req: Request, next: () => T) {
  const url = new URL(req.url);
  const path = url.pathname;

  const isPublicRoute =
    publicRoutes.includes(path) ||
    publicDynamicRoutes.some((e) => path.startsWith(e));

  // Redirect if already logged in on login page
  if (['/', '/join', '/join/secure'].includes(path)) {
    if (await isAuthenticated(req)) {
      const redirectTo = url.searchParams.get('redirect_to');
      if (redirectTo) {
        return redirect(new URL(redirectTo, url).toString());
      }
      const redirectData = await getAuthRedirection(req).catch(() => null);
      if (redirectData) {
        return redirect(
          new URL(
            redirectData.defaultOrgShortcode ?? '/join/org',
            url
          ).toString()
        );
      }
    } else {
      return next();
    }
  }

  // Perform a shallow cookie check to see if the user is authenticated
  if (!isPublicRoute && !(await isAuthenticated(req, true))) {
    return redirect(new URL('/', req.url).toString());
  }

  return next();
}
