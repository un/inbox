export type AccountContext = {
  id: number;
  username: string;
  metadata: Record<string, unknown> | null;
  orgMemberships: {
    role: 'member' | 'admin';
    org: {
      id: number;
      name: string;
    };
  }[];
};
