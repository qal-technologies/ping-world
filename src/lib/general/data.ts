import {Brain, ImageIcon, Link2, MessageCircle, Palette, PenTool, QrCode, Type} from "lucide-react";

export const tools = [
  {
    icon: Brain,
    title: 'Quizzable',
    description:
      'Create interactive quizzes for your audience. Export to JSON or share link to your audience instantly.',
    href: '/quiz',
    color: '#18cb83ff',
    tag: 'Powerful',
    id: 'quizzable',
    category: 'Engagement',
    version: { v: '1.0', s: 'Stable' },
  },
  {
    icon: PenTool,
    title: 'Creator Hub',
    description:
      'The ultimate social creator hub to make posts, with translation, grammar check, AI assistance and more.',
    href: '/composer',
    color: '#0ebae1ff',
    tag: 'Creative',
    category: 'Engagement',
    id: 'composer',
    version: { v: '1.0', s: 'Stable' },
  },
  {
    icon: MessageCircle,
    id: 'anonlink',
    category: 'Communication',
    title: 'Anonymous Link',
    description:
      'Send and receive anonymous messages with secure end-to-end encryption features.',
    href: '/message',
    color: '#7b8afbff',
    tag: 'Popular',
    version: { v: '1.0', s: 'Stable' },
  },
  {
    icon: Type,
    title: 'Text Editor',
    category: 'Content',
    id: 'editor',
    description:
      'Top notch all-in-one text editor with post card generation and export options.',
    href: '/editor',
    color: '#f622fdff',
    tag: 'Utility',
    version: { v: '1.0', s: 'Stable' },
  },
  {
    icon: ImageIcon,
    title: 'Image Toolkit',
    description:
      'Premium image editing tools. Edit, convert, compress, and remove backgrounds from images directly in the browser.',
    href: '/image',
    color: '#FFB347',
    tag: 'New',
    id: 'image',
    category: 'Media',
    version: { v: '1.0', s: 'Stable' },
  },
  {
    icon: Link2,
    title: 'URL Shortener',
    description:
      'More than a link shortener. Generate QR codes and track link health with advanced local analytics.',
    href: '/tools/url-shortener',
    color: '#fe7790ff',
    tag: 'Utility',
    id: 'shortener',
    category: 'Utility',
    version: { v: '1.0', s: 'Stable' },
  },
  {
    icon: QrCode,
    title: 'QR Code Generator',
    description:
      'More than a shortener. Generate QR codes and track link health with advanced local analytics.',
    href: '/tools/qr-code',
    color: '#adff72ff',
    tag: 'Utility',
    category: 'Utility',
    id: 'qr-code',
    version: { v: '1.0', s: 'Stable' },
  },
  {
    icon: Palette,
    title: 'Color Palette',
    description:
      'More color manipulation tools with color generation, extraction, color picker, color randomizer and more.',
    href: '/tools/colors',
    color: '#ea6b89ff',
    tag: 'Utility',
    id: 'color-palette',
    category: 'Utility',
    version: { v: '1.0', s: 'Stable' },
  },
];
