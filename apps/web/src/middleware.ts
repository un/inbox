import {
  isAuthenticated,
  getAuthRedirection
} from '@/src/lib/middleware-utils';
import { type NextRequest, NextResponse } from 'next/server';

// Known public routes, add more as needed
const publicRoutes = [
  '/',
  '/join',
  '/join/secure',
  '/recovery',
  '/recovery/verify-email'
];
const publicDynamicRoutes = ['/join/invite'];

export default async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const isPublicRoute =
    publicRoutes.includes(path) ||
    Boolean(publicDynamicRoutes.find((e) => path.startsWith(e)));

  // Redirect if already logged in on login page
  if (['/', '/join', '/join/secure'].includes(path)) {
    if (await isAuthenticated()) {
      const redirectTo = req.nextUrl.searchParams.get('redirect_to');
      if (redirectTo) {
        return NextResponse.redirect(new URL(redirectTo, req.nextUrl));
      }
      const redirectData = await getAuthRedirection().catch(() => null);
      if (redirectData) {
        return NextResponse.redirect(
          new URL(redirectData.defaultOrgShortcode ?? '/join/org', req.nextUrl)
        );
      }
    } else {
      // remove invalid session cookie
      const res = NextResponse.next();
      // eslint-disable-next-line drizzle/enforce-delete-with-where
      res.cookies.delete('un-session');
      return res;
    }
  }

  // Perform a shallow cookie check to see if the user is authenticated
  if (!isPublicRoute && !(await isAuthenticated(true))) {
    return NextResponse.redirect(new URL('/', req.nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  // Don't run middleware for the following paths
  matcher: ['/((?!api|_next/static|_next/image|.*\\.png$|favicon\\.ico).*)']
};
