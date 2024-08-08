export const spaceTypeArray = ['open', 'private'] as const;
export type SpaceType = (typeof spaceTypeArray)[number];

export const spaceMemberRoleArray = ['member', 'admin'] as const;
export type SpaceMemberRole = (typeof spaceMemberRoleArray)[number];

export const spaceMemberNotificationArray = ['active', 'muted', 'off'] as const;
export type SpaceMemberNotification =
  (typeof spaceMemberNotificationArray)[number];

export const spaceStatusArray = ['open', 'active', 'closed'] as const;
export type SpaceStatus = (typeof spaceStatusArray)[number];
