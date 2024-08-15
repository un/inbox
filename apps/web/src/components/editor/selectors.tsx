import {
  TextB,
  TextItalic,
  TextUnderline,
  TextStrikethrough,
  TextHOne,
  TextHTwo,
  TextHThree,
  ListBullets,
  ListNumbers,
  TextAlignLeft,
  Quotes,
  Check,
  CaretDown,
  type Icon,
  Trash
} from '@phosphor-icons/react';
import {
  PopoverContent,
  Popover,
  PopoverTrigger
} from '@/src/components/shadcn-ui/popover';
import {
  type EditorInstance,
  EditorBubbleItem,
  useEditor
} from '@u22n/tiptap/components';
import { Button } from '../shadcn-ui/button';
import { useEffect, useRef } from 'react';
import { cn } from '@/src/lib/utils';
import { toast } from 'sonner';

export const TextButtons = () => {
  const { editor } = useEditor();
  if (!editor) return null;

  const items: SelectorItem[] = [
    {
      name: 'bold',
      isActive: (editor) => editor.isActive('bold'),
      command: (editor) => editor.chain().focus().toggleBold().run(),
      icon: TextB
    },
    {
      name: 'italic',
      isActive: (editor) => editor.isActive('italic'),
      command: (editor) => editor.chain().focus().toggleItalic().run(),
      icon: TextItalic
    },
    {
      name: 'underline',
      isActive: (editor) => editor.isActive('underline'),
      command: (editor) => editor.chain().focus().toggleUnderline().run(),
      icon: TextUnderline
    },
    {
      name: 'strike',
      isActive: (editor) => editor.isActive('strike'),
      command: (editor) => editor.chain().focus().toggleStrike().run(),
      icon: TextStrikethrough
    }
  ];

  return (
    <div className="flex items-center justify-between gap-1 p-1">
      {items.map((item, index) => (
        <EditorBubbleItem
          key={index}
          onSelect={(editor) => item.command(editor)}>
          <Button
            size="icon"
            className={cn(
              'hover:bg-accent-2 rounded',
              editor.isActive(item.name) && 'bg-accent-5 font-bold'
            )}
            variant="ghost">
            <item.icon className="size-4" />
          </Button>
        </EditorBubbleItem>
      ))}
    </div>
  );
};

export type SelectorItem = {
  name: string;
  icon: Icon;
  command: (editor: EditorInstance) => void;
  isActive: (editor: EditorInstance) => boolean;
};

const items: SelectorItem[] = [
  {
    name: 'Text',
    icon: TextAlignLeft,
    command: (editor) => editor.chain().focus().clearNodes().run(),
    isActive: (editor) =>
      editor.isActive('paragraph') &&
      !editor.isActive('bulletList') &&
      !editor.isActive('orderedList')
  },
  {
    name: 'Heading 1',
    icon: TextHOne,
    command: (editor) =>
      editor.chain().focus().clearNodes().toggleHeading({ level: 1 }).run(),
    isActive: (editor) => editor.isActive('heading', { level: 1 })
  },
  {
    name: 'Heading 2',
    icon: TextHTwo,
    command: (editor) =>
      editor.chain().focus().clearNodes().toggleHeading({ level: 2 }).run(),
    isActive: (editor) => editor.isActive('heading', { level: 2 })
  },
  {
    name: 'Heading 3',
    icon: TextHThree,
    command: (editor) =>
      editor.chain().focus().clearNodes().toggleHeading({ level: 3 }).run(),
    isActive: (editor) => editor.isActive('heading', { level: 3 })
  },
  {
    name: 'Bullet List',
    icon: ListBullets,
    command: (editor) =>
      editor.chain().focus().clearNodes().toggleBulletList().run(),
    isActive: (editor) => editor.isActive('bulletList')
  },
  {
    name: 'Numbered List',
    icon: ListNumbers,
    command: (editor) =>
      editor.chain().focus().clearNodes().toggleOrderedList().run(),
    isActive: (editor) => editor.isActive('orderedList')
  },
  {
    name: 'Quote',
    icon: Quotes,
    command: (editor) =>
      editor.chain().focus().clearNodes().toggleBlockquote().run(),
    isActive: (editor) => editor.isActive('blockquote')
  }
];

interface NodeSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const NodeSelector = ({ open, onOpenChange }: NodeSelectorProps) => {
  const { editor } = useEditor();
  if (!editor) return null;

  const activeItem = items.filter((item) => item.isActive(editor)).pop() ?? {
    name: 'Multiple'
  };

  return (
    <Popover
      modal={true}
      open={open}
      onOpenChange={onOpenChange}>
      <PopoverTrigger
        asChild
        className="hover:bg-accent-2 gap-2 rounded-none border-none focus:ring-0">
        <Button
          size="sm"
          variant="ghost"
          className="gap-2">
          <span className="whitespace-nowrap text-sm">{activeItem.name}</span>
          <CaretDown className="size-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        sideOffset={5}
        align="start"
        className="w-48 p-1">
        {items.map((item, index) => (
          <EditorBubbleItem
            key={index}
            onSelect={(editor) => {
              item.command(editor);
              onOpenChange(false);
            }}
            className="hover:bg-accent-4 flex cursor-pointer items-center justify-between rounded-sm px-2 py-1 text-sm">
            <div className="flex items-center space-x-2">
              <div className="rounded-sm border p-1">
                <item.icon className="size-3" />
              </div>
              <span>{item.name}</span>
            </div>
            {activeItem.name === item.name && <Check className="size-3" />}
          </EditorBubbleItem>
        ))}
      </PopoverContent>
    </Popover>
  );
};

