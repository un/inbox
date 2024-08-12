'use client';

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectLabel,
  SelectSeparator
} from '@/src/components/shadcn-ui/select';
import {
  ArrowLeft,
  Check,
  Circle,
  DotsThree,
  Globe,
  Pencil,
  Plus,
  SquaresFour,
  TagChevron,
  UsersThree
} from '@phosphor-icons/react';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/src/components/shadcn-ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/src/components/shadcn-ui/dropdown-menu';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage
} from '@/src/components/shadcn-ui/form';
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/src/components/shadcn-ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@/src/components/shadcn-ui/tooltip';
import { useGlobalStore } from '@/src/providers/global-store-provider';
import { type SpaceStatus, type SpaceType } from '@u22n/utils/spaces';
import { typeIdValidator, type TypeId } from '@u22n/utils/typeid';
import { SettingsTitle } from './_components/settingsTitle';
import { type UiColor, uiColors } from '@u22n/utils/colors';
import { Button } from '@/src/components/shadcn-ui/button';
import { Switch } from '@/src/components/shadcn-ui/switch';
import { CopyButton } from '@/src/components/copy-button';
import { Input } from '@/src/components/shadcn-ui/input';
import { Badge } from '@/src/components/shadcn-ui/badge';
import { PopoverAnchor } from '@radix-ui/react-popover';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo, useState } from 'react';
import { useDebouncedCallback } from 'use-debounce';
import { useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { platform } from '@/src/lib/trpc';
import { cn } from '@/src/lib/utils';
import Link from 'next/link';
import { z } from 'zod';

export default function ShorcodeTestPage() {
  const orgShortcode = useGlobalStore((state) => state.currentOrg.shortcode);
  const spaceShortcode = useParams().spaceShortCode as string;

  const [showSaved, setShowSaved] = useState(false);

  const { data: spaceSettings, isLoading } =
    platform.spaces.settings.getSpacesSettings.useQuery({
      orgShortcode: orgShortcode,
      spaceShortcode: spaceShortcode
    });

  const isSpaceAdmin = useMemo(() => {
    return spaceSettings?.role === 'admin';
  }, [spaceSettings?.role]);

  useEffect(() => {
    if (!showSaved) return;
    setTimeout(() => {
      setShowSaved(false);
    }, 2500);
  }, [showSaved]);

  return (
    <div className="flex w-full flex-col items-center overflow-y-auto">
      <div className="flex max-w-screen-sm flex-col gap-8 p-4">
        {isLoading ? (
          <div>Loading...</div>
        ) : !spaceSettings?.settings ? (
          <div>Space Not Found</div>
        ) : (
          <div className="flex w-full flex-col gap-8 p-0">
            <div className="border-base-5 flex w-full flex-row items-center justify-between gap-4 border-b pb-2">
              <div className="flex w-full flex-row items-center justify-between gap-4">
                <div className="flex w-full flex-row items-center gap-4">
                  <div>
                    <Button
                      asChild
                      size="icon-sm"
                      variant="outline">
                      <Link href="./convos">
                        <ArrowLeft className="size-4" />
                      </Link>
                    </Button>
                  </div>

                  <div className="flex flex-col gap-1">
                    <NameField
                      orgShortcode={orgShortcode}
                      spaceShortcode={spaceShortcode}
                      initialValue={spaceSettings?.settings?.name}
                      showSaved={setShowSaved}
                      isSpaceAdmin={isSpaceAdmin}
                    />

                    <DescriptionField
                      orgShortcode={orgShortcode}
                      spaceShortcode={spaceShortcode}
                      initialValue={spaceSettings?.settings?.description ?? ''}
                      showSaved={setShowSaved}
                      isSpaceAdmin={isSpaceAdmin}
                    />
                  </div>
                </div>
              </div>
              {showSaved && (
                <div className="flex flex-row items-center gap-2">
                  <span className="text-base-11 text-sm">Saved</span>
                  <Check className="text-jade-9 size-3" />
                </div>
              )}
            </div>
            {!isSpaceAdmin && (
              <div className="flex w-full flex-row items-center gap-1">
                <span className="text-red-11 w-fit text-[10px] uppercase">
                  Only admins of this space can edit settings
                </span>
              </div>
            )}
            <div className="flex w-full flex-row items-center gap-4">
              <div className="flex flex-col gap-2">
                <SettingsTitle title="Space ID" />
                <div className="flex w-full flex-row items-center gap-2">
                  <span className="text-base-12 w-fit text-sm">
                    {spaceSettings?.settings?.publicId}
                  </span>
                  <CopyButton text={spaceSettings?.settings?.publicId ?? ''} />
                </div>
              </div>
            </div>
            <ColorField
              orgShortcode={orgShortcode}
              spaceShortcode={spaceShortcode}
              initialValue={spaceSettings?.settings?.color}
              showSaved={setShowSaved}
              isSpaceAdmin={isSpaceAdmin}
            />
            <VisibilityField
              orgShortcode={orgShortcode}
              spaceShortcode={spaceShortcode}
              initialValue={spaceSettings?.settings?.type}
              showSaved={setShowSaved}
              isSpaceAdmin={isSpaceAdmin}
            />
            <Statuses
              orgShortcode={orgShortcode}
              spaceShortcode={spaceShortcode}
              showSaved={setShowSaved}
              isSpaceAdmin={isSpaceAdmin}
            />
            <Tags
              orgShortcode={orgShortcode}
              spaceShortcode={spaceShortcode}
              isSpaceAdmin={isSpaceAdmin}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function NameField({
  orgShortcode,
  spaceShortcode,
  initialValue,
  showSaved,
  isSpaceAdmin
}: {
  orgShortcode: string;
  spaceShortcode: string;
  initialValue: string;
  isSpaceAdmin: boolean;
  showSaved: (value: boolean) => void;
}) {
  const { mutateAsync: setSpaceName, isSuccess: setSpaceNameSuccess } =
    platform.spaces.settings.setSpaceName.useMutation();
  const [editName, setEditName] = useState(initialValue);
  const [showEditNameField, setShowEditNameField] = useState(false);
  const orgMemberSpacesQueryCache =
    platform.useUtils().spaces.getOrgMemberSpaces;

  const debouncedInput = useDebouncedCallback(
    async (value) => {
      if (value === initialValue && !setSpaceNameSuccess) return;
      const parsed = z
        .string()
        .min(1)
        .max(64)
        .safeParse(value as string);
      if (!parsed.success) {
        return {
          error: parsed.error.issues[0]?.message ?? null,
          success: false
        };
      }
      await setSpaceName({
        orgShortcode: orgShortcode,
        spaceShortcode: spaceShortcode,
        spaceName: editName
      });
      showSaved(true);
      await orgMemberSpacesQueryCache.invalidate();
    },
    // delay in ms
    1000
  );

  useEffect(() => {
    if (typeof editName === 'undefined') return;
    void debouncedInput(editName);
  }, [editName, debouncedInput]);

  return (
    <>
      {showEditNameField ? (
        <div className="flex w-full flex-row items-center gap-2">
          <Input
            label="Space Name"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
          />
        </div>
      ) : (
        <div className="flex flex-row items-center gap-2">
          <span className="font-display text-lg">{initialValue}</span>
          <Button
            variant={'ghost'}
            size={'icon-sm'}
            disabled={!isSpaceAdmin}
            onClick={() => {
              setShowEditNameField(true);
            }}>
            <Pencil className="size-4" />
          </Button>
        </div>
      )}
    </>
  );
}

function DescriptionField({
  orgShortcode,
  spaceShortcode,
  initialValue,
  showSaved,
  isSpaceAdmin
}: {
  orgShortcode: string;
  spaceShortcode: string;
  initialValue: string;
  isSpaceAdmin: boolean;
  showSaved: (value: boolean) => void;
}) {
  const {
    mutateAsync: setSpaceDescription,
    isSuccess: setSpaceDescriptionSuccess
  } = platform.spaces.settings.setSpaceDescription.useMutation();
  const [editDescription, setEditDescription] = useState(initialValue);
  const [showEditDescriptionField, setShowEditDescriptionField] =
    useState(false);
  const orgMemberSpacesQueryCache =
    platform.useUtils().spaces.getOrgMemberSpaces;

  const debouncedInput = useDebouncedCallback(
    async (value) => {
      if (value === initialValue && !setSpaceDescriptionSuccess) return;
      const parsed = z
        .string()
        .min(1)
        .max(64)
        .safeParse(value as string);
      if (!parsed.success) {
        return {
          error: parsed.error.issues[0]?.message ?? null,
          success: false
        };
      }
      await setSpaceDescription({
        orgShortcode: orgShortcode,
        spaceShortcode: spaceShortcode,
        spaceDescription: editDescription
      });
      showSaved(true);
      await orgMemberSpacesQueryCache.invalidate();
    },
    // delay in ms
    1000
  );

  useEffect(() => {
    if (typeof editDescription === 'undefined') return;
    void debouncedInput(editDescription);
  }, [editDescription, debouncedInput]);

  return (
    <>
      {showEditDescriptionField ? (
        <div className="flex w-full flex-row items-center gap-2">
          <Input
            label="Space Name"
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
          />
        </div>
      ) : (
        <div className="flex flex-row items-center gap-2">
          <span className="">{initialValue}</span>
          <Button
            variant={'ghost'}
            size={'icon-sm'}
            disabled={!isSpaceAdmin}
            onClick={() => {
              setShowEditDescriptionField(true);
            }}>
            <Pencil className="size-4" />
          </Button>
        </div>
      )}
    </>
  );
}

function ColorField({
  orgShortcode,
  spaceShortcode,
  initialValue,
  showSaved,
  isSpaceAdmin
}: {
  orgShortcode: string;
  spaceShortcode: string;
  initialValue: string;
  isSpaceAdmin: boolean;
  showSaved: (value: boolean) => void;
}) {
  const { mutateAsync: setSpaceColor } =
    platform.spaces.settings.setSpaceColor.useMutation();
  const [activeColor, setActiveColor] = useState(initialValue);

  const orgMemberSpacesQueryCache =
    platform.useUtils().spaces.getOrgMemberSpaces;

  async function handleSpaceColor(value: UiColor) {
    await setSpaceColor({
      orgShortcode: orgShortcode,
      spaceShortcode: spaceShortcode,
      spaceColor: value
    });
    setActiveColor(value);
    showSaved(true);
    await orgMemberSpacesQueryCache.invalidate();
  }

  return (
    <div className="flex flex-col gap-2">
      <SettingsTitle title="Color" />
      <div
        className="grid w-fit grid-cols-10 gap-3"
        style={{ padding: '0px' }}>
        {uiColors.map((color) => (
          <div
            key={color}
            className={cn(
              'flex size-8 min-h-8 min-w-8 items-center justify-center rounded-sm',
              activeColor === color ? `ring-base-9 ring-1 ring-offset-2` : '',
              isSpaceAdmin ? 'cursor-pointer' : 'cursor-not-allowed'
            )}
            style={{
              backgroundColor: `var(--${color}4)`
            }}
            onClick={async () => {
              isSpaceAdmin && (await handleSpaceColor(color));
            }}>
            {activeColor === color ? (
              <Check
                className={'size-5'}
                weight="regular"
                style={{
                  color: `var(--${color}9)`
                }}
              />
            ) : (
              <SquaresFour
                className={'size-5'}
                weight="regular"
                style={{
                  color: `var(--${color}9)`
                }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function VisibilityField({
  orgShortcode,
  spaceShortcode,
  initialValue,
  showSaved,
  isSpaceAdmin
}: {
  orgShortcode: string;
  spaceShortcode: string;
  initialValue: string;
  isSpaceAdmin: boolean;
  showSaved: (value: boolean) => void;
}) {
  const { data: canAddSpace } = platform.org.iCanHaz.space.useQuery(
    {
      orgShortcode: orgShortcode
    },
    {
      staleTime: 1000
    }
  );

  const { mutateAsync: setSpaceType } =
    platform.spaces.settings.setSpaceType.useMutation();
  const [activeType, setActiveType] = useState(initialValue);

  const orgMemberSpacesQueryCache =
    platform.useUtils().spaces.getOrgMemberSpaces;

  async function handleSpaceType(value: SpaceType) {
    await setSpaceType({
      orgShortcode: orgShortcode,
      spaceShortcode: spaceShortcode,
      spaceType: value
    });
    setActiveType(value);
    showSaved(true);
    await orgMemberSpacesQueryCache.invalidate();
  }

  return (
    <>
      <Select
        onValueChange={(value) => handleSpaceType(value as SpaceType)}
        disabled={!isSpaceAdmin}
        value={activeType}>
        <div className="flex flex-col gap-2">
          <SettingsTitle title="Visibility" />
          <SelectTrigger className="h-18">
            <SelectValue placeholder="Select a Space Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem
              value="open"
              className="hover:bg-base-3 w-full rounded-sm">
              <div className="flex flex-row items-center justify-start gap-4 rounded-md p-1">
                <Globe className="h-6 w-6" />
                <div className="flex grow flex-col justify-start gap-2 text-left">
                  <span className="font-semibold">Open</span>
                  <span className="text-base-11 text-balance text-xs">
                    Everyone can see this Space, read messages and post comments
                  </span>
                </div>
              </div>
            </SelectItem>
            {canAddSpace?.private ? (
              <SelectItem
                value="private"
                className="hover:bg-base-3 w-full rounded-sm">
                <div className="flex flex-row items-center justify-start gap-4 rounded-md p-1">
                  <UsersThree className="h-6 w-6" />
                  <div className="flex grow flex-col justify-start gap-2 text-left">
                    <span className="font-semibold">Private</span>
                    <span className="text-base-11 text-balance text-xs">
                      Only specific people can see and interact with this space
                    </span>
                  </div>
                </div>
              </SelectItem>
            ) : (
              <Tooltip>
                <TooltipTrigger>
                  <SelectItem
                    disabled
                    value="private"
                    className="hover:bg-base-3 w-full rounded-sm">
                    <div className="flex flex-row items-center justify-start gap-4 rounded-md p-1">
                      <UsersThree className="h-6 w-6" />
                      <div className="flex grow flex-col justify-start gap-2 text-left">
                        <div className="flex flex-row items-center gap-2">
                          <span className="font-semibold">Private</span>
                          <span className="text-base-1 bg-base-12 rounded-sm px-1.5 py-0.5 text-xs">
                            Pro plan
                          </span>
                        </div>
                        <span className="text-base-11 text-xs">
                          Only specific people can see and interact with this
                          space
                        </span>
                      </div>
                    </div>
                  </SelectItem>
                </TooltipTrigger>
                <TooltipContent>
                  <span>
                    Upgrade to <span className="font-semibold">Pro</span> plan
                    to enable this feature
                  </span>
                </TooltipContent>
              </Tooltip>
            )}
          </SelectContent>
        </div>
      </Select>
    </>
  );
}

function Statuses({
  orgShortcode,
  spaceShortcode,
  showSaved,
  isSpaceAdmin
}: {
  orgShortcode: string;
  spaceShortcode: string;
  isSpaceAdmin: boolean;
  showSaved: (value: boolean) => void;
}) {
  const { data: spaceStatuses, isLoading: statusLoading } =
    platform.spaces.statuses.getSpacesStatuses.useQuery({
      orgShortcode: orgShortcode,
      spaceShortcode: spaceShortcode
    });

  const { data: canIHazStatuses } = platform.org.iCanHaz.spaceStatus.useQuery({
    orgShortcode: orgShortcode
  });

  const hasStatusesConfigured = useMemo(() => {
    return (
      !!spaceStatuses?.open?.length ||
      !!spaceStatuses?.active?.length ||
      !!spaceStatuses?.closed?.length
    );
  }, [spaceStatuses]);

  const [useStatuses, setUseStatuses] = useState<boolean>(
    hasStatusesConfigured
  );

  const canAddOpenStatus = useMemo(() => {
    if (!canIHazStatuses) return false;
    return (canIHazStatuses.open ?? 0) > (spaceStatuses?.open?.length ?? 0);
  }, [canIHazStatuses, spaceStatuses]);

  const [showNewOpenStatus, setShowNewOpenStatus] = useState(false);
  useEffect(() => {
    if (showNewOpenStatus) return;
    showSaved(true);
    setShowNewOpenStatus(false);
  }, [showNewOpenStatus, showSaved]);

  const canAddActiveStatus = useMemo(() => {
    if (!canIHazStatuses) return false;
    return (canIHazStatuses.active ?? 0) > (spaceStatuses?.active?.length ?? 0);
  }, [canIHazStatuses, spaceStatuses]);

  const [showNewActiveStatus, setShowNewActiveStatus] = useState(false);
  useEffect(() => {
    if (showNewActiveStatus) return;
    showSaved(true);
    setShowNewActiveStatus(false);
  }, [showNewActiveStatus, showSaved]);

  const canAddClosedStatus = useMemo(() => {
    if (!canIHazStatuses) return false;
    return (canIHazStatuses.closed ?? 0) > (spaceStatuses?.closed?.length ?? 0);
  }, [canIHazStatuses, spaceStatuses]);

  const [showNewClosedStatus, setShowNewClosedStatus] = useState(false);
  useEffect(() => {
    if (showNewClosedStatus) return;
    showSaved(true);
    setShowNewClosedStatus(false);
  }, [showNewClosedStatus, showSaved]);

  const [subShowSaved, setSubShowSaved] = useState(false);
  useEffect(() => {
    if (!subShowSaved) return;
    showSaved(true);
    setTimeout(() => {
      setSubShowSaved(false);
    }, 2500);
  }, [subShowSaved, showSaved]);

  return (
    <div className="flex w-full flex-col gap-2">
      <SettingsTitle title="Statuses" />
      {statusLoading ? (
        <div>
          <span>Loading Statuses...</span>
        </div>
      ) : !useStatuses && !hasStatusesConfigured ? (
        <div className="flex w-full flex-row items-center justify-between gap-8">
          <span>Enable Statuses</span>
          <Switch onClick={() => setUseStatuses(true)} />
        </div>
      ) : (
        <div className="bg-base-2 border-base-5 flex flex-col gap-2 rounded-md border p-4">
          <div className="flex flex-col gap-2">
            <div className="bg-base-3 flex w-full flex-row justify-between gap-2 rounded-md p-4">
              <span className="text-base-11 text-sm font-semibold">Open</span>
              {isSpaceAdmin &&
                (canAddOpenStatus ? (
                  <Button
                    variant={'ghost'}
                    size={'icon-sm'}
                    onClick={() => setShowNewOpenStatus(true)}>
                    <Plus />
                  </Button>
                ) : (
                  <Tooltip>
                    <TooltipTrigger>
                      <div className="flex flex-row items-center justify-start gap-4">
                        <span className="text-base-1 bg-base-12 rounded-sm px-1.5 py-0.5 text-xs">
                          Pro plan
                        </span>
                        <Button
                          variant={'ghost'}
                          size={'icon-sm'}
                          disabled>
                          <Plus />
                        </Button>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      Upgrade to <span className="font-semibold">Pro</span> plan
                      to add more statuses
                    </TooltipContent>
                  </Tooltip>
                ))}
            </div>
            <div className="dragdrop-area flex flex-col gap-6 p-4">
              {!spaceStatuses?.open?.length ? (
                <span>No Statuses</span>
              ) : (
                spaceStatuses?.open?.map((status) => (
                  <StatusItem
                    key={status.publicId}
                    status={status}
                    orgShortcode={orgShortcode}
                    spaceShortcode={spaceShortcode}
                    showSavedStatus={setSubShowSaved}
                    isAdmin={isSpaceAdmin}
                  />
                ))
              )}
              {showNewOpenStatus && (
                <NewSpaceStatus
                  orgShortcode={orgShortcode}
                  order={
                    spaceStatuses?.open?.length
                      ? spaceStatuses?.open?.length + 1
                      : 1
                  }
                  spaceShortcode={spaceShortcode}
                  type="open"
                  showNewStatusComponent={setShowNewOpenStatus}
                />
              )}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <div className="bg-base-3 flex w-full flex-row justify-between gap-2 rounded-md p-4">
              <span className="text-base-11 text-sm font-semibold">Active</span>
              {isSpaceAdmin &&
                (canAddActiveStatus ? (
                  <Button
                    variant={'ghost'}
                    size={'icon-sm'}
                    onClick={() => setShowNewActiveStatus(true)}>
                    <Plus />
                  </Button>
                ) : (
                  <Tooltip>
                    <TooltipTrigger>
                      <div className="flex flex-row items-center justify-start gap-4">
                        <span className="text-base-1 bg-base-12 rounded-sm px-1.5 py-0.5 text-xs">
                          Pro plan
                        </span>
                        <Button
                          variant={'ghost'}
                          size={'icon-sm'}
                          disabled>
                          <Plus />
                        </Button>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      Upgrade to <span className="font-semibold">Pro</span> plan
                      to add more statuses
                    </TooltipContent>
                  </Tooltip>
                ))}
            </div>
            <div className="dragdrop-area flex flex-col gap-6 p-4">
              {!spaceStatuses?.active?.length ? (
                <span>No Statuses</span>
              ) : (
                spaceStatuses?.active?.map((status) => (
                  <StatusItem
                    key={status.publicId}
                    status={status}
                    orgShortcode={orgShortcode}
                    spaceShortcode={spaceShortcode}
                    showSavedStatus={setSubShowSaved}
                    isAdmin={isSpaceAdmin}
                  />
                ))
              )}
              {showNewActiveStatus && (
                <NewSpaceStatus
                  orgShortcode={orgShortcode}
                  order={
                    spaceStatuses?.active?.length
                      ? spaceStatuses?.active?.length + 1
                      : 1
                  }
                  spaceShortcode={spaceShortcode}
                  type="active"
                  showNewStatusComponent={setShowNewActiveStatus}
                />
              )}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <div className="bg-base-3 flex w-full flex-row justify-between gap-2 rounded-md p-4">
              <span className="text-base-11 text-sm font-semibold">Closed</span>
              {isSpaceAdmin &&
                (canAddClosedStatus ? (
                  <Button
                    variant={'ghost'}
                    size={'icon-sm'}
                    onClick={() => setShowNewClosedStatus(true)}>
                    <Plus />
                  </Button>
                ) : (
                  <Tooltip>
                    <TooltipTrigger>
                      <div className="flex flex-row items-center justify-start gap-4">
                        <span className="text-base-1 bg-base-12 rounded-sm px-1.5 py-0.5 text-xs">
                          Pro plan
                        </span>
                        <Button
                          variant={'ghost'}
                          size={'icon-sm'}
                          disabled>
                          <Plus />
                        </Button>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      Upgrade to <span className="font-semibold">Pro</span> plan
                      to add more statuses
                    </TooltipContent>
                  </Tooltip>
                ))}
            </div>
            <div className="dragdrop-area flex flex-col gap-6 p-4">
              {!spaceStatuses?.closed?.length ? (
                <span>No Statuses</span>
              ) : (
                spaceStatuses?.closed?.map((status) => (
                  <StatusItem
                    key={status.publicId}
                    status={status}
                    orgShortcode={orgShortcode}
                    spaceShortcode={spaceShortcode}
                    showSavedStatus={setSubShowSaved}
                    isAdmin={isSpaceAdmin}
                  />
                ))
              )}
              {showNewClosedStatus && (
                <NewSpaceStatus
                  orgShortcode={orgShortcode}
                  order={
                    spaceStatuses?.closed?.length
                      ? spaceStatuses?.closed?.length + 1
                      : 1
                  }
                  spaceShortcode={spaceShortcode}
                  type="closed"
                  showNewStatusComponent={setShowNewClosedStatus}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusItem({
  orgShortcode,
  spaceShortcode,
  status,
  showSavedStatus,
  isAdmin
}: {
  orgShortcode: string;
  spaceShortcode: string;
  showSavedStatus: (value: boolean) => void;
  // TODO: make this type based on the return of the query
  status: {
    name: string;
    color: UiColor;
    description: string | null;
    publicId: TypeId<'spaceStatuses'>;
    icon: string;
    disabled: boolean;
    type: SpaceStatus;
    order: number;
  };
  isAdmin: boolean;
}) {
  const [editStatus, setEditStatus] = useState<boolean>(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState<boolean>(false);

  const { mutateAsync: editSpaceStatus, isPending } =
    platform.spaces.statuses.editSpaceStatus.useMutation();
  const { mutateAsync: disableSpaceStatus } =
    platform.spaces.statuses.disableSpaceStatus.useMutation();

  const orgMemberSpacesQueryCache =
    platform.useUtils().spaces.getOrgMemberSpaces;
  const spaceStatusQueryCache =
    platform.useUtils().spaces.statuses.getSpacesStatuses;

  const editSpaceStatusFormSchema = z.object({
    name: z.string().min(1).max(32),
    description: z.string().min(0).max(128).optional(),
    color: z.enum(uiColors)
  });

  const form = useForm<z.infer<typeof editSpaceStatusFormSchema>>({
    resolver: zodResolver(editSpaceStatusFormSchema),
    defaultValues: {
      name: status.name,
      description: status.description ?? '',
      color: status.color
    }
  });

  const handleSubmit = async (
    values: z.infer<typeof editSpaceStatusFormSchema>
  ) => {
    await editSpaceStatus({
      orgShortcode: orgShortcode,
      spaceShortcode: spaceShortcode,
      name: values.name,
      description: values.description,
      color: values.color,
      spaceStatusPublicId: status.publicId
    });

    showSavedStatus(true);
    setEditStatus(false);
    await orgMemberSpacesQueryCache.invalidate();
    await spaceStatusQueryCache.invalidate();
    form.reset();
  };

  const handleDisableStatus = async () => {
    await disableSpaceStatus({
      orgShortcode: orgShortcode,
      spaceShortcode: spaceShortcode,
      spaceStatusPublicId: status.publicId,
      disable: !status.disabled
    });

    showSavedStatus(true);
    setEditStatus(false);
    await orgMemberSpacesQueryCache.invalidate();
    await spaceStatusQueryCache.invalidate();
    form.reset();
  };
  return (
    <>
      {!editStatus ? (
        <div className="flex flex-row items-center justify-between gap-4 py-1.5">
          <div
            className={cn(
              'flex w-full flex-row items-center gap-7',
              status.disabled ? 'opacity-70' : null
            )}>
            <div
              className={
                'flex size-8 min-h-8 min-w-8 items-center justify-center rounded-sm'
              }
              style={{
                backgroundColor: `var(--${status.color}4)`
              }}>
              <Circle
                className={'size-5'}
                weight="regular"
                style={{
                  color: `var(--${status.color}9)`
                }}
              />
            </div>
            <div className="grid w-full grid-cols-8 place-items-center gap-2">
              <div className="col-span-3 w-full font-medium">
                <span>{status.name}</span>
              </div>
              <div className="text-base-11 col-span-5 w-full text-balance pl-2 text-xs">
                <span>{status.description ?? 'No description'}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-row items-center gap-4">
            {status.disabled && (
              <Badge variant={'outline'}>
                <span className="">Disabled</span>
              </Badge>
            )}
            {isAdmin && (
              <DropdownMenu>
                <DropdownMenuTrigger>
                  <Button
                    size="icon-sm"
                    variant="ghost">
                    <DotsThree />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem
                    onSelect={() => {
                      setEditStatus(true);
                    }}>
                    Edit Status
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => {
                      void handleDisableStatus();
                    }}>
                    {status.disabled ? 'Enable Status' : 'Disable Status'}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => {
                      void setDeleteModalOpen(true);
                    }}>
                    Delete Status
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            {deleteModalOpen && (
              <DeleteStatusModal
                orgShortcode={orgShortcode}
                spaceShortcode={spaceShortcode}
                key={status.publicId}
                statusToDelete={status}
              />
            )}
          </div>
        </div>
      ) : (
        <Form {...form}>
          <div className="flex-wrap-row flex flex-row items-center gap-4 py-0.5">
            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem className="w-fit">
                  <FormControl>
                    <Popover>
                      <PopoverTrigger asChild>
                        <div
                          className={
                            'flex size-8 min-h-8 min-w-8 items-center justify-center rounded-sm'
                          }
                          style={{
                            backgroundColor: `var(--${field.value}4)`
                          }}>
                          <Circle
                            className={'size-5'}
                            weight="regular"
                            style={{
                              color: `var(--${field.value}9)`
                            }}
                          />
                        </div>
                      </PopoverTrigger>
                      <PopoverContent className="w-fit">
                        <div
                          className="grid w-fit grid-cols-5 gap-3"
                          style={{ padding: '0px' }}>
                          {uiColors.map((color) => (
                            <div
                              key={color}
                              className={`flex size-8 min-h-8 min-w-8 cursor-pointer items-center justify-center rounded-sm ${field.value === color ? `ring-base-9 ring-1 ring-offset-2` : ''}`}
                              style={{
                                backgroundColor: `var(--${color}4)`
                              }}
                              onClick={() => field.onChange(color)}>
                              {field.value === color ? (
                                <Check
                                  className={'size-5'}
                                  weight="regular"
                                  style={{
                                    color: `var(--${color}9)`
                                  }}
                                />
                              ) : (
                                <Circle
                                  className={'size-5'}
                                  weight="regular"
                                  style={{
                                    color: `var(--${color}9)`
                                  }}
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="min-w-28 max-w-52">
                  <FormControl>
                    <Input
                      label="Name"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem className="min-w-32 max-w-80">
                  <FormControl>
                    <Input
                      label="Description"
                      fullWidth
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              loading={isPending}
              variant={'secondary'}
              size={'sm'}
              onClick={() => setEditStatus(false)}>
              Cancel
            </Button>
            <Button
              loading={isPending}
              size={'sm'}
              onClick={form.handleSubmit(handleSubmit)}>
              {isPending ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </Form>
      )}
    </>
  );
}

function NewSpaceStatus({
  orgShortcode,
  spaceShortcode,
  showNewStatusComponent,
  type,
  order
}: {
  orgShortcode: string;
  spaceShortcode: string;
  type: SpaceStatus;
  order: number;
  showNewStatusComponent: (value: boolean) => void;
}) {
  const { mutateAsync: addNewSpaceStatus, isPending } =
    platform.spaces.statuses.addNewSpaceStatus.useMutation();

  const orgMemberSpacesQueryCache =
    platform.useUtils().spaces.getOrgMemberSpaces;
  const spaceStatusQueryCache =
    platform.useUtils().spaces.statuses.getSpacesStatuses;

  const newSpaceStatusFormSchema = z.object({
    name: z.string().min(1).max(32),
    description: z.string().min(0).max(128).optional(),
    color: z.enum(uiColors)
  });

  const form = useForm<z.infer<typeof newSpaceStatusFormSchema>>({
    resolver: zodResolver(newSpaceStatusFormSchema),
    defaultValues: {
      name: '',
      description: '',
      color: uiColors[Math.floor(Math.random() * uiColors.length)]
    }
  });

  const handleSubmit = async (
    values: z.infer<typeof newSpaceStatusFormSchema>
  ) => {
    await addNewSpaceStatus({
      orgShortcode: orgShortcode,
      spaceShortcode: spaceShortcode,
      type: type,
      name: values.name,
      description: values.description,
      color: values.color,
      order: order
    });

    showNewStatusComponent(false);
    await orgMemberSpacesQueryCache.invalidate();
    await spaceStatusQueryCache.invalidate();
    form.reset();
  };

  return (
    <>
      <Form {...form}>
        <div className="flex-wrap-row flex flex-row items-center gap-4">
          <FormField
            control={form.control}
            name="color"
            render={({ field }) => (
              <FormItem className="w-fit">
                <FormControl>
                  <Popover>
                    <PopoverTrigger asChild>
                      <div
                        className={
                          'flex size-8 min-h-8 min-w-8 items-center justify-center rounded-sm'
                        }
                        style={{
                          backgroundColor: `var(--${field.value}4)`
                        }}>
                        <Circle
                          className={'size-5'}
                          weight="regular"
                          style={{
                            color: `var(--${field.value}9)`
                          }}
                        />
                      </div>
                    </PopoverTrigger>
                    <PopoverContent className="w-fit">
                      <div
                        className="grid w-fit grid-cols-5 gap-3"
                        style={{ padding: '0px' }}>
                        {uiColors.map((color) => (
                          <div
                            key={color}
                            className={`flex size-8 min-h-8 min-w-8 cursor-pointer items-center justify-center rounded-sm ${field.value === color ? `ring-base-9 ring-1 ring-offset-2` : ''}`}
                            style={{
                              backgroundColor: `var(--${color}4)`
                            }}
                            onClick={() => field.onChange(color)}>
                            {field.value === color ? (
                              <Check
                                className={'size-5'}
                                weight="regular"
                                style={{
                                  color: `var(--${color}9)`
                                }}
                              />
                            ) : (
                              <Circle
                                className={'size-5'}
                                weight="regular"
                                style={{
                                  color: `var(--${color}9)`
                                }}
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem className="m-0 min-w-28 max-w-52">
                <FormControl>
                  <Input
                    label="Name"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem className="my-1 min-w-32 max-w-80">
                <FormControl>
                  <Input
                    label="Description"
                    fullWidth
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button
            loading={isPending}
            variant={'secondary'}
            onClick={() => showNewStatusComponent(false)}>
            Cancel
          </Button>
          <Button
            loading={isPending}
            onClick={form.handleSubmit(handleSubmit)}>
            {isPending ? 'Creating...' : 'Create'}
          </Button>
        </div>
      </Form>
    </>
  );
}

export function DeleteStatusModal({
  orgShortcode,
  spaceShortcode,
  statusToDelete
}: {
  orgShortcode: string;
  spaceShortcode: string;
  statusToDelete: {
    name: string;
    color: UiColor;
    description: string | null;
    publicId: TypeId<'spaceStatuses'>;
    icon: string;
    disabled: boolean;
    type: SpaceStatus;
    order: number;
  };
}) {
  const { data: spaceStatuses } =
    platform.spaces.statuses.getSpacesStatuses.useQuery({
      orgShortcode: orgShortcode,
      spaceShortcode: spaceShortcode
    });

  const { mutateAsync: deleteSpaceStatus, isPending: isSubmitting } =
    platform.spaces.statuses.deleteSpaceStatus.useMutation();

  const orgMemberSpacesQueryCache =
    platform.useUtils().spaces.getOrgMemberSpaces;
  const spaceStatusQueryCache =
    platform.useUtils().spaces.statuses.getSpacesStatuses;

  const deleteSpaceStatusSchema = z.object({
    replacementSpaceStatusPublicId: typeIdValidator('spaceStatuses')
  });

  const form = useForm<z.infer<typeof deleteSpaceStatusSchema>>({
    resolver: zodResolver(deleteSpaceStatusSchema),
    defaultValues: {
      replacementSpaceStatusPublicId:
        spaceStatuses?.open.filter(
          (status) => status.publicId !== statusToDelete.publicId
        )[0]?.publicId ??
        spaceStatuses?.active.filter(
          (status) => status.publicId !== statusToDelete.publicId
        )[0]?.publicId ??
        spaceStatuses?.closed.filter(
          (status) => status.publicId !== statusToDelete.publicId
        )[0]?.publicId
    }
  });

  const handleSubmit = async (
    values: z.infer<typeof deleteSpaceStatusSchema>
  ) => {
    await deleteSpaceStatus({
      orgShortcode: orgShortcode,
      spaceShortcode: spaceShortcode,
      spaceStatusPublicId: statusToDelete.publicId,
      replacementSpaceStatusPublicId: values.replacementSpaceStatusPublicId
    });
    await orgMemberSpacesQueryCache.invalidate();
    await spaceStatusQueryCache.invalidate();
    form.reset();
  };

  return (
    <Dialog defaultOpen>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete {statusToDelete.name} Status?</DialogTitle>
          <DialogDescription>
            <span>
              Select a replacement for Conversations using this status.
            </span>
          </DialogDescription>
        </DialogHeader>
        <div className="my-2 flex flex-col gap-2">
          <Form {...form}>
            <div className="flex w-full gap-2">
              <FormField
                control={form.control}
                name="replacementSpaceStatusPublicId"
                render={({ field }) => (
                  <FormItem>
                    <Select
                      name={field.name}
                      value={field.value}
                      onValueChange={(e: 'member' | 'admin') =>
                        field.onChange(e)
                      }>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectGroup>
                          <SelectLabel>Open</SelectLabel>
                          {spaceStatuses?.open
                            .filter(
                              (status) =>
                                status.publicId !== statusToDelete.publicId
                            )
                            .map((status) => (
                              <SelectItem
                                key={status.publicId}
                                value={status.publicId}
                                className="hover:bg-base-5 w-full rounded-sm">
                                <div className="flex flex-row items-center gap-2">
                                  <div
                                    className="flex size-6 min-h-6 min-w-6 items-center justify-center rounded-sm"
                                    style={{
                                      backgroundColor: `var(--${status.color}4)`
                                    }}>
                                    <Circle
                                      className={'size-4'}
                                      weight="regular"
                                      style={{
                                        color: `var(--${status.color}9)`
                                      }}
                                    />
                                  </div>
                                  <span className="text-base-12 text-sm font-medium">
                                    {status.name}
                                  </span>
                                </div>
                              </SelectItem>
                            ))}
                        </SelectGroup>
                        <SelectSeparator />
                        <SelectGroup>
                          <SelectLabel>Active</SelectLabel>
                          {spaceStatuses?.active
                            .filter(
                              (status) =>
                                status.publicId !== statusToDelete.publicId
                            )
                            .map((status) => (
                              <SelectItem
                                key={status.publicId}
                                value={status.publicId}
                                className="hover:bg-base-5 w-full rounded-sm">
                                <div className="flex flex-row items-center gap-2">
                                  <div
                                    className="flex size-6 min-h-6 min-w-6 items-center justify-center rounded-sm"
                                    style={{
                                      backgroundColor: `var(--${status.color}4)`
                                    }}>
                                    <Circle
                                      className={'size-4'}
                                      weight="regular"
                                      style={{
                                        color: `var(--${status.color}9)`
                                      }}
                                    />
                                  </div>
                                  <span className="text-base-12 text-sm font-medium">
                                    {status.name}
                                  </span>
                                </div>
                              </SelectItem>
                            ))}
                        </SelectGroup>
                        <SelectSeparator />
                        <SelectGroup>
                          <SelectLabel>Closed</SelectLabel>
                          {spaceStatuses?.closed
                            .filter(
                              (status) =>
                                status.publicId !== statusToDelete.publicId
                            )
                            .map((status) => (
                              <SelectItem
                                key={status.publicId}
                                value={status.publicId}
                                className="hover:bg-base-5 w-full rounded-sm">
                                <div className="flex flex-row items-center gap-2">
                                  <div
                                    className="flex size-6 min-h-6 min-w-6 items-center justify-center rounded-sm"
                                    style={{
                                      backgroundColor: `var(--${status.color}4)`
                                    }}>
                                    <Circle
                                      className={'size-4'}
                                      weight="regular"
                                      style={{
                                        color: `var(--${status.color}9)`
                                      }}
                                    />
                                  </div>
                                  <span className="text-base-12 text-sm font-medium">
                                    {status.name}
                                  </span>
                                </div>
                              </SelectItem>
                            ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="mt-4 flex w-full flex-col gap-2">
              <div className="flex flex-wrap gap-2">
                <DialogClose asChild>
                  <Button
                    className="flex-1"
                    disabled={isSubmitting}
                    variant={'secondary'}>
                    Cancel
                  </Button>
                </DialogClose>
                <Button
                  loading={isSubmitting}
                  variant={'destructive'}
                  className="flex-1"
                  onClick={async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    await form.handleSubmit(handleSubmit)(e);
                  }}>
                  {isSubmitting ? 'Deleting...' : 'Confirm'}
                </Button>
              </div>
            </div>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Tags({
  orgShortcode,
  spaceShortcode
}: {
  orgShortcode: string;
  spaceShortcode: string;
  isSpaceAdmin: boolean;
}) {
  const { data: spaceTags } = platform.spaces.tags.getSpacesTags.useQuery({
    orgShortcode: orgShortcode,
    spaceShortcode: spaceShortcode
  });

  const spaceTagsQueryCache = platform.useUtils().spaces.tags.getSpacesTags;

  const { mutateAsync: addNewSpaceTag } =
    platform.spaces.tags.addNewSpaceTag.useMutation();

  const addNewTag = async () => {
    const randomColor =
      uiColors[Math.floor(Math.random() * uiColors.length)] ?? 'cyan';
    await addNewSpaceTag({
      orgShortcode: orgShortcode,
      spaceShortcode: spaceShortcode,
      label: 'New Tag',
      color: randomColor,
      description: 'New Tag Description'
    });
    await spaceTagsQueryCache.invalidate();
  };

  return (
    <div className="flex flex-col gap-2">
      <SettingsTitle title="Tags" />
      <div className="flex flex-wrap gap-2">
        {!spaceTags?.length ? (
          <div className="flex w-full flex-row items-center justify-between gap-8">
            <span>No tags</span>
            <Button
              size={'icon-sm'}
              onClick={() => {
                void addNewTag();
              }}>
              <Plus />
            </Button>
          </div>
        ) : (
          spaceTags?.map((tag) => (
            <div
              key={tag.publicId}
              className="flex w-full flex-row items-center justify-between gap-8">
              <Tag
                orgShortcode={orgShortcode}
                spaceShortcode={spaceShortcode}
                tagPublicId={tag.publicId}
                label={tag.label}
                description={tag.description}
                icon={tag.icon}
                color={tag.color}
                actions={true}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function Tag({
  orgShortcode,
  spaceShortcode,
  tagPublicId,
  label,
  description,
  icon,
  color,
  convoPublicId,
  actions = true,
  editNameActive = false
}: {
  orgShortcode: string;
  spaceShortcode: string;
  tagPublicId: TypeId<'spaceTags'>;
  label: string;
  description: string | null;
  icon: string;
  color: UiColor;
  convoPublicId?: TypeId<'convos'> | null;
  actions?: boolean;
  editNameActive?: boolean;
}) {
  const [editNameMode, setEditNameMode] = useState<boolean>(editNameActive);
  const [editDescriptionMode, setEditDescriptionMode] =
    useState<boolean>(false);
  const [editColorMode, setEditColorMode] = useState<boolean>(false);

  const TagItemBlock = (
    <>
      <div
        className="flex flex-row items-center justify-center gap-1 rounded-sm px-1 py-0.5"
        style={{
          backgroundColor: `var(--${color}9)`,
          color: `var(--${color}1)`
        }}>
        <TagChevron
          className={'size-4'}
          weight="regular"
        />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <Button
        size={'icon-sm'}
        onClick={() => {
          setEditNameMode(!editNameMode);
        }}>
        <Pencil />
      </Button>
      <Button
        size={'icon-sm'}
        onClick={() => {
          setEditDescriptionMode(!editDescriptionMode);
        }}>
        <Pencil />
      </Button>
      <Button
        size={'icon-sm'}
        onClick={() => {
          setEditColorMode(!editColorMode);
        }}>
        <Pencil />
      </Button>
      <Popover open={editNameMode}>
        <PopoverAnchor />
        <PopoverContent>edit name</PopoverContent>
      </Popover>
      <Popover open={editDescriptionMode}>
        <PopoverAnchor />
        <PopoverContent>edit description</PopoverContent>
      </Popover>
      <Popover open={editColorMode}>
        <PopoverAnchor />
        <PopoverContent>edit color</PopoverContent>
      </Popover>
    </>
  );

  return (
    <>
      {!description ? (
        { TagItemBlock }
      ) : (
        <Tooltip>
          <TooltipTrigger>{TagItemBlock}</TooltipTrigger>
          <TooltipContent>
            <span>{description}</span>
          </TooltipContent>
        </Tooltip>
      )}
    </>
  );
}
