import {
  Form,
  FormControl,
  FormField,
  FormItem
} from '@/src/components/shadcn-ui/form';
import { StrengthMeter } from '@/src/components/shared/strength-meter';
import { Fingerprint, Lock, Password } from '@phosphor-icons/react';
import { PasswordInput } from '@/src/components/password-input';
import { type UseFormReturn } from 'react-hook-form';
import { useDebounce } from '@uidotdev/usehooks';
import { platform } from '@/src/lib/trpc';
import { cn } from '@/src/lib/utils';
import { useEffect } from 'react';

type Selected = {
  selected: 'passkey' | 'password';
  setSelected: (selected: 'passkey' | 'password') => void;
};

export function PasskeyCard({ selected, setSelected }: Selected) {
  const active = selected === 'passkey';
  return (
    <div
      role="button"
      onClick={() => setSelected('passkey')}
      className="h-fit w-full overflow-hidden">
      <div
        className={cn(
          'border-base-5 bg-base-1 flex w-full flex-col items-center rounded-xl border-2 p-3 transition-all duration-300 ease-in-out',
          active
            ? 'border-accent-10 bg-accent-3 h-[152px] gap-3 border-2'
            : 'h-[60px]'
        )}>
        <div className="flex w-full justify-between">
          <div className="flex items-center gap-2">
            <Fingerprint
              size={32}
              className={cn(active && 'text-accent-9')}
            />
            {!active && (
              <span className="text-base font-semibold">Passkey</span>
            )}
          </div>
          <div className="border-green-5 bg-green-9 text-base-1 flex items-center gap-[6px] rounded-full border px-[8px] py-[2px]">
            <Lock size={16} />
            <span className="text-xs font-medium">Most Secure</span>
          </div>
        </div>
        {active && (
          <div className="flex flex-col text-start">
            <span className="text-base font-semibold">Passkey</span>
            <p className="text-base-11 text-pretty text-sm">
              Passkeys are the new replacement for passwords, designed to give
              you access to an app in an easier and more secure way.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export function PasswordCard({
  selected,
  setSelected,
  form
}: Selected & {
  form: UseFormReturn<
    {
      password: string;
      confirmPassword: string;
      validated: boolean;
    },
    unknown,
    undefined
  >;
}) {
  const active = selected === 'password';
  const password = form.watch('password');
  const confirmPassword = form.watch('confirmPassword');
  const debouncedPassword = useDebounce(password, 1000);
  const passwordMatch =
    password.length >= 8 && confirmPassword.length >= 8
      ? password === confirmPassword
      : null;

  const { data, isLoading } =
    platform.auth.signup.checkPasswordStrength.useQuery(
      {
        password: debouncedPassword
      },
      {
        enabled: active
      }
    );

  // run validation on the debounced password
  useEffect(() => {
    const handleValidation = async () => {
      if (debouncedPassword.length === 0) return;
      await form.trigger('password');
    };
    void handleValidation();
  }, [debouncedPassword, form]);

  useEffect(() => {
    if (!active) return;
    form.setValue(
      'validated',
      (password.length >= 8 &&
        confirmPassword.length >= 8 &&
        data?.allowed &&
        password === confirmPassword) ??
        false
    );
  }, [form, active, data?.allowed, password, confirmPassword]);

  const hasPasswordValidationError = form.formState.errors.password;
  const hasPasswordMatchError = passwordMatch === false;
  const makeSpaceForError = hasPasswordValidationError ?? hasPasswordMatchError;
  return (
    <div
      role="button"
      onClick={() => setSelected('password')}
      className="h-fit w-full overflow-hidden">
      <div
        className={cn(
          'border-base-5 bg-base-1 flex w-full flex-col items-center rounded-xl border p-3 transition-all duration-300 ease-in-out',
          !active
            ? 'h-[60px]'
            : makeSpaceForError
              ? 'border-accent-10 h-[260px] gap-3'
              : 'border-accent-10 h-[230px] gap-3'
        )}>
        <div className="w-full">
          <div className="flex items-center gap-1">
            <Password size={32} />
            <span className="text-base font-semibold">
              {active ? 'Password' : 'Use A Password Instead'}
            </span>
          </div>
        </div>
        {active && (
          <>
            <Form {...form}>
              <form className="flex w-full flex-col">
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <PasswordInput
                          label="Password"
                          inputSize="lg"
                          className="focus-visible:border-accent-9 focus-within:z-1 rounded-b-none shadow-none focus-visible:ring-0"
                          leadingSlot={Lock}
                          {...field}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <PasswordInput
                          label="Confirm Password"
                          inputSize="lg"
                          className="focus-visible:border-accent-9 mt-[-1px] rounded-t-none border-t-transparent shadow-none focus-visible:ring-0"
                          leadingSlot={Lock}
                          {...field}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </form>
              {/* display the error */}
              {hasPasswordValidationError && (
                <p className="text-red-9 w-full text-left text-xs">
                  {form.formState.errors.password?.message}
                </p>
              )}
              {/* display password mismatch */}
              {passwordMatch === false && (
                <p className="text-red-9 w-full text-left text-xs">
                  Passwords don&apos;t match
                </p>
              )}
            </Form>
            <StrengthMeter
              strength={
                debouncedPassword.length >= 8
                  ? (data?.score ?? -1) + 1
                  : undefined
              }
              message={
                isLoading ? (
                  'Calculating Strength...'
                ) : data?.score ? (
                  <span className="text-green-9">
                    {
                      ['Super Weak', 'Weak', 'Not Great', 'Great', 'Godlike'][
                        data?.score ?? 0
                      ]
                    }
                  </span>
                ) : null
              }
              error={false}
            />
          </>
        )}
      </div>
    </div>
  );
}
