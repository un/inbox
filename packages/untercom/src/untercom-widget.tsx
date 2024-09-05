import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, Send, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface UntercomWidgetProps {
  widgetUrl: string;
  widgetPublicId: string;
}

interface Message {
  text: string;
  sender: 'user' | 'system';
}

export const UntercomWidget: React.FC<UntercomWidgetProps> = ({
  widgetUrl,
  widgetPublicId
}) => {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [isInitialInfoProvided, setIsInitialInfoProvided] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Expose addMessage function to window for script usage
    (window as any).addMessage = (message: string) => {
      setMessages((prev) => [...prev, { text: message, sender: 'system' }]);
    };
  }, []);

  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, [messages]);

  const toggleChat = () => {
    setIsChatOpen(!isChatOpen);
  };

  const sendMessage = async (message: string) => {
    try {
      const response = await fetch(
        `${widgetUrl}/public-widget/message/${widgetPublicId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Origin: 'https://app.untercom.com'
          },
          body: JSON.stringify({
            message: message,
            name: name,
            email: email
          })
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (result.success) {
        setMessages((prev) => [
          ...prev,
          { text: `You: ${message}`, sender: 'user' }
        ]);
      } else {
        throw new Error('Message not sent successfully');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      // @ts-ignore
      setMessages((prev) => [
        ...prev,
        { text: `Error: ${error.message}`, sender: 'system' }
      ]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputRef.current && inputRef.current.value) {
      sendMessage(inputRef.current.value);
      inputRef.current.value = '';
    }
  };

  const handleInitialInfoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email && name) {
      setIsInitialInfoProvided(true);
    }
  };

  return (
    <>
      <Button
        onClick={toggleChat}
        className="fixed bottom-5 right-5 h-14 w-14 rounded-full shadow-lg"
        variant="default">
        <MessageCircle size={24} />
      </Button>
      {isChatOpen && (
        <Card className="fixed bottom-20 right-5 flex h-[500px] w-80 flex-col shadow-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Untercom Chat</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleChat}>
              <X size={18} />
            </Button>
          </CardHeader>
          <CardContent
            className="flex-grow overflow-auto p-4"
            ref={messagesRef}>
            {!isInitialInfoProvided ? (
              <form
                onSubmit={handleInitialInfoSubmit}
                className="space-y-4">
                <Input
                  label="Email"
                  type="email"
                  placeholder="What's your email?"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <Input
                  label="Name"
                  type="text"
                  placeholder="What is your name?"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
                <Button
                  type="submit"
                  className="w-full">
                  Start Chat
                </Button>
              </form>
            ) : (
              messages.map((message, index) => (
                <div
                  key={index}
                  className={`mb-2 rounded-lg p-2 ${
                    message.sender === 'user'
                      ? 'bg-primary text-primary-foreground ml-auto'
                      : 'bg-secondary text-secondary-foreground'
                  } max-w-[80%] ${message.sender === 'user' ? 'float-right clear-both' : 'float-left clear-both'}`}>
                  {message.text}
                </div>
              ))
            )}
          </CardContent>
          {isInitialInfoProvided && (
            <CardFooter>
              <form
                onSubmit={handleSubmit}
                className="flex w-full space-x-2">
                <Input
                  label="Message"
                  ref={inputRef}
                  type="text"
                  placeholder="Type your message..."
                  className="flex-grow"
                />
                <Button
                  type="submit"
                  size="icon">
                  <Send size={18} />
                </Button>
              </form>
            </CardFooter>
          )}
        </Card>
      )}
    </>
  );
};