export function isValidUrl(url: string) {
  try {
    new URL(url);
    return true;
  } catch (e) {
    return false;
  }
}
export function getUrlFromString(str: string) {
  if (isValidUrl(str)) return str;
  try {
    if (str.includes('.') && !str.includes(' ')) {
      return new URL(`https://${str}`).toString();
    } else {
      toast.error('Please enter a valid link');
      return null;
    }
  } catch (e) {
    return null;
  }
}
interface LinkSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const LinkSelector = ({ open, onOpenChange }: LinkSelectorProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const { editor } = useEditor();

  // Autofocus on input by default
  useEffect(() => {
    inputRef.current && inputRef.current?.focus();
  });
  if (!editor) return null;

  return (
    <Popover
      modal={true}
      open={open}
      onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button
          size="sm"
          variant="ghost"
          className={cn(
            'hover:bg-accent-2 gap-2 rounded-none border-none',
            editor.isActive('link') && 'bg-accent-4 font-bold'
          )}>
          <p className="text-base">↗</p>
          <p className="decoration-slate-4 underline underline-offset-4">
            Link
          </p>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-60 p-0"
        sideOffset={10}>
        <form
          onSubmit={(e) => {
            const target = e.currentTarget as HTMLFormElement;
            e.preventDefault();
            const input = target[0] as HTMLInputElement;
            const url = getUrlFromString(input.value);
            if (url) {
              editor.chain().focus().setLink({ href: url }).run();
              onOpenChange(false);
            }
          }}
          className="flex p-1">
          <input
            ref={inputRef}
            type="text"
            placeholder="Paste a link"
            className="bg-background flex-1 p-1 text-sm outline-none"
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            defaultValue={editor.getAttributes('link').href || ''}
          />
          {editor.getAttributes('link').href ? (
            <Button
              size="icon"
              variant="outline"
              type="button"
              className="text-red-6 hover:bg-red-1 dark:hover:bg-red-8 flex h-8 items-center rounded-sm p-1 transition-all"
              onClick={(e) => {
                e.preventDefault();
                editor.chain().focus().unsetLink().run();
                onOpenChange(false);
              }}>
              <Trash className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              size="icon"
              className="h-8">
              <Check className="h-4 w-4" />
            </Button>
          )}
        </form>
      </PopoverContent>
    </Popover>
  );
};

export interface BubbleColorMenuItem {
  name: string;
  color?: string;
}

const TEXT_COLORS: BubbleColorMenuItem[] = [
  {
    name: 'Default',
    color: undefined
  },
  {
    name: 'Purple',
    color: '#9333EA'
  },
  {
    name: 'Red',
    color: '#E00000'
  },
  {
    name: 'Yellow',
    color: '#EAB308'
  },
  {
    name: 'Blue',
    color: '#2563EB'
  },
  {
    name: 'Green',
    color: '#008A00'
  },
  {
    name: 'Orange',
    color: '#FFA500'
  },
  {
    name: 'Pink',
    color: '#BA4081'
  },
  {
    name: 'Gray',
    color: '#A8A29E'
  }
];

interface ColorSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ColorSelector = ({ open, onOpenChange }: ColorSelectorProps) => {
  const { editor } = useEditor();
  if (!editor) return null;
  const activeColorItem = TEXT_COLORS.find(({ color }) =>
    editor.isActive('textStyle', { color })
  );

  return (
    <Popover
      modal
      open={open}
      onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button
          size="sm"
          className="hover:bg-accent-2 gap-2 rounded-none"
          variant="ghost">
          <span
            className="rounded-sm px-1"
            style={{
              color: activeColorItem?.color
            }}>
            A
          </span>
          <CaretDown className="h-4 w-4" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        sideOffset={5}
        className="my-1 flex max-h-80 w-48 flex-col overflow-hidden overflow-y-auto rounded border p-1 shadow-xl"
        align="start">
        <div className="flex flex-col">
          <div className="text-muted-foreground my-1 px-2 text-sm font-semibold">
            Color
          </div>
          {TEXT_COLORS.map(({ name, color }, index) => (
            <EditorBubbleItem
              key={index}
              onSelect={() => {
                editor.commands.unsetColor();
                name !== 'Default' &&
                  editor
                    .chain()
                    .focus()
                    .setColor(color ?? '')
                    .run();
                onOpenChange(false);
              }}
              className="hover:bg-accent-2 flex cursor-pointer items-center justify-between px-2 py-1 text-sm">
              <div className="flex items-center gap-2">
                <div
                  className="rounded-sm border px-2 py-px font-medium"
                  style={{ color }}>
                  A
                </div>
                <span>{name}</span>
              </div>
            </EditorBubbleItem>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};
