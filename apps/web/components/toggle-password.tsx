'use client';

import { Text, TextField, Button } from '@radix-ui/themes';
import { type ReactNode, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

type TogglePasswordBoxProps = {
  slot?: ReactNode;
  label?: ReactNode;
  textFieldProps?: TextField.RootProps;
  passwordValue?: string;
  setPasswordValue: (password: string) => void;
};

export default function TogglePasswordBox({
  slot,
  label,
  textFieldProps = {},
  passwordValue = '',
  setPasswordValue
}: TogglePasswordBoxProps) {
  const [passwordShown, setPasswordShown] = useState(false);
  return (
    <label>
      {label && (
        <Text
          as="div"
          size="2"
          mb="1"
          weight="bold">
          {label}
        </Text>
      )}
      <TextField.Root
        {...textFieldProps}
        type={passwordShown ? 'text' : 'password'}
        value={passwordValue}
        onChange={(e) => setPasswordValue(e.target.value)}>
        <TextField.Slot>{slot}</TextField.Slot>
        <TextField.Slot>
          <Button
            variant="ghost"
            onClick={() => setPasswordShown(!passwordShown)}>
            {passwordShown ? <Eye size={16} /> : <EyeOff size={16} />}
          </Button>
        </TextField.Slot>
      </TextField.Root>
    </label>
  );
}
