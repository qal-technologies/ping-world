'use client';

// jules edit: Highly perfected Chat & Post Mimicking workstation with theme switching, interactive comments, and branded image downloads
import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare,
  User,
  Send,
  Download,
  Plus,
  Trash2,
  Smile,
  Image as ImageIcon,
  Smartphone,
  ChevronLeft,
  MoreVertical,
  Camera,
  Settings2,
  Heart,
  MessageCircle,
  Share2,
  Repeat,
  Check,
  Bookmark,
  PlusCircle,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import html2canvas from 'html2canvas';

// --- Types ---
interface ChatMessage {
  id: string;
  sender: 'me' | 'them';
  text: string;
  timestamp: string;
}

interface PostComment {
  id: string;
  authorName: string;
  authorHandle: string;
  content: string;
  likes: number;
}

export default function ChatEditorPage() {
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState('chat-mimic');

  // --- Chat Mimic States ---
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: '1', sender: 'them', text: 'Hey! Did you see the new Ping World update?', timestamp: '12:00 PM' },
    { id: '2', sender: 'me', text: 'Not yet, what\'s new?', timestamp: '12:01 PM' },
  ]);
  const [inputText, setInputText] = useState('');
  const [editingName, setEditingName] = useState('Alex');
  const [chatTheme, setChatTheme] = useState<'whatsapp' | 'instagram' | 'x' | 'messenger'>('whatsapp');
  const chatRef = useRef<HTMLDivElement>(null);

  // --- Post Mimic States ---
  const [postAuthor, setPostAuthor] = useState('John Doe');
  const [postHandle, setPostHandle] = useState('johndoe_dev');
  const [postContent, setPostContent] = useState('Just compiled a magnificent multi-page PDF book in under 2 minutes on #ping-world! Exceptional speed and client-side security.');
  const [postLikes, setPostLikes] = useState(148);
  const [postReposts, setPostReposts] = useState(24);
  const [comments, setComments] = useState<PostComment[]>([
    { id: 'c-1', authorName: 'Sarah Smith', authorHandle: 'sarah_codes', content: 'Incredible, is the styling customizable too?', likes: 12 },
    { id: 'c-2', authorName: 'Ping World Official', authorHandle: 'ping_world', content: 'Yes! Fully customizable alignment, margins, and chapters! 🚀', likes: 45 }
  ]);
  const [commentName, setCommentName] = useState('');
  const [commentHandle, setCommentHandle] = useState('');
  const [commentBody, setCommentBody] = useState('');

  const postRef = useRef<HTMLDivElement>(null);

  // --- Chat Functions ---
  const addMessage = (sender: 'me' | 'them') => {
    if (!inputText.trim()) return;
    const newMessage: ChatMessage = {
      id: Math.random().toString(36).substr(2, 9),
      sender,
      text: inputText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages([...messages, newMessage]);
    setInputText('');
  };

  const removeMessage = (id: string) => {
    setMessages(messages.filter((m) => m.id !== id));
  };

  const exportChatAsImage = async () => {
    if (!chatRef.current) return;
    toast.loading('Compiling chat image...');
    try {
      const canvas = await html2canvas(chatRef.current, {
        backgroundColor: '#0F172A',
        useCORS: true,
        allowTaint: true,
      });

      // jules edit: inject ping-world watermark into exported image
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = 'rgba(0, 240, 255, 0.85)';
        ctx.font = 'bold 12px sans-serif';
        ctx.fillText('#ping-world chat-mimic', 20, canvas.height - 20);
      }

      canvas.toBlob((blob) => {
        if (!blob) {
          toast.dismiss();
          return toast.error('Export failed.');
        }
        const downloadUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `pingworld-chat-${editingName.toLowerCase()}.png`;
        link.href = downloadUrl;
        link.click();

        setTimeout(() => URL.revokeObjectURL(downloadUrl), 100);
        toast.dismiss();
        toast.success('Chat compiled with #ping-world tag & downloaded!');
      }, 'image/png');
    } catch (err) {
      toast.dismiss();
      toast.error('Export failed.');
    }
  };

  // --- Post Functions ---
  const handleAddComment = () => {
    if (!commentName.trim() || !commentBody.trim()) {
      return toast.error('Please enter comment author name and content body!');
    }
    const newComment: PostComment = {
      id: `c-${Date.now()}`,
      authorName: commentName.trim(),
      authorHandle: commentHandle.trim() || commentName.toLowerCase().replace(/\s+/g, ''),
      content: commentBody.trim(),
      likes: 0,
    };
    setComments([...comments, newComment]);
    setCommentName('');
    setCommentHandle('');
    setCommentBody('');
    toast.success('Mock comment appended!');
  };

  const removeComment = (id: string) => {
    setComments(comments.filter((c) => c.id !== id));
  };

  const exportPostAsImage = async () => {
    if (!postRef.current) return;
    toast.loading('Compiling post mockup card...');
    try {
      const canvas = await html2canvas(postRef.current, {
        backgroundColor: '#0A0C1B',
        useCORS: true,
        allowTaint: true,
      });

      // Inject watermark
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = 'rgba(0, 240, 255, 0.8)';
        ctx.font = 'bold 12px monospace';
        ctx.fillText('DESIGNED ON PING-WORLD.SITE', 20, canvas.height - 20);
      }

      canvas.toBlob((blob) => {
        if (!blob) {
          toast.dismiss();
          return toast.error('Export failed.');
        }
        const downloadUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `pingworld-post-${postHandle}.png`;
        link.href = downloadUrl;
        link.click();

        setTimeout(() => URL.revokeObjectURL(downloadUrl), 100);
        toast.dismiss();
        toast.success('Post mockup card saved successfully!');
      }, 'image/png');
    } catch (err) {
      toast.dismiss();
      toast.error('Compilation failed.');
    }
  };

  return (
    <div className='container mx-auto px-6 py-12 max-w-7xl min-h-[calc(100vh-64px)] pb-20'>
      <div className='flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12'>
        <div>
          <div className='badge mb-4'>
            <MessageSquare className='h-3.5 w-3.5' />
            Mimic Workshop
          </div>
          <h1 className='text-4xl font-extrabold font-display leading-[1.1]'>
            Social Mimic <span className='gradient-text'>& Editor.</span>
          </h1>
          <p className='mt-2 text-pw-muted text-sm leading-relaxed'>
            Create highly realistic mock chats and dynamic timeline posts with interactive comment sections. Perfect for content creators and storytelling.
          </p>
        </div>
      </div>

      <Tabs
        defaultValue='chat-mimic'
        onValueChange={setActiveWorkspaceTab}
        className='w-full space-y-6'>
        <TabsList className='bg-white/5 p-1 rounded-xl max-w-md mx-auto flex h-11'>
          <TabsTrigger value='chat-mimic' className='flex-1 h-9 rounded-lg text-xs gap-1.5 cursor-pointer'>
            <MessageCircle className='h-4 w-4' /> Chat Mimic
          </TabsTrigger>
          <TabsTrigger value='post-mimic' className='flex-1 h-9 rounded-lg text-xs gap-1.5 cursor-pointer'>
            <Sparkles className='h-4 w-4' /> Post Mimic
          </TabsTrigger>
        </TabsList>

        {/* CHAT MIMIC WORKSPACE */}
        <TabsContent value='chat-mimic' className='m-0'>
          <div className='grid grid-cols-1 lg:grid-cols-12 gap-8'>
            {/* Editor panel */}
            <div className='lg:col-span-5 space-y-6'>
              <Card className='card-glow p-6 space-y-6'>
                <div className='space-y-4'>
                  <label className='text-xs font-bold text-pw-muted uppercase block'>Theme & Contact Settings</label>
                  <div className='grid grid-cols-2 gap-4'>
                    <div className='space-y-1.5'>
                      <label className='text-[10px] text-pw-muted uppercase font-bold block'>Chat Theme</label>
                      <select
                        value={chatTheme}
                        onChange={(e) => setChatTheme(e.target.value as any)}
                        className='w-full h-10 rounded-xl bg-white/5 border border-white/10 px-3 text-xs focus:outline-none focus:border-pw-primary cursor-pointer'
                      >
                        <option value='whatsapp' className='bg-[#0A0C1B]'>WhatsApp</option>
                        <option value='instagram' className='bg-[#0A0C1B]'>Instagram</option>
                        <option value='x' className='bg-[#0A0C1B]'>X / Twitter</option>
                        <option value='messenger' className='bg-[#0A0C1B]'>Messenger</option>
                      </select>
                    </div>
                    <div className='space-y-1.5'>
                      <label className='text-[10px] text-pw-muted uppercase font-bold block'>Contact Name</label>
                      <Input
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className='bg-white/5 border-white/10 h-10 text-xs'
                      />
                    </div>
                  </div>
                </div>

                <div className='space-y-4 pt-4 border-t border-white/5'>
                  <label className='text-xs font-bold text-pw-muted uppercase block'>Compose Message</label>
                  <textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder='Type a message...'
                    className='w-full h-24 bg-white/5 border border-white/10 rounded-xl p-3 text-xs focus:border-pw-primary focus:outline-none resize-none'
                  />
                  <div className='grid grid-cols-2 gap-3'>
                    <Button
                      onClick={() => addMessage('them')}
                      variant='outline'
                      className='h-10 border-pw-secondary/20 hover:bg-pw-secondary/5 text-pw-secondary text-xs font-bold'
                    >
                      From {editingName}
                    </Button>
                    <Button onClick={() => addMessage('me')} className='btn-primary h-10 text-xs font-bold'>
                      From Me
                    </Button>
                  </div>
                </div>

                <div className='flex gap-2 pt-2 border-t border-white/5'>
                  <Button
                    onClick={() => setMessages([])}
                    variant='outline'
                    className='h-10 border-white/10 hover:bg-white/5 text-xs font-bold flex-1'
                  >
                    Clear All
                  </Button>
                  <Button onClick={exportChatAsImage} className='btn-primary h-10 text-xs font-bold flex-1'>
                    Download Chat Image
                  </Button>
                </div>
              </Card>

              {/* Message List Manager */}
              <div className='space-y-2.5'>
                <label className='text-xs font-bold text-pw-muted uppercase pl-2'>Message Stack</label>
                <div className='space-y-2 max-h-[250px] overflow-y-auto pr-1 custom-scrollbar'>
                  {messages.map((m) => (
                    <div key={m.id} className='p-3 bg-white/[0.01] border border-white/5 rounded-xl flex items-center justify-between group'>
                      <div className='flex items-center gap-2 max-w-[85%]'>
                        <span className={cn('text-[9px] font-bold px-1.5 py-0.5 rounded uppercase', m.sender === 'me' ? 'bg-pw-primary/20 text-pw-primary' : 'bg-pw-secondary/20 text-pw-secondary')}>
                          {m.sender === 'me' ? 'Me' : editingName}
                        </span>
                        <p className='text-xs truncate text-pw-text'>{m.text}</p>
                      </div>
                      <Button
                        size='icon'
                        variant='ghost'
                        onClick={() => removeMessage(m.id)}
                        className='h-7 w-7 text-pw-muted hover:text-pw-danger opacity-0 group-hover:opacity-100'
                      >
                        <Trash2 className='h-3.5 w-3.5' />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Live Device Preview panel */}
            <div className='lg:col-span-7 flex flex-col items-center justify-center p-6 bg-white/[0.01] border border-white/5 rounded-3xl relative'>
              <div className='text-xs font-bold text-pw-muted uppercase tracking-widest mb-4 flex items-center gap-2'>
                <Smartphone className='h-4 w-4 text-pw-primary' /> Live Mobile Preview
              </div>

              {/* Dynamic Theme Device Frame */}
              <div
                ref={chatRef}
                className={cn(
                  'w-full max-w-[360px] h-[640px] rounded-[40px] shadow-2xl border-[10px] border-slate-900 overflow-hidden flex flex-col relative',
                  chatTheme === 'whatsapp' && 'bg-[#e5ddd5] text-slate-800',
                  chatTheme === 'instagram' && 'bg-black text-white',
                  chatTheme === 'x' && 'bg-[#15202B] text-white',
                  chatTheme === 'messenger' && 'bg-white text-slate-900'
                )}
              >
                {/* Whatsapp Header */}
                {chatTheme === 'whatsapp' && (
                  <div className='bg-[#075e54] text-white px-5 pt-10 pb-3 flex items-center justify-between border-b border-black/10'>
                    <div className='flex items-center gap-2'>
                      <ChevronLeft className='h-5 w-5' />
                      <div className='h-8 w-8 rounded-full bg-slate-200 text-slate-600 font-bold flex items-center justify-center text-sm'>
                        {editingName[0]}
                      </div>
                      <div className='flex flex-col'>
                        <span className='text-xs font-bold'>{editingName}</span>
                        <span className='text-[8px] opacity-75'>online</span>
                      </div>
                    </div>
                    <MoreVertical className='h-4 w-4' />
                  </div>
                )}

                {/* Instagram Header */}
                {chatTheme === 'instagram' && (
                  <div className='bg-black text-white px-5 pt-10 pb-3 flex items-center justify-between border-b border-white/10'>
                    <div className='flex items-center gap-3'>
                      <ChevronLeft className='h-6 w-6' />
                      <div className='h-8 w-8 rounded-full bg-gradient-to-tr from-yellow-500 to-purple-600 p-0.5'>
                        <div className='h-full w-full rounded-full bg-black flex items-center justify-center text-xs font-bold'>
                          {editingName[0]}
                        </div>
                      </div>
                      <span className='text-xs font-bold'>{editingName}</span>
                    </div>
                    <MoreVertical className='h-5 w-5' />
                  </div>
                )}

                {/* X Header */}
                {chatTheme === 'x' && (
                  <div className='bg-[#15202B] text-white px-5 pt-10 pb-3 flex items-center justify-between border-b border-white/10'>
                    <div className='flex items-center gap-3'>
                      <ChevronLeft className='h-5 w-5 text-pw-primary' />
                      <div className='flex flex-col'>
                        <span className='text-xs font-bold'>{editingName}</span>
                        <span className='text-[9px] text-pw-muted'>@mock_user</span>
                      </div>
                    </div>
                    <Settings2 className='h-4 w-4 text-pw-primary' />
                  </div>
                )}

                {/* Messenger Header */}
                {chatTheme === 'messenger' && (
                  <div className='bg-white text-slate-900 px-5 pt-10 pb-3 flex items-center justify-between border-b border-slate-100'>
                    <div className='flex items-center gap-2'>
                      <ChevronLeft className='h-6 w-6 text-blue-500' />
                      <div className='h-8 w-8 rounded-full bg-slate-200 text-slate-800 font-bold flex items-center justify-center text-sm'>
                        {editingName[0]}
                      </div>
                      <span className='text-xs font-bold'>{editingName}</span>
                    </div>
                    <MoreVertical className='h-5 w-5 text-blue-500' />
                  </div>
                )}

                {/* Dynamic Message Bubbles Area */}
                <div className='flex-1 p-4 flex flex-col gap-3.5 overflow-y-auto custom-scrollbar'>
                  {messages.map((m) => {
                    const isMe = m.sender === 'me';
                    return (
                      <div
                        key={m.id}
                        className={cn(
                          'max-w-[75%] p-3 rounded-2xl text-xs shadow-sm flex flex-col relative',
                          chatTheme === 'whatsapp' ?
                            isMe ? 'bg-[#dcf8c6] text-slate-800 self-end rounded-tr-none' : 'bg-white text-slate-800 self-start rounded-tl-none'
                          : chatTheme === 'instagram' ?
                            isMe ? 'bg-[#3797f0] text-white self-end rounded-br-sm' : 'bg-[#262626] text-white self-start rounded-bl-sm'
                          : chatTheme === 'x' ?
                            isMe ? 'bg-[#1D9BF0] text-white self-end rounded-br-sm' : 'bg-[#2F3336] text-white self-start rounded-bl-sm'
                          : // Messenger default
                            isMe ? 'bg-[#0084FF] text-white self-end rounded-br-none' : 'bg-slate-100 text-slate-800 self-start rounded-bl-none'
                        )}
                      >
                        <p>{m.text}</p>
                        <span className={cn('text-[8px] text-right mt-1.5 block opacity-60', isMe ? 'text-slate-500' : 'text-slate-400')}>
                          {m.timestamp}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Footer Input placeholder */}
                <div className='p-3.5 border-t border-white/5 bg-black/10 flex items-center justify-between text-xs text-pw-muted font-mono'>
                  <span>#ping-world mimic layout</span>
                  <PlusCircle className='h-4.5 w-4.5' />
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* POST MIMIC WORKSPACE */}
        <TabsContent value='post-mimic' className='m-0'>
          <div className='grid grid-cols-1 lg:grid-cols-12 gap-8'>
            {/* Editor Config Left */}
            <div className='lg:col-span-5 space-y-6'>
              <Card className='card-glow p-6 space-y-4'>
                <h3 className='font-bold text-sm border-b border-white/5 pb-2'>Post Customizer</h3>
                <div className='grid grid-cols-2 gap-4'>
                  <div className='space-y-1.5'>
                    <label className='text-[10px] text-pw-muted uppercase font-bold block'>Author Name</label>
                    <Input
                      value={postAuthor}
                      onChange={(e) => setPostAuthor(e.target.value)}
                      className='bg-white/5 border-white/10 h-10 text-xs'
                    />
                  </div>
                  <div className='space-y-1.5'>
                    <label className='text-[10px] text-pw-muted uppercase font-bold block'>Handle</label>
                    <Input
                      value={postHandle}
                      onChange={(e) => setPostHandle(e.target.value)}
                      className='bg-white/5 border-white/10 h-10 text-xs font-mono'
                    />
                  </div>
                </div>

                <div className='space-y-1.5'>
                  <label className='text-[10px] text-pw-muted uppercase font-bold block'>Post Content</label>
                  <textarea
                    value={postContent}
                    onChange={(e) => setPostContent(e.target.value)}
                    className='w-full h-24 bg-white/5 border border-white/10 rounded-xl p-3 text-xs focus:border-pw-primary focus:outline-none resize-none'
                  />
                </div>

                <div className='grid grid-cols-2 gap-4'>
                  <div className='space-y-1.5'>
                    <label className='text-[10px] text-pw-muted uppercase font-bold block'>Likes Count</label>
                    <Input
                      type='number'
                      value={postLikes}
                      onChange={(e) => setPostLikes(parseInt(e.target.value) || 0)}
                      className='bg-white/5 border-white/10 h-10 text-xs'
                    />
                  </div>
                  <div className='space-y-1.5'>
                    <label className='text-[10px] text-pw-muted uppercase font-bold block'>Reposts Count</label>
                    <Input
                      type='number'
                      value={postReposts}
                      onChange={(e) => setPostReposts(parseInt(e.target.value) || 0)}
                      className='bg-white/5 border-white/10 h-10 text-xs'
                    />
                  </div>
                </div>

                <Button onClick={exportPostAsImage} className='btn-primary h-11 w-full text-xs font-bold gap-2'>
                  <Download className='h-4 w-4' /> Download Post Mockup Image
                </Button>
              </Card>

              {/* Comments Section Manager */}
              <Card className='card-glow p-6 space-y-4'>
                <h4 className='font-bold text-sm border-b border-white/5 pb-2'>Add Mock Comment</h4>
                <div className='grid grid-cols-2 gap-4'>
                  <Input
                    placeholder='Sarah Smith'
                    value={commentName}
                    onChange={(e) => setCommentName(e.target.value)}
                    className='bg-white/5 border-white/10 h-10 text-xs'
                  />
                  <Input
                    placeholder='sarah_codes'
                    value={commentHandle}
                    onChange={(e) => setCommentHandle(e.target.value)}
                    className='bg-white/5 border-white/10 h-10 text-xs font-mono'
                  />
                </div>
                <textarea
                  placeholder='Write comment content...'
                  value={commentBody}
                  onChange={(e) => setCommentBody(e.target.value)}
                  className='w-full h-20 bg-white/5 border border-white/10 rounded-xl p-3 text-xs focus:border-pw-primary focus:outline-none resize-none'
                />
                <Button onClick={handleAddComment} className='w-full h-10 bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold gap-2'>
                  <PlusCircle className='h-4 w-4 text-pw-primary' /> Add Comment
                </Button>
              </Card>
            </div>

            {/* Post Design Preview Right */}
            <div className='lg:col-span-7 flex flex-col items-center justify-center p-6 bg-white/[0.01] border border-white/5 rounded-3xl relative'>
              <div className='text-xs font-bold text-pw-muted uppercase tracking-widest mb-4 flex items-center gap-2'>
                <Smartphone className='h-4 w-4 text-pw-primary' /> Live Feed Preview
              </div>

              {/* Social Media Tweet Card Frame */}
              <div
                ref={postRef}
                className='w-full max-w-[480px] bg-[#15202B] text-white rounded-3xl border border-white/10 p-6 flex flex-col gap-4 shadow-2xl'
              >
                {/* Author profile row */}
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-3'>
                    <div className='h-11 w-11 rounded-full bg-pw-primary/10 border border-pw-primary/30 flex items-center justify-center text-sm font-bold text-pw-primary'>
                      {postAuthor[0]}
                    </div>
                    <div className='flex flex-col'>
                      <span className='text-sm font-bold flex items-center gap-1'>
                        {postAuthor}
                        <Check className='h-3.5 w-3.5 text-[#1D9BF0] fill-[#1D9BF0]' />
                      </span>
                      <span className='text-xs text-pw-muted'>@{postHandle}</span>
                    </div>
                  </div>
                  <MoreVertical className='h-4 w-4 text-pw-muted' />
                </div>

                {/* Post body */}
                <p className='text-sm leading-relaxed text-white whitespace-pre-wrap font-body'>
                  {postContent}
                </p>

                {/* Interactive metrics row */}
                <div className='flex items-center justify-between border-y border-white/5 py-3 text-xs text-pw-muted font-mono'>
                  <span className='flex items-center gap-1.5'>
                    <Repeat className='h-4 w-4 text-emerald-400' /> {postReposts}
                  </span>
                  <span className='flex items-center gap-1.5'>
                    <Heart className='h-4 w-4 text-rose-500 fill-rose-500' /> {postLikes}
                  </span>
                  <span className='flex items-center gap-1.5'>
                    <MessageCircle className='h-4 w-4 text-[#1D9BF0]' /> {comments.length}
                  </span>
                  <Bookmark className='h-4 w-4' />
                </div>

                {/* Comment Section List */}
                <div className='space-y-4 pt-1'>
                  {comments.map((comment) => (
                    <div key={comment.id} className='flex items-start gap-3 text-xs border-b border-white/[0.03] pb-3 last:border-0 group'>
                      <div className='h-8 w-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-xs font-bold text-pw-muted'>
                        {comment.authorName[0]}
                      </div>
                      <div className='flex-1 space-y-1'>
                        <div className='flex items-center justify-between'>
                          <div className='flex items-baseline gap-1.5'>
                            <span className='font-bold text-white'>{comment.authorName}</span>
                            <span className='text-[10px] text-pw-muted'>@{comment.authorHandle}</span>
                          </div>
                          <Button
                            size='icon'
                            variant='ghost'
                            onClick={() => removeComment(comment.id)}
                            className='h-6 w-6 text-pw-muted hover:text-pw-danger opacity-0 group-hover:opacity-100'
                          >
                            <Trash2 className='h-3 w-3' />
                          </Button>
                        </div>
                        <p className='text-pw-muted leading-relaxed font-body'>{comment.content}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Brand water mark footer inside frame */}
                <div className='pt-2 border-t border-white/5 flex justify-between items-center text-[10px] text-pw-primary/60 font-mono'>
                  <span>DESIGNED ON PING-WORLD.SITE</span>
                  <span>#ping-world watermark</span>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
