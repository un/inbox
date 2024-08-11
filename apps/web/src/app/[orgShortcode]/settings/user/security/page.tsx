'use client';

import {
  DisableRecoveryCodeModal,
  EnableOrResetRecoveryCodeModal
} from './_components/recovery-modals';
import {
  DisableTwoFactorModal,
  EnableOrResetTwoFactorModal
} from './_components/two-factor-modals';
import { Trash, SpinnerGap, SignOut, Pencil } from '@phosphor-icons/react';

import {
  EnableOrChangePasswordModal,
  DisablePasswordModal
} from './_components/password-modals';
import {
  PasskeyDeleteModal,
  PasskeyRenameModal
} from './_components/passkey-modals';
import { RemoveAllSessionsModal } from './_components/session-modal';
import { useCallback, useMemo, useRef, useState } from 'react';
import { ElevatedModal } from './_components/elevated-modal';
import { startRegistration } from '@simplewebauthn/browser';
import { Button } from '@/src/components/shadcn-ui/button';
import { PageTitle } from '../../_components/page-title';
import { useMutation } from '@tanstack/react-query';
import { platform } from '@/src/lib/trpc';
import { ms } from '@u22n/utils/ms';
import { format } from 'date-fns';
import { toast } from 'sonner';

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage
} from '@/src/components/shadcn-ui/form';
import RecoveryEmailSection from './_components/recovery-email-section';
import { Input } from '@/src/components/shadcn-ui/input';
import { zodResolver } from '@hookform/resolvers/zod';
import { Avatar } from '@/src/components/avatar';
import { type TypeId } from '@u22n/utils/typeid';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

