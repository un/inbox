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

export function useCurrentConvoId() {
  const params = useParams();
  if (validateTypeId('convos', params.convoId)) return params.convoId;
  return null;
}

// Sometimes we don't want to throw an error if the spaceShortcode is not present
export function useSpaceShortcode(throwIfNotDefined?: true): string;
export function useSpaceShortcode(throwIfNotDefined?: false): string | null;
export function useSpaceShortcode(throwIfNotDefined = true) {
  const params = useParams();
  if (throwIfNotDefined && typeof params.spaceShortcode !== 'string') {
    throw new Error(
      'Tried calling `useSpaceShortcode` outside scope of an space while throwIfNotDefined is true'
    );
  }
  return params.spaceShortcode ?? null;
}

/**
 * Hook to route within an org and space
 *
 * so if you want to go to `/[orgShortcode]/convo` you can do
 * ```ts
 * const { scopedNavigate } = useOrgScopedRouter();
 * scopedNavigate('/convo/new');
 * ```
 * and if you want to go to `/[orgShortcode]/[spaceShortcode]/convo` you can do
 * ```ts
 * const { scopedNavigate } = useOrgScopedRouter();
 * scopedNavigate('/convo/new', true);
 * ```
 */
export function useOrgScopedRouter() {
  const orgShortcode = useOrgShortcode();
  const spaceShortcode = useSpaceShortcode(false);
  const router = useRouter();

  const scopedNavigate = useCallback(
    (path: string, inSpace = false) =>
      router.push(
        inSpace && spaceShortcode
          ? `/${orgShortcode}/${spaceShortcode}${path}`
          : `/${orgShortcode}${path}`
      ),
    [orgShortcode, router, spaceShortcode]
  );

  const scopedRedirect = useCallback(
    (path: string, inSpace = false) =>
      router.replace(
        inSpace && spaceShortcode
          ? `/${orgShortcode}/${spaceShortcode}${path}`
          : `/${orgShortcode}${path}`
      ),
    [orgShortcode, router, spaceShortcode]
  );

  const scopedUrl = useCallback(
    (path: string, inSpace = false) =>
      inSpace && spaceShortcode
        ? `/${orgShortcode}/${spaceShortcode}${path}`
        : `/${orgShortcode}${path}`,
    [orgShortcode, spaceShortcode]
  );

  return {
    scopedNavigate,
    scopedRedirect,
    scopedUrl
  };
}
