'use client';

import { ConvoList as SpaceConvoList } from './_components/space-convo-list';
import { ConvoLayoutWrapper } from '../../convo/layout';
import { useMemo, useState } from 'react';

export default function Layout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  const [showHidden, setShowHidden] = useState(false);

  const convoList = useMemo(
    () => <SpaceConvoList hidden={showHidden} />,
    [showHidden]
  );

  return (
    <ConvoLayoutWrapper
      convoList={convoList}
      showHidden={showHidden}
      setShowHidden={setShowHidden}>
      {children}
    </ConvoLayoutWrapper>
  );
}
