export type RealtimeEventsMap = {
  // fired when the unplatform backend is updated
  'platform:update': (identifier: string) => void;
  // fired when a new conversation is created
  'convo:created': () => void;
  // fired when a conversation is updated
  'convo:updated': () => void;
};
