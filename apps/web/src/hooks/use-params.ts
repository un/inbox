import { useParams, useRouter } from 'next/navigation';
import { validateTypeId } from '@u22n/utils/typeid';
import { useCallback } from 'react';

export function useOrgShortcode() {
  const params = useParams();
  if (typeof params.orgShortcode !== 'string') {
    throw new Error('Tried calling `useOrgShortcode` outside scope of an org');
  }
  return params.orgShortcode;
}

/**
 * Hook to route within an org
 *
 * so if you want to go to `/[orgShortcode]/convo` you can do
 * ```ts
 * const { scopedNavigate } = useOrgScopedRouter();
 * scopedNavigate('/convo/new');
 * ```
 */
export function useOrgScopedRouter() {
  const orgShortcode = useOrgShortcode();
  const router = useRouter();

  const scopedNavigate = useCallback(
    (path: string) => router.push(`/${orgShortcode}${path}`),
    [orgShortcode, router]
  );

  const scopedRedirect = useCallback(
    (path: string) => router.replace(`/${orgShortcode}${path}`),
    [orgShortcode, router]
  );

  const scopedUrl = useCallback(
    (path: string) => `/${orgShortcode}${path}`,
    [orgShortcode]
  );

  return {
    scopedNavigate,
    scopedRedirect,
    scopedUrl
  };
}

export function useCurrentConvoId() {
  const params = useParams();
  if (validateTypeId('convos', params.convoId)) {
    return params.convoId;
  }
  return null;
}
