import { Avatar } from '@radix-ui/react-avatar';
import React from 'react';

interface WelcomeMessageProps {
  content: React.ReactNode;
  author: {
    name: string;
    avatarUrl: string;
  };
}

export function WelcomeMessage({ content, author }: WelcomeMessageProps) {
  return (
    <div className="py-4">
      <div className="group relative mr-auto flex w-fit gap-2">
        <div className="flex w-fit max-w-prose flex-col items-start gap-2 overflow-x-hidden">
          <div className="flex w-full flex-row items-center gap-2">
            <Avatar className="h-10 w-10 rounded-full">
              <Avatar.Image
                src={author.avatarUrl}
                alt={author.name}
              />
              <Avatar.Fallback>{author.name.charAt(0)}</Avatar.Fallback>
            </Avatar>
            <span className="text-base font-medium leading-none">
              {author.name}
            </span>
          </div>
          <div className="bg-base-3 flex w-fit max-w-full flex-row overflow-hidden rounded-2xl rounded-tl-sm px-3 py-2">
            <div className="prose dark:prose-invert prose-a:decoration-blue-9 text-base-12 w-fit min-w-min overflow-ellipsis text-pretty [overflow-wrap:anywhere]">
              {content}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
