"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
// import TextStyle from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import { 
  Bold, 
  Italic, 
  Underline as UnderlineIcon, 
  List, 
  ListOrdered, 
  Quote, 
  Code, 
  Link as LinkIcon, 
  Heading1,
  Heading2,
  Undo,
  Redo,
  Highlighter
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const MenuButton = ({ 
  onClick, 
  active, 
  children, 
  disabled 
}: { 
  onClick: () => void; 
  active?: boolean; 
  children: React.ReactNode;
  disabled?: boolean;
}) => (
  <Button
    variant="ghost"
    size="icon"
    onClick={(e) => {
      e.preventDefault();
      onClick();
    }}
    disabled={disabled}
    className={cn(
      "h-8 w-8 rounded-md transition-colors",
      active ? "bg-pw-primary text-white" : "text-pw-muted hover:text-pw-text hover:bg-white/5"
    )}
  >
    {children}
  </Button>
);

export default function TiptapEditor({ 
  content, 
  onChange 
}: { 
  content: string; 
  onChange: (html: string) => void;
}) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
    //   TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-pw-primary underline underline-offset-4 cursor-pointer",
        },
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: "prose prose-invert max-w-none focus:outline-none min-h-[400px] p-8 text-pw-text/90",
      },
    },
  });

  // jules edit: Update editor content when the active note/document content changes
  const { useEffect } = require("react");
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  if (!editor) return null;

  const setLink = () => {
    const url = window.prompt("URL");
    if (url) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  };

  return (
    <Card className="card-glow overflow-hidden bg-pw-surface/50 border-white/5">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 p-2 border-b border-white/5 bg-white/5">
        <div className="flex items-center gap-1 pr-2 border-r border-white/5">
          <MenuButton 
            onClick={() => editor.chain().focus().toggleBold().run()} 
            active={editor.isActive("bold")}
          >
            <Bold className="h-4 w-4" />
          </MenuButton>
          <MenuButton 
            onClick={() => editor.chain().focus().toggleItalic().run()} 
            active={editor.isActive("italic")}
          >
            <Italic className="h-4 w-4" />
          </MenuButton>
          <MenuButton 
            onClick={() => editor.chain().focus().toggleUnderline().run()} 
            active={editor.isActive("underline")}
          >
            <UnderlineIcon className="h-4 w-4" />
          </MenuButton>
        </div>

        <div className="flex items-center gap-1 px-2 border-r border-white/5">
          <MenuButton 
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} 
            active={editor.isActive("heading", { level: 1 })}
          >
            <Heading1 className="h-4 w-4" />
          </MenuButton>
          <MenuButton 
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} 
            active={editor.isActive("heading", { level: 2 })}
          >
            <Heading2 className="h-4 w-4" />
          </MenuButton>
        </div>

        <div className="flex items-center gap-1 px-2 border-r border-white/5">
          <MenuButton 
            onClick={() => editor.chain().focus().toggleBulletList().run()} 
            active={editor.isActive("bulletList")}
          >
            <List className="h-4 w-4" />
          </MenuButton>
          <MenuButton 
            onClick={() => editor.chain().focus().toggleOrderedList().run()} 
            active={editor.isActive("orderedList")}
          >
            <ListOrdered className="h-4 w-4" />
          </MenuButton>
        </div>

        <div className="flex items-center gap-1 px-2 border-r border-white/5">
          <MenuButton 
            onClick={() => editor.chain().focus().toggleBlockquote().run()} 
            active={editor.isActive("blockquote")}
          >
            <Quote className="h-4 w-4" />
          </MenuButton>
          <MenuButton 
            onClick={() => editor.chain().focus().toggleCodeBlock().run()} 
            active={editor.isActive("codeBlock")}
          >
            <Code className="h-4 w-4" />
          </MenuButton>
        </div>

        <div className="flex items-center gap-1 px-2 border-r border-white/5">
          <MenuButton onClick={setLink} active={editor.isActive("link")}>
            <LinkIcon className="h-4 w-4" />
          </MenuButton>
          <MenuButton 
            onClick={() => editor.chain().focus().toggleHighlight().run()} 
            active={editor.isActive("highlight")}
          >
            <Highlighter className="h-4 w-4" />
          </MenuButton>
        </div>

        <div className="flex items-center gap-1 px-2">
          <MenuButton 
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
          >
            <Undo className="h-4 w-4" />
          </MenuButton>
          <MenuButton 
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
          >
            <Redo className="h-4 w-4" />
          </MenuButton>
        </div>
      </div>

      {/* Editor Content */}
      <EditorContent editor={editor} />
    </Card>
  );
}

