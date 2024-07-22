import type { Metadata } from 'next';
import React from 'react';
import CreateConvoForm from '../_components/create-convo-form';

export const metadata: Metadata = {
  title: 'UnInbox | Create Convo',
  description: 'Open Source Email service',
  icons: '/logo.png'
};

export default function Page() {
  return <CreateConvoForm />;
}