import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQuery } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { 
  Send, Upload, Paperclip, FileText, AlertCircle, 
  Wrench, Shield, Brain, Loader2, Plus, Settings,
  ChevronDown, ChevronUp, File, X
} from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  attachments?: FileAttachment[];
  tools?: ToolCall[];
  status?: 'sending' | 'sent' | 'error';
}

interface FileAttachment {
  name: string;
  type: string;
  size: number;
  status: 'uploading' | 'uploaded' | 'processing' | 'processed' | 'error';
  url?: string;
}

interface ToolCall {
  tool: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  result?: any;
}

interface ChatSession {
  id: string;
  title: string;
  createdAt: Date;
  lastMessage?: string;
}

export function SopgridChat() {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: `🔧 **Welcome to SOPGRID - Your All-in-One RV Technician Assistant!**

I automatically integrate ALL system capabilities to give you comprehensive, compliant answers:

• **Complete SOP Generation** - Safety-verified procedures with OSHA/EPA compliance built-in
• **Smart Troubleshooting** - Diagnostic trees and step-by-step repair guides
• **Auto Compliance Checking** - Every response verified against safety standards
• **Document Analysis** - Upload manuals and I'll extract relevant procedures
• **Equipment-Specific Help** - Generators, water heaters, solar, electrical, plumbing

**Just ask naturally!** Examples:
- "How do I repair a generator that won't start?"
- "SOP for replacing a water heater"
- "Troubleshoot my solar panels not charging"
- "Safety procedure for electrical work"

Upload manuals, describe problems, or ask questions. I'll automatically use troubleshooting, compliance checks, and document analysis to give you the most complete answer!`,
      timestamp: new Date()
    }
  ]);
  
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>('default');
  const [showSidebar, setShowSidebar] = useState(true);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  // Send message mutation
  const sendMessage = useMutation({
    mutationFn: async (data: { message: string; attachments?: FormData }) => {
      const response = await fetch('/api/chat/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: data.message,
          sessionId: currentSessionId,
          context: {
            previousMessages: messages.slice(-5) // Send last 5 messages for context
          }
        })
      });
      return response.json();
    },
    onSuccess: (data) => {
      // Add assistant response
      const assistantMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
        tools: data.toolCalls
      };
      setMessages(prev => [...prev, assistantMessage]);
      setIsTyping(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive"
      });
      setIsTyping(false);
    }
  });

  // Upload file mutation
  const uploadFile = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'manual'); // Specify this is a manual upload
      
      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData
      });
      return response.json();
    },
    onSuccess: (data, file) => {
      toast({
        title: "File Uploaded",
        description: `${file.name} has been uploaded and is being processed.`
      });
      
      // Add system message about file processing
      const systemMessage: Message = {
        id: Date.now().toString(),
        role: 'system',
        content: `📄 Processing manual: **${file.name}**\n\nThe document is being parsed, vectorized, and indexed for intelligent search and troubleshooting.`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, systemMessage]);
    },
    onError: (error, file) => {
      toast({
        title: "Upload Failed",
        description: `Failed to upload ${file.name}`,
        variant: "destructive"
      });
    }
  });

  const handleSend = async () => {
    if (!input.trim() && attachedFiles.length === 0) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
      attachments: attachedFiles.map(f => ({
        name: f.name,
        type: f.type,
        size: f.size,
        status: 'uploading' as const
      })),
      status: 'sending'
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    // Upload files if any
    for (const file of attachedFiles) {
      await uploadFile.mutateAsync(file);
    }
    setAttachedFiles([]);

    // Send message
    await sendMessage.mutateAsync({ message: userMessage.content });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachedFiles(prev => [...prev, ...files]);
  };

  const removeAttachedFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const createNewSession = () => {
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: 'New Chat',
      createdAt: new Date()
    };
    setSessions(prev => [...prev, newSession]);
    setCurrentSessionId(newSession.id);
    setMessages([messages[0]]); // Keep welcome message
  };

  const renderMessage = (message: Message) => {
    const isUser = message.role === 'user';
    const isSystem = message.role === 'system';
    
    return (
      <div
        key={message.id}
        className={`flex gap-3 p-6 ${isUser ? 'bg-gray-800/60 border-l-4 border-blue-700' : ''} ${isSystem ? 'bg-blue-900/30 border-l-4 border-cyan-500' : ''} ${!isUser && !isSystem ? 'bg-gray-700/40' : ''}`}
      >
        <Avatar className="w-10 h-10 flex-shrink-0">
          <AvatarFallback className={isUser ? 'bg-blue-800 text-white font-bold' : isSystem ? 'bg-cyan-600 text-white font-bold' : 'bg-gradient-to-br from-blue-700 to-cyan-500 text-white font-bold'}>
            {isUser ? 'U' : isSystem ? 'S' : 'SG'}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-base text-white">
              {isUser ? 'You' : isSystem ? 'System' : 'SOPGRID Assistant'}
            </span>
            <span className="text-sm text-gray-300">
              {message.timestamp.toLocaleTimeString()}
            </span>
            {message.status === 'sending' && (
              <Loader2 className="w-3 h-3 animate-spin text-blue-700" />
            )}
          </div>
          
          <div className="text-gray-100 leading-relaxed">
            {message.content.split('\n').map((line, i) => (
              <p key={i} className="mb-3 text-base">{line}</p>
            ))}
          </div>
          
          {message.attachments && message.attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {message.attachments.map((file, i) => (
                <Badge key={i} variant="secondary" className="flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  {file.name}
                  {file.status === 'uploading' && <Loader2 className="w-3 h-3 animate-spin ml-1" />}
                </Badge>
              ))}
            </div>
          )}
          
          {message.tools && message.tools.length > 0 && (
            <div className="mt-3 space-y-2">
              <div className="text-sm text-gray-200 font-medium">Tools Used:</div>
              {message.tools.map((tool, i) => (
                <div key={i} className="flex items-center gap-2 text-sm bg-gray-700/50 rounded p-2">
                  {tool.tool === 'troubleshooting' && <Wrench className="w-3 h-3 text-orange-500" />}
                  {tool.tool === 'compliance' && <Shield className="w-3 h-3 text-green-500" />}
                  {tool.tool === 'sop_generation' && <FileText className="w-3 h-3 text-blue-700" />}
                  {tool.tool === 'analysis' && <Brain className="w-3 h-3 text-purple-500" />}
                  <span className="font-medium">{tool.tool}</span>
                  <Badge variant={tool.status === 'completed' ? 'default' : tool.status === 'error' ? 'destructive' : 'secondary'} className="ml-auto text-xs">
                    {tool.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-screen relative overflow-hidden">
      {/* Let the main background show through with subtle overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-900/20 to-slate-900/40 pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(6,182,212,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.02)_1px,transparent_1px)] bg-[size:60px_60px] pointer-events-none" />
      {/* Industrial Sidebar */}
      <div className={`${showSidebar ? 'w-64' : 'w-0'} transition-all duration-300 overflow-hidden bg-gray-800/95 backdrop-blur-xl border-r border-cyan-500/50 relative z-10`}>
        <div className="p-4 border-b border-cyan-500/50 bg-gradient-to-b from-gray-800 to-transparent">
          <Button 
            onClick={createNewSession}
            className="w-full bg-cyan-500/20 border border-cyan-500 hover:bg-cyan-500/30 text-cyan-300 hover:text-white transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)]"
            data-testid="button-new-chat"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Chat
          </Button>
        </div>
        
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-2">
            <div className="text-sm text-gray-200 font-medium mb-2">Recent Chats</div>
            {sessions.map(session => (
              <Button
                key={session.id}
                variant={currentSessionId === session.id ? 'secondary' : 'ghost'}
                className="w-full justify-start text-left"
                onClick={() => setCurrentSessionId(session.id)}
              >
                <div className="truncate">
                  <div className="text-sm font-medium">{session.title}</div>
                  {session.lastMessage && (
                    <div className="text-sm text-gray-300 truncate">{session.lastMessage}</div>
                  )}
                </div>
              </Button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-900/5 via-transparent to-blue-950/5 pointer-events-none" />
        {/* Industrial Header */}
        <div className="bg-gray-800/90 backdrop-blur-xl border-b border-cyan-500/50 p-4 flex items-center justify-between relative z-20">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setShowSidebar(!showSidebar)}
              data-testid="button-toggle-sidebar"
            >
              {showSidebar ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-800 flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.5)]">
              <span className="text-white text-xl font-bold">S</span>
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-blue-700 bg-clip-text text-transparent">
                SOPGRID ASSISTANT
              </h1>
              <p className="text-sm text-gray-200">Industrial Multi-Agent System</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-green-500/50 text-green-400">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse" />
              All Systems Active
            </Badge>
            <Button variant="ghost" size="sm">
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Messages Area */}
        <ScrollArea className="flex-1" ref={scrollAreaRef}>
          <div className="max-w-4xl mx-auto">
            {messages.map(renderMessage)}
            
            {isTyping && (
              <div className="flex gap-3 p-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-800 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.4)]">
                  <span className="text-white text-sm font-bold">S</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce shadow-[0_0_10px_rgba(6,182,212,0.6)]" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce shadow-[0_0_10px_rgba(6,182,212,0.6)]" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce shadow-[0_0_10px_rgba(6,182,212,0.6)]" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="text-sm text-gray-200">SOPGRID is thinking...</span>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Professional RV Shop Input Area */}
        <div className="bg-slate-800/80 backdrop-blur-xl border-t border-cyan-500/50 p-6">
          <div className="max-w-4xl mx-auto space-y-3">
            {/* Attached Files */}
            {attachedFiles.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {attachedFiles.map((file, i) => (
                  <Badge key={i} variant="secondary" className="flex items-center gap-1 pr-1">
                    <Paperclip className="w-3 h-3" />
                    <span className="text-xs">{file.name}</span>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-4 w-4 p-0 ml-1"
                      onClick={() => removeAttachedFile(i)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            )}
            
            {/* Input Controls */}
            <div className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileSelect}
                className="hidden"
                accept=".pdf,.txt,.doc,.docx,.md"
              />
              
              <Button
                variant="ghost"
                size="icon"
                onClick={() => fileInputRef.current?.click()}
                className="flex-shrink-0"
                data-testid="button-attach-file"
              >
                <Paperclip className="w-5 h-5" />
              </Button>
              
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about SOPs, upload manuals, describe failures, or request troubleshooting help..."
                className="flex-1 min-h-[60px] max-h-[200px] bg-gray-700/70 border-cyan-500/70 text-white placeholder:text-gray-300 focus:border-cyan-400 text-base"
                data-testid="input-message"
              />
              
              <Button
                onClick={handleSend}
                disabled={(!input.trim() && attachedFiles.length === 0) || sendMessage.isPending}
                className="flex-shrink-0 bg-blue-800 hover:bg-blue-900"
                data-testid="button-send"
              >
                {sendMessage.isPending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </Button>
            </div>
            
            {/* Quick Actions */}
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-200 hover:text-white text-sm"
                onClick={() => setInput('Generate an SOP for ')}
              >
                Generate SOP
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-200 hover:text-white text-sm"
                onClick={() => setInput('Troubleshoot: ')}
              >
                Start Troubleshooting
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-200 hover:text-white text-sm"
                onClick={() => setInput('Check compliance for ')}
              >
                Check Compliance
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-200 hover:text-white text-sm"
                onClick={() => setInput('Analyze document: ')}
              >
                Analyze Document
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}