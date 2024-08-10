'use client';
import { ConvoList as SpaceConvoList } from './_components/convo-list';
import { ConvoLayoutWrapper } from '../../convo/layout';
import { useState } from 'react';

export default function Layout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  const [showHidden, setShowHidden] = useState(false);

  return (
    <ConvoLayoutWrapper
      convoList={<SpaceConvoList hidden={showHidden} />}
      showHidden={showHidden}
      setShowHidden={setShowHidden}>
      {children}
    </ConvoLayoutWrapper>
  );
}