export default function Page() {
  const platformUtils = platform.useUtils();

  const {
    data: overviewData,
    isLoading: overviewDataLoading,
    refetch: refetchOverviewData
  } = platform.account.security.getOverview.useQuery(void 0, {
    refetchOnWindowFocus: true
  });

  const { data: elevatedData, refetch: refreshElevatedData } =
    platform.account.security.checkIfElevated.useQuery(void 0, {
      gcTime: ms('5 minutes'),
      staleTime: ms('5 minutes')
    });

  const elevatedActionRef = useRef<(() => Promise<void> | void) | null>(null);

  const [elevatedModalOpen, setElevatedModalOpen] = useState(false);

  const ensureElevated = useCallback(
    (fn: () => Promise<void> | void) => {
      if (elevatedData?.isElevated) {
        void fn();
      } else {
        elevatedActionRef.current = fn;
        setElevatedModalOpen(true);
      }
    },
    [elevatedData?.isElevated]
  );

  const [changePasswordModalOpen, setChangePasswordModalOpen] = useState<
    'enable' | 'change' | null
  >(null);
  const [disablePasswordModalOpen, setDisablePasswordModalOpen] =
    useState(false);

  const [twoFactorModalOpen, setTwoFactorModalOpen] = useState<
    'enable' | 'reset' | null
  >(null);
  const [disableTwoFactorModalOpen, setDisableTwoFactorModalOpen] =
    useState(false);

  const [recoveryCodeModalOpen, setRecoveryCodeModalOpen] = useState<
    'enable' | 'reset' | null
  >(null);
  const [disableRecoveryCodeModalOpen, setDisableRecoveryCodeModalOpen] =
    useState(false);

  const [deletePasskey, setDeletePasskey] = useState<{
    nickname: string;
    publicId: string;
  } | null>(null);
  const [renamePasskey, setRenamePasskey] = useState<{
    nickname: string;
    publicId: string;
  } | null>(null);

  const [removeAllSessionsModalOpen, setRemoveAllSessionsModalOpen] =
    useState(false);

  const [showDeleteAccountSection, setShowDeleteAccountSection] =
    useState(false);

  const { mutate: removeSession } =
    platform.account.security.removeSession.useMutation({
      onSuccess: (_, { sessionPublicId }) => {
        platformUtils.account.security.getOverview.setData(void 0, (up) => {
          if (!up) return;
          const sessions = up.sessions.filter(
            (s) => s.publicId !== sessionPublicId
          );
          return { ...up, sessions };
        });
      }
    });

  const { mutateAsync: generatePasskeyCreationChallenge } =
    platform.account.security.generatePasskeyCreationChallenge.useMutation({
      onError: () => void 0
    });
  const { mutateAsync: createNewPasskey } =
    platform.account.security.createNewPasskey.useMutation({
      onError: () => void 0
    });

  const { mutateAsync: createPasskey, isPending: creatingPasskey } =
    useMutation({
      mutationFn: async () => {
        const { options } = await generatePasskeyCreationChallenge();
        const passkeyResponse = await startRegistration(options).catch(
          (err: Error) => {
            if (err.name === 'NotAllowedError') {
              toast.info('Passkey creation was canceled');
            } else {
              toast.error('Something went wrong while creating passkey', {
                description: err.message,
                className: 'z-[1000]'
              });
            }
          }
        );
        if (!passkeyResponse) return { success: false };
        return await createNewPasskey({ passkeyResponse });
      },
      onError: (err) => {
        toast.error('Could not create passkey', {
          description: err.message,
          className: 'z-[1000]'
        });
      },
      onSuccess: ({ success }) => {
        if (success) {
          toast.success('Passkey created successfully');
          // We don't have enough info to update cache, so we'll just refetch
          void refetchOverviewData();
          void refreshElevatedData();
        }
      }
    });

  const canDeletePasskey = useMemo(() => {
    if (!overviewData) return false;
    return overviewData.passwordSet ? true : overviewData.passkeys.length > 1;
  }, [overviewData]);

  const canDisablePassword = useMemo(() => {
    if (!overviewData) return false;
    return overviewData.passwordSet && overviewData.passkeys.length > 0;
  }, [overviewData]);

  return (
    <div className="flex w-full flex-col gap-4 p-4">
      <PageTitle
        title="Security"
        description="Manage your account security"
      />

      {overviewDataLoading && (
        <div className="flex h-20 w-full items-center justify-center">
          <SpinnerGap className="size-4 animate-spin" />
          <span className="text-base-10 text-sm">Loading...</span>
        </div>
      )}

      {overviewData && (
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-2">
            <span className="text-base-11 text-sm font-semibold">
              Password and 2FA
            </span>
            <div className="flex flex-row flex-wrap gap-2">
              <div className="flex gap-2">
                {overviewData.passwordSet ? (
                  <Button
                    onClick={() =>
                      ensureElevated(() => setChangePasswordModalOpen('change'))
                    }>
                    Change Password
                  </Button>
                ) : (
                  <Button
                    onClick={() =>
                      ensureElevated(() => setChangePasswordModalOpen('enable'))
                    }>
                    Enable Password
                  </Button>
                )}
                {canDisablePassword && (
                  <Button
                    variant="destructive"
                    onClick={() =>
                      ensureElevated(() => setDisablePasswordModalOpen(true))
                    }>
                    Disable Password
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                {overviewData.twoFactorEnabled ? (
                  <Button
                    onClick={() =>
                      ensureElevated(() => setTwoFactorModalOpen('reset'))
                    }>
                    Reset 2FA
                  </Button>
                ) : (
                  <Button
                    onClick={() =>
                      ensureElevated(() => setTwoFactorModalOpen('enable'))
                    }>
                    Enable 2FA
                  </Button>
                )}
                {overviewData.twoFactorEnabled && (
                  <Button
                    variant="destructive"
                    onClick={() =>
                      ensureElevated(() => setDisableTwoFactorModalOpen(true))
                    }>
                    Disable 2FA
                  </Button>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-base-11 text-sm font-semibold">
              Recovery Email
            </span>
            <RecoveryEmailSection ensureElevated={ensureElevated} />
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-base-11 text-sm font-semibold">
              Recovery Code
            </span>
            <div className="flex gap-2">
              {overviewData.recoveryCodeSet ? (
                <>
                  <Button
                    onClick={() =>
                      ensureElevated(() => setRecoveryCodeModalOpen('reset'))
                    }>
                    Reset Recovery Code
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() =>
                      ensureElevated(() =>
                        setDisableRecoveryCodeModalOpen(true)
                      )
                    }>
                    Disable Recovery Code
                  </Button>
                </>
              ) : (
                <Button
                  onClick={() =>
                    ensureElevated(() => setRecoveryCodeModalOpen('enable'))
                  }>
                  Setup Recovery Code
                </Button>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-base-11 text-sm font-semibold">Passkeys</span>
            <div className="flex flex-wrap gap-2">
              {overviewData.passkeys.map((passkey) => (
                <div
                  key={passkey.publicId}
                  className="bg-base-3 flex items-center justify-center gap-3 rounded-xl border p-2">
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold">
                      {passkey.nickname}
                    </span>
                    <span className="text-base-11 text-xs">
                      {format(passkey.createdAt, 'HH:mm, do MMM yyyy')}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      onClick={() => setRenamePasskey(passkey)}>
                      <Pencil size={16} />
                    </Button>
                    <Button
                      size="icon"
                      variant="destructive"
                      disabled={!canDeletePasskey}
                      onClick={() =>
                        ensureElevated(() => setDeletePasskey(passkey))
                      }>
                      <Trash size={16} />
                    </Button>
                  </div>
                </div>
              ))}
              {overviewData.passkeys.length === 0 && (
                <div className="text-base-11">
                  No passkeys have been added yet
                </div>
              )}
            </div>
            <Button
              className="w-fit"
              loading={creatingPasskey}
              onClick={() => ensureElevated(() => void createPasskey())}>
              Add New Passkey
            </Button>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-base-11 text-sm font-semibold">Sessions</span>
            <div className="flex flex-wrap gap-2">
              {overviewData?.sessions.map((session) => (
                <div
                  key={session.publicId}
                  className="bg-base-3 flex items-center justify-center gap-3 rounded-xl border p-2">
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold">
                      {session.device} - {session.os}
                    </span>
                    <span className="text-base-11 text-xs">
                      {format(session.createdAt, ' HH:mm, do MMM yyyy')}
                    </span>
                  </div>
                  <div>
                    <Button
                      size="icon"
                      variant="destructive"
                      onClick={() => {
                        if (session.publicId === overviewData.thisDevice) {
                          toast.error(
                            'You cannot remove your current session',
                            {
                              description:
                                'If you want to remove this session, please log out normally'
                            }
                          );
                          return;
                        }
                        ensureElevated(async () =>
                          removeSession({
                            sessionPublicId: session.publicId
                          })
                        );
                      }}>
                      <Trash size={16} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <Button
              variant="destructive"
              className="mt-3 w-fit gap-2"
              onClick={() =>
                ensureElevated(() => setRemoveAllSessionsModalOpen(true))
              }>
              <SignOut
                size={16}
                weight="bold"
              />
              <span>Logout of All Sessions</span>
            </Button>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-base-11 text-sm font-semibold">
              Delete Account
            </span>
            {!showDeleteAccountSection ? (
              <Button
                variant="destructive"
                className="mt-3 w-fit gap-2"
                onClick={() =>
                  ensureElevated(() => setShowDeleteAccountSection(true))
                }>
                <Trash
                  size={16}
                  weight="bold"
                />
                <span>Delete My Account</span>
              </Button>
            ) : (
              <DeleteAccount />
            )}
          </div>

          {elevatedModalOpen && (
            <ElevatedModal
              open={elevatedModalOpen}
              setOpen={setElevatedModalOpen}
              overviewData={overviewData}
              onSuccess={async () => {
                const { data } = await refreshElevatedData();
                if (!data?.isElevated) {
                  toast.error('Something went wrong, please try again');
                }
                if (typeof elevatedActionRef.current === 'function') {
                  void elevatedActionRef.current();
                }
                elevatedActionRef.current = null;
              }}
            />
          )}

          {changePasswordModalOpen && (
            <EnableOrChangePasswordModal
              open={changePasswordModalOpen}
              setOpen={(open) =>
                setChangePasswordModalOpen(open ? 'change' : null)
              }
              onSuccess={async () => {
                platformUtils.account.security.getOverview.setData(
                  void 0,
                  (up) => {
                    if (!up) return;
                    return {
                      ...up,
                      passwordSet: true
                    };
                  }
                );
                await refreshElevatedData();
              }}
            />
          )}

          {disablePasswordModalOpen && (
            <DisablePasswordModal
              open={disablePasswordModalOpen}
              setOpen={setDisablePasswordModalOpen}
              onSuccess={async () => {
                platformUtils.account.security.getOverview.setData(
                  void 0,
                  (up) => {
                    if (!up) return;
                    return {
                      ...up,
                      passwordSet: false,
                      twoFactorEnabled: false
                    };
                  }
                );
                await refreshElevatedData();
              }}
            />
          )}

          {twoFactorModalOpen && (
            <EnableOrResetTwoFactorModal
              open={twoFactorModalOpen}
              setOpen={(open) => setTwoFactorModalOpen(open ? 'reset' : null)}
              onSuccess={async () => {
                platformUtils.account.security.getOverview.setData(
                  void 0,
                  (up) => {
                    if (!up) return;
                    return {
                      ...up,
                      twoFactorEnabled: true
                    };
                  }
                );
                await refreshElevatedData();
              }}
            />
          )}

          {disableTwoFactorModalOpen && (
            <DisableTwoFactorModal
              open={disableTwoFactorModalOpen}
              setOpen={setDisableTwoFactorModalOpen}
              onSuccess={async () => {
                platformUtils.account.security.getOverview.setData(
                  void 0,
                  (up) => {
                    if (!up) return;
                    return {
                      ...up,
                      twoFactorEnabled: false
                    };
                  }
                );
                await refreshElevatedData();
              }}
            />
          )}

          {recoveryCodeModalOpen && (
            <EnableOrResetRecoveryCodeModal
              open={recoveryCodeModalOpen}
              setOpen={(open) =>
                setRecoveryCodeModalOpen(open ? 'enable' : null)
              }
              onSuccess={async () => {
                platformUtils.account.security.getOverview.setData(
                  void 0,
                  (up) => {
                    if (!up) return;
                    return {
                      ...up,
                      recoveryCodeSet: true
                    };
                  }
                );
                await refreshElevatedData();
              }}
            />
          )}

          {disableRecoveryCodeModalOpen && (
            <DisableRecoveryCodeModal
              open={disableRecoveryCodeModalOpen}
              setOpen={setDisableRecoveryCodeModalOpen}
              onSuccess={async () => {
                platformUtils.account.security.getOverview.setData(
                  void 0,
                  (up) => {
                    if (!up) return;
                    return {
                      ...up,
                      recoveryCodeSet: false
                    };
                  }
                );
                await refreshElevatedData();
              }}
            />
          )}

          {deletePasskey && (
            <PasskeyDeleteModal
              setOpen={(open) => setDeletePasskey(open ? deletePasskey : null)}
              onSuccess={async (publicId) => {
                platformUtils.account.security.getOverview.setData(
                  void 0,
                  (up) => {
                    if (!up) return;
                    return {
                      ...up,
                      passkeys: up.passkeys.filter(
                        (p) => p.publicId !== publicId
                      )
                    };
                  }
                );
                await refreshElevatedData();
              }}
              passkey={deletePasskey}
            />
          )}

          {renamePasskey && (
            <PasskeyRenameModal
              setOpen={(open) => setRenamePasskey(open ? renamePasskey : null)}
              onSuccess={async ({ publicId, newNickname }) => {
                platformUtils.account.security.getOverview.setData(
                  void 0,
                  (up) => {
                    if (!up) return;
                    return {
                      ...up,
                      passkeys: up.passkeys.map((p) =>
                        p.publicId === publicId
                          ? { ...p, nickname: newNickname }
                          : p
                      )
                    };
                  }
                );
                await refreshElevatedData();
              }}
              passkey={renamePasskey}
            />
          )}

          {removeAllSessionsModalOpen && (
            <RemoveAllSessionsModal
              open={removeAllSessionsModalOpen}
              setOpen={setRemoveAllSessionsModalOpen}
            />
          )}
        </div>
      )}
    </div>
  );
}

function DeleteAccount() {
  const { data: accountData, isLoading: accountDataLoading } =
    platform.account.security.deleteAccountPre.useQuery();

  const confirmationFormSchema = z.object({
    username: z.literal(accountData?.username, {
      errorMap: () => ({ message: 'Must match your username exactly' })
    })
  });

  const form = useForm<z.infer<typeof confirmationFormSchema>>({
    resolver: zodResolver(confirmationFormSchema),
    defaultValues: {
      username: ''
    }
  });

  const validated = form.formState.isValid;

  const { mutate: deleteAccountConfirm, isPending: deletingAccount } =
    platform.account.security.deleteAccountConfirm.useMutation({
      onSuccess: () => {
        window.location.replace('/');
      }
    });

  return (
    <>
      <div className="flex flex-col gap-2">
        {accountDataLoading ? (
          <div className="flex h-20 w-full items-center justify-center gap-2 text-center font-bold">
            <SpinnerGap className="size-4 animate-spin" />
            <span className="text-sm">Checking your account...</span>
          </div>
        ) : (
          <div className="flex w-full flex-col gap-4">
            <div className="flex w-full flex-col gap-2">
              <span className="">
                You are about to permanently and irreversibly delete your
                account.
              </span>
              <span className="">
                Your username will be disabled from being registered again.
              </span>
              <span className="text-red-9 font-semibold">
                This can not be undone.
              </span>
            </div>

            <div className="flex w-96 flex-col gap-4">
              {accountData?.ownedOrgs && accountData?.ownedOrgs.length > 0 && (
                <>
                  <span className="text-base-11 text-xs">
                    {(accountData?.ownedOrgs?.length ?? 0) > 1
                      ? 'Delete these organizations with all their data and members:'
                      : 'Delete this organization with all its data and members:'}
                  </span>
                  {accountData?.ownedOrgs.map((org) => (
                    <OrgObject
                      key={org.publicId}
                      publicId={org.publicId}
                      avatarTimestamp={org.avatarTimestamp}
                      name={org.name}
                      shortcode={org.shortcode}
                    />
                  ))}
                </>
              )}
              {accountData?.memberOrgs &&
                accountData?.memberOrgs.length > 0 && (
                  <>
                    <span className="text-base-11 text-xs">
                      {(accountData?.memberOrgs?.length ?? 0) > 1
                        ? 'Leave these organizations:'
                        : 'Leave this organization:'}
                    </span>
                    {accountData?.memberOrgs.map((org) => (
                      <OrgObject
                        key={org.publicId}
                        publicId={org.publicId}
                        avatarTimestamp={org.avatarTimestamp}
                        name={org.name}
                        shortcode={org.shortcode}
                      />
                    ))}
                  </>
                )}
            </div>

            <div className="flex w-96 flex-col gap-4">
              <span>
                Please enter your username{' '}
                <span className="bg-base-11 text-base-1 rounded-md px-1 py-0.5 font-mono text-sm">
                  {accountData?.username}
                </span>{' '}
                to confirm your account deletion.
              </span>
              <Form {...form}>
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          label="Username"
                          inputSize="lg"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </Form>
            </div>

            <Button
              variant="destructive"
              className="mt-3 w-fit gap-2"
              disabled={!validated}
              loading={deletingAccount}
              onClick={async (e) => {
                e.preventDefault();
                if (!validated)
                  return form.setError('username', {
                    message: 'Must match your username exactly'
                  });
                await form.handleSubmit(async () => deleteAccountConfirm())(e);
              }}>
              <Trash
                size={16}
                weight="bold"
              />
              <span>Yes I want to delete my whole account</span>
            </Button>
          </div>
        )}
      </div>
    </>
  );
}

function OrgObject({
  publicId,
  avatarTimestamp,
  name,
  shortcode
}: {
  publicId: TypeId<'org'>;
  avatarTimestamp: Date | null;
  name: string;
  shortcode: string;
}) {
  return (
    <div className="flex w-full flex-row items-center justify-between gap-4">
      <div className="flex w-full flex-row items-center gap-4">
        <Avatar
          avatarProfilePublicId={publicId}
          avatarTimestamp={avatarTimestamp}
          name={name}
          size="xl"
        />
        <div className="flex flex-col gap-0">
          <span className="font-semibold">{name}</span>
          <span className="text-base-11 leading-0 text-xs">{shortcode}</span>
        </div>
      </div>
    </div>
  );
}
