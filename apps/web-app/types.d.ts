import auth from '@auth/core';

declare module '@auth/core/types' {
  interface User {
    idNumber: number;
    publicId: string;
    username: string;
    recoveryEmail: string;
  }
  interface Account {
    userIdNumber: number;
  }
  interface Session {
    userIdNumber: number;
    user: User;
  }
}

declare module '@auth/core/adapters' {
  interface AdapterUser {
    idNumber: number;
    publicId: string;
    username: string;
    recoveryEmail: string;
    emailVerified: Date | null;
    peter: string;
  }
  interface AdapterAccount {
    userIdNumber: number;
  }
  interface AdapterSession {
    userIdNumber: number;
    user: User;
  }
}
