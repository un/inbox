import { Fingerprint, Lock, Password } from '@phosphor-icons/react';
import { cn } from '@/src/lib/utils';
import { type UseFormReturn } from 'react-hook-form';
import {
  Form,
  FormControl,
  FormField,
  FormItem
} from '@/src/components/shadcn-ui/form';
import { PasswordInput } from '@/src/components/password-input';
import { platform } from '@/src/lib/trpc';
import { useDebounce } from '@uidotdev/usehooks';
import { useEffect } from 'react';
import { StrengthMeter } from '@/src/components/shared/strength-meter';

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
          'border-base-5 flex w-full flex-col items-center rounded-xl border-2 bg-white p-3 transition-all duration-300 ease-in-out',
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
          <div className="border-green-5 bg-green-9 flex items-center gap-[6px] rounded-full border px-[8px] py-[2px] text-white">
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
  // only show message if both passwords are filled
  const showPasswordMatchMessage =
    password.length > 0 && confirmPassword.length > 0;

  const passwordMatch = password === confirmPassword;

  const { data, isLoading } =
    platform.auth.signup.checkPasswordStrength.useQuery({
      password: debouncedPassword
    });

  useEffect(() => {
    if (!active) return;
    form.setValue(
      'validated',
      (data?.allowed && password === confirmPassword) ?? false
    );
  }, [form, active, data?.allowed, password, confirmPassword]);

  return (
    <div
      role="button"
      onClick={() => setSelected('password')}
      className="h-fit w-full overflow-hidden">
      <div
        className={cn(
          'border-base-5 flex w-full flex-col items-center rounded-xl border bg-white p-3 transition-all duration-300 ease-in-out',
          active ? 'border-accent-10 h-[210px] gap-3' : 'h-[60px]'
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
                          inputSize="lg"
                          placeholder="Password"
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
                          inputSize="lg"
                          placeholder="Confirm Password"
                          className="focus-visible:border-accent-9 mt-[-1px] rounded-t-none border-t-transparent shadow-none focus-visible:ring-0"
                          leadingSlot={Lock}
                          {...field}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </form>
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
                ) : data && passwordMatch !== false ? (
                  <span
                    className={data.allowed ? 'text-green-9' : 'text-red-9'}>
                    {
                      ['Super Weak', 'Weak', 'Not Great', 'Great', 'Godlike'][
                        data?.score ?? 0
                      ]
                    }
                  </span>
                ) : showPasswordMatchMessage && passwordMatch === false ? (
                  "Passwords don't match"
                ) : (
                  ''
                )
              }
              error={data?.allowed ? passwordMatch === false : false}
            />
          </>
        )}
      </div>
    </div>
  );
}
