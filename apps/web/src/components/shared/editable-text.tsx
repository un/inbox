import React, { useRef, useState } from 'react';
import { cn } from '@/src/lib/utils';

type EditableTextProps = {
  value: string;
  setValue: (value: string) => void;
};

export function EditableText({ value, setValue }: EditableTextProps) {
  const [editingState, setEditingState] = useState(value);
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  return isEditing ? (
    <input
      ref={inputRef}
      value={editingState}
      onChange={(e) => setEditingState(e.target.value)}
      onBlur={() => {
        if (editingState.trim() === '' || editingState === value) {
          setEditingState(value);
        } else {
          setValue(editingState);
        }
        setIsEditing(false);
      }}
      className="w-fit border-none outline-none"
    />
  ) : (
    <span
      onClick={() => {
        setEditingState(value);
        setIsEditing(true);
        setTimeout(() => inputRef.current?.focus(), 10);
      }}
      className={cn(value && 'decoration-blue-5 underline')}>
      {value || '...'}
    </span>
  );
}
