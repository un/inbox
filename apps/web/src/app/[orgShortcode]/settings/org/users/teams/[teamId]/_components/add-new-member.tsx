import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/src/components/shadcn-ui/select';
import { useGlobalStore } from '@/src/providers/global-store-provider';
import { Button } from '@/src/components/shadcn-ui/button';
import { type TypeId } from '@u22n/utils/typeid';
import { platform } from '@/src/lib/trpc';
import { useState } from 'react';
import { toast } from 'sonner';

type Props = {
  teamId: TypeId<'teams'>;
  existingMembers: TypeId<'orgMembers'>[];
  complete: () => Promise<void>;
};

export function AddNewMember({ teamId, existingMembers, complete }: Props) {
  const orgShortcode = useGlobalStore((state) => state.currentOrg.shortcode);
  const { data: allMembers, isLoading } =
    platform.org.users.members.getOrgMembers.useQuery({
      orgShortcode
    });
  const { mutateAsync: addNewMember, isPending: isAdding } =
    platform.org.users.teams.addOrgMemberToTeam.useMutation({
      onError: (error) => {
        toast.error(error.message);
      }
    });
  const [selectedMember, setSelectedMember] = useState('');

  return isLoading ? (
    <div className="font-bold">Loading...</div>
  ) : (
    <div className="flex w-fit flex-col gap-2">
      <div className="font-bold">Add a new Member</div>
      <Select
        value={selectedMember}
        onValueChange={setSelectedMember}>
        <SelectTrigger>
          <SelectValue placeholder="Select a Member" />
        </SelectTrigger>
        <SelectContent>
          {allMembers?.members
            ?.filter((m) => !existingMembers.includes(m.publicId))
            .map((m) => (
              <SelectItem
                key={m.publicId}
                value={m.publicId}>
                {`${m.profile.firstName} ${m.profile.lastName}`}
              </SelectItem>
            ))}
        </SelectContent>
      </Select>
      <Button
        className="w-fit"
        disabled={!selectedMember || isAdding}
        // loading={isAdding}
        onClick={async () => {
          await addNewMember({
            orgShortcode,
            teamPublicId: teamId,
            orgMemberPublicId: selectedMember
          });
          await complete();
        }}>
        {isAdding ? 'Adding...' : 'Add Member'}
      </Button>
    </div>
  );
}
