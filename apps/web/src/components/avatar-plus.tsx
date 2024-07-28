'use client';
import {
  HoverCard,
  HoverCardContent,
  HoverCardPortal,
  HoverCardTrigger
} from './shadcn-ui/hover-card';
import { Avatar, type AvatarProps } from './avatar';
import { type TypeId } from '@u22n/utils/typeid';

type AvatarPlusProps = {
  size: AvatarProps['size'];
  users: {
    avatarProfilePublicId: TypeId<'orgMemberProfile' | 'teams' | 'contacts'>;
    avatarTimestamp: Date | null;
    name: string;
    color?: AvatarProps['color'];
  }[];
};

export default function AvatarPlus({ size, users }: AvatarPlusProps) {
  const [primary, ...rest] = users;
  if (!primary) {
    return null;
  }
  return (
    <div className="relative h-fit w-fit scale-100 overflow-visible">
      <HoverCard>
        <HoverCardTrigger asChild>
          <div>
            <Avatar
              avatarProfilePublicId={primary.avatarProfilePublicId}
              avatarTimestamp={primary.avatarTimestamp}
              name={primary.name}
              size={size}
              hideTooltip={true}
            />

            <div className="bg-accent-3 text-accent-8 fixed bottom-[-4px] right-[-4px] flex h-3 w-3 items-center justify-center rounded-sm p-1 text-[10px] font-semibold">
              <span className="leading-none">{`${rest.length}`}</span>
            </div>
          </div>
        </HoverCardTrigger>
        <HoverCardPortal>
          <HoverCardContent
            className="absolute"
            side="right">
            <div className="flex gap-2">
              {rest.map((user) => (
                <Avatar
                  key={user.avatarProfilePublicId}
                  avatarProfilePublicId={user.avatarProfilePublicId}
                  avatarTimestamp={user.avatarTimestamp}
                  name={user.name}
                  size={'lg'}
                />
              ))}
            </div>
          </HoverCardContent>
        </HoverCardPortal>
      </HoverCard>
    </div>
  );
}
