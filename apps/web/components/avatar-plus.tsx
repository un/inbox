'use client';

import { generateAvatarUrl, getInitials } from '@/lib/utils';
import {
  Avatar,
  Badge,
  Popover,
  Tooltip,
  type AvatarProps
} from '@radix-ui/themes';
import { type TypeId } from '@u22n/utils';

type AvatarPlusProps = {
  size: AvatarProps['size'];
  imageSize:
    | '3xs'
    | '2xs'
    | 'xs'
    | 'sm'
    | 'md'
    | 'lg'
    | 'xl'
    | '2xl'
    | '3xl'
    | '4xl'
    | '5xl';
  users: {
    avatarProfilePublicId: TypeId<'orgMemberProfile' | 'teams' | 'contacts'>;
    avatarTimestamp: Date | null;
    name: string;
  }[];
};

export default function AvatarPlus({
  imageSize,
  size,
  users
}: AvatarPlusProps) {
  const [primary, ...rest] = users;
  if (!primary) {
    return null;
  }
  return (
    <div className="relative h-fit w-fit">
      <Tooltip
        content={primary.name}
        side="bottom">
        <button>
          <Avatar
            size={size}
            fallback={getInitials(primary.name)}
            src={
              generateAvatarUrl({
                publicId: primary.avatarProfilePublicId,
                avatarTimestamp: primary.avatarTimestamp,
                size: imageSize
              }) ?? undefined
            }
            radius="full"
          />
        </button>
      </Tooltip>
      <Popover.Root>
        <Popover.Trigger>
          <button>
            <Badge
              variant="solid"
              color="gray"
              radius="full"
              className="absolute bottom-[-6px] right-[-4px] font-bold">
              {`+${rest.length}`}
            </Badge>
          </button>
        </Popover.Trigger>
        <Popover.Content>
          <div className="flex gap-2 p-2">
            {rest.map((user) => (
              <Tooltip
                content={user.name}
                side="bottom"
                key={user.avatarProfilePublicId}>
                <button>
                  <Avatar
                    size={size}
                    fallback={getInitials(user.name)}
                    src={
                      generateAvatarUrl({
                        publicId: user.avatarProfilePublicId,
                        avatarTimestamp: user.avatarTimestamp,
                        size: imageSize
                      }) ?? undefined
                    }
                    radius="full"
                  />
                </button>
              </Tooltip>
            ))}
          </div>
        </Popover.Content>
      </Popover.Root>
    </div>
  );
}
