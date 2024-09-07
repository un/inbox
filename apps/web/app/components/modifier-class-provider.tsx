import { useEffect, useRef, useState } from 'react';

const genState = (e: KeyboardEvent | null) => {
  const { shiftKey, ctrlKey, altKey, metaKey } = e ?? {
    shiftKey: false,
    ctrlKey: false,
    altKey: false,
    metaKey: false
  };
  return {
    shiftKey,
    ctrlKey,
    altKey,
    metaKey
  };
};

const isSameState = (
  a: ReturnType<typeof genState>,
  b: ReturnType<typeof genState>
) =>
  a.shiftKey === b.shiftKey &&
  a.ctrlKey === b.ctrlKey &&
  a.altKey === b.altKey &&
  a.metaKey === b.metaKey;

const anyKeyPressed = (state: ReturnType<typeof genState>) =>
  state.shiftKey || state.ctrlKey || state.altKey || state.metaKey;

export const useModifierKeys = () => {
  const [active, setActive] = useState(genState(null));
  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    const keyListener = (event: Event) => {
      if (event instanceof KeyboardEvent) {
        const newState = genState(event);
        if (!isSameState(active, newState)) setActive(newState);
      } else {
        if (anyKeyPressed(active)) setActive(genState(null));
      }
    };
    window.addEventListener('keydown', keyListener, { signal });
    window.addEventListener('keyup', keyListener, { signal });
    window.addEventListener('focus', keyListener, { signal });
    window.addEventListener('blur', keyListener, { signal });
    return () => controller.abort();
  });
  return active;
};

export function ModifierClassProvider({
  children
}: Readonly<{ children: React.ReactNode }>) {
  const modifierRef = useRef<HTMLDivElement>(null);
  const { altKey, ctrlKey, metaKey, shiftKey } = useModifierKeys();

  useEffect(() => {
    if (!modifierRef.current) return;
    modifierRef.current.classList.toggle('shift-key', shiftKey);
    modifierRef.current.classList.toggle('ctrl-key', ctrlKey);
    modifierRef.current.classList.toggle('alt-key', altKey);
    modifierRef.current.classList.toggle('meta-key', metaKey);
  }, [altKey, ctrlKey, metaKey, shiftKey]);

  return (
    <div
      className="contents"
      ref={modifierRef}>
      {children}
    </div>
  );
}
