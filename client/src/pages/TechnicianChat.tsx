import { useState, useRef, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Send, 
  Paperclip, 
  Trash2, 
  Wrench, 
  FileText, 
  AlertCircle,
  CheckCircle,
  Clock,
  Bot,
  User,
  Loader2,
  LogOut
} from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
  data?: any;
  suggestions?: string[];
}

interface ChatResponse {
  message: string;
  data?: any;
  actions?: string[];
  requiresConfirmation?: boolean;
  suggestions?: string[];
}

import shopBayBg from '@assets/generated_images/Shop_with_purple_ISC_toolbox_2da482ab.png';
import iscLogo from '@assets/generated_images/ISC_neon_text_only_d48fd1de.png';
import sopgridLogo from '@assets/generated_images/SOPGRID_text_logo_only_2f343ebb.png';

export default function TechnicianChat() {
  const { logout } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "🔧 **PROMPT BUILDER - Build Your Request Word by Word**\n\n**Required Format - Fill in each word:**\n\n**1st Word (Manufacturer):** Lippert, Dometic, Norcold, Atwood, etc.\n**2nd Word (Document Type):** SOP, TROUBLESHOOTER, MANUAL, GUIDE\n**3rd Word (Action):** REPLACE, REPAIR, FIX, DIAGNOSE, INSTALL, ADJUST\n**4th Word (Component):** JACK, PUMP, VALVE, MOTOR, SWITCH, BELT\n**5th Word (Location/Detail):** REAR, FRONT, DRIVER, PASSENGER, HYDRAULIC\n\n**Example:** \"Lippert SOP replace jack rear driver side bolt\"\n**Example:** \"Dometic TROUBLESHOOTER diagnose furnace ignition failure\"\n**Example:** \"Atwood MANUAL repair water heater thermostat\"\n\n**Build your prompt following this structure for accurate results.**",
      timestamp: new Date(),
      suggestions: [
        "Lippert SOP replace jack hydraulic",
        "Dometic TROUBLESHOOTER diagnose furnace", 
        "Norcold MANUAL repair refrigerator",
        "Atwood SOP fix water heater"
      ]
    }
  ]);
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Get user info from session
  const { data: userInfo } = useQuery({
    queryKey: ['/api/auth/user'],
    retry: false
  });

  // Chat mutation
  const chatMutation = useMutation({
    mutationFn: async (data: { message: string; attachments?: File[] }) => {
      const formData = new FormData();
      formData.append('message', data.message);
      
      if (data.attachments) {
        data.attachments.forEach(file => {
          formData.append('attachments', file);
        });
      }

      const res = await fetch('/api/technician/chat', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`${res.status}: ${text || res.statusText}`);
      }
      
      return res.json() as Promise<ChatResponse>;
    },
    onSuccess: (response: ChatResponse) => {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: response.message,
        timestamp: new Date(),
        data: response.data,
        suggestions: response.suggestions
      }]);
      
      if (response.requiresConfirmation) {
        toast({
          title: "Confirmation Required",
          description: "Please confirm the action in the chat.",
        });
      }
    },
    onError: (error: any) => {
      // Check for external service issues
      const errorMessage = error.message || "Failed to process message";
      
      if (errorMessage.includes("Overloaded") || errorMessage.includes("529")) {
        toast({
          title: "⚠️ ANTHROPIC SERVERS ARE CURRENTLY UNDER STRESS",
          description: "FUNCTIONS MAY TAKE LONGER TILL SERVERS DESTRESS - Your request will continue processing with available services",
          variant: "destructive",
          duration: 8000
        });
      } else if (errorMessage.includes("rate limit") || errorMessage.includes("429")) {
        toast({
          title: "⚠️ API RATE LIMIT REACHED",
          description: "SYSTEM AUTOMATICALLY RETRYING - Please wait a moment",
          variant: "destructive",
          duration: 6000
        });
      } else {
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive"
        });
      }
      
      setMessages(prev => [...prev, {
        role: 'system',
        content: "❌ Error: " + errorMessage,
        timestamp: new Date()
      }]);
    }
  });

  // Clear context mutation
  const clearMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/technician/chat/clear');
      return res.json();
    },
    onSuccess: () => {
      setMessages([{
        role: 'assistant',
        content: "🔄 **CONVERSATION CLEARED**\n\nWhat system are you working on?\n\nCommon RV systems:\n• Electrical/Generator\n• Plumbing/Water heater\n• HVAC/Furnace/AC\n• Slide-outs\n• Leveling jacks\n• Brakes\n• Propane/Gas\n• Awnings",
        timestamp: new Date(),
        suggestions: [
          "Furnace not working",
          "Jacks not extending", 
          "Generator won't start",
          "Show system status"
        ]
      }]);
      toast({
        title: "Context Cleared",
        description: "Starting a new conversation",
      });
    }
  });

  // Quick action mutation
  const quickActionMutation = useMutation({
    mutationFn: async (action: string) => {
      const res = await apiRequest('POST', '/api/technician/chat/quick-action', { action });
      return res.json() as Promise<ChatResponse>;
    },
    onSuccess: (response: ChatResponse) => {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: response.message,
        timestamp: new Date(),
        data: response.data,
        suggestions: response.suggestions
      }]);
    }
  });

  // Handle sending message
  const handleSend = () => {
    if (!input.trim() && attachments.length === 0) return;

    // Add user message to chat
    const userMessage: Message = {
      role: 'user',
      content: input || (attachments.length > 0 ? `Uploading ${attachments.length} file(s)` : ''),
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);

    // Send to backend
    chatMutation.mutate({ 
      message: input || `Uploading ${attachments.length} file(s)`,
      attachments: attachments.length > 0 ? attachments : undefined
    });

    // Clear input and attachments
    setInput('');
    setAttachments([]);
  };

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachments(Array.from(e.target.files));
    }
  };

  // Handle suggestion click
  const handleSuggestion = (suggestion: string) => {
    setInput(suggestion);
  };

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  // Get role badge color
  const getRoleBadge = () => {
    if (!userInfo) return null;
    const role = (userInfo as any).role || 'technician';
    const colors = {
      super_admin: 'bg-red-500',
      admin: 'bg-orange-500',
      technician: 'bg-blue-700'
    };
    return (
      <Badge className={colors[role as keyof typeof colors] || 'bg-gray-500'}>
        {role.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  return (
    <div className="relative flex flex-col h-screen">
      {/* Professional Shop Bay Background with Purple ISC Toolbox */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url(${shopBayBg})`,
          filter: 'brightness(1.1) contrast(1.05)',
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/10" />
      
      {/* Content Layer */}
      <div className="relative z-10 flex flex-col h-screen">
        {/* Header with SOPGRID Logo */}
        <div className="px-4 py-3 flex items-center justify-between" style={{
          background: 'transparent',
          border: 'none',
          boxShadow: 'none'
        }}>
          <div className="flex items-center gap-4">
            <img 
              src={sopgridLogo} 
              alt="SOPGRID" 
              className="h-10 w-auto opacity-95 hover:opacity-100 transition-opacity"
            />
            <div className="h-6 w-px bg-white/30" />
            <div className="flex items-center gap-3">
              <Bot className="h-6 w-6 text-blue-600" />
              <Badge variant="outline" className="text-white border-white/30 bg-white/10">
                SUPER ADMIN
              </Badge>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => quickActionMutation.mutate('system_status')}
                disabled={quickActionMutation.isPending}
                className="border-white/20 text-white/90 hover:bg-white/10"
              >
                <AlertCircle className="h-4 w-4 mr-1" />
                Status
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => clearMutation.mutate()}
                disabled={clearMutation.isPending}
                className="border-white/20 text-white/90 hover:bg-white/10"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Clear
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={logout}
                className="border-white/20 text-white/90 hover:bg-white/10"
              >
                <LogOut className="h-4 w-4 mr-1" />
                Logout
              </Button>
            </div>
          </div>
        </div>

        {/* Chat Messages */}
        <ScrollArea ref={scrollAreaRef} className="flex-1 p-4" style={{
          background: 'transparent'
        }}>
          <div className="space-y-4 max-w-4xl mx-auto">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex gap-3 ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {message.role !== 'user' && (
                <div className="flex-shrink-0">
                  {message.role === 'assistant' ? (
                    <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                    }}>
                      <Bot className="h-5 w-5 text-white" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center">
                      <AlertCircle className="h-5 w-5 text-destructive" />
                    </div>
                  )}
                </div>
              )}
              
              <div className={`max-w-[80%] p-4 ${message.role === 'user' || message.role === 'assistant' ? 'rounded-lg' : ''}`} style={{
                background: message.role === 'user' || message.role === 'assistant' 
                  ? 'rgba(41, 91, 172, 0.25)' 
                  : 'transparent',
                border: message.role === 'user' || message.role === 'assistant' ? '1px solid rgba(255,255,255,0.1)' : 'none',
                boxShadow: 'none'
              }}>
                <div className="whitespace-pre-wrap text-sm font-bold" style={{
                  color: 'white',
                  textShadow: '0 2px 6px rgba(0, 0, 0, 0.9), 0 1px 2px rgba(0, 0, 0, 0.6)',
                  lineHeight: '1.6'
                }}>{message.content}</div>
                
                {/* Suggestions */}
                {message.suggestions && message.suggestions.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {message.suggestions.map((suggestion, idx) => (
                      <Button
                        key={idx}
                        variant="outline"
                        size="sm"
                        onClick={() => handleSuggestion(suggestion)}
                        className="text-xs border-white/20 text-white hover:bg-white/10 bg-white/5"
                      >
                        {suggestion}
                      </Button>
                    ))}
                  </div>
                )}

                {/* Timestamp */}
                {message.timestamp && (
                  <div className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </div>
                )}
              </div>

              {message.role === 'user' && (
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                    <User className="h-5 w-5" />
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Loading indicator */}
          {chatMutation.isPending && (
            <div className="flex gap-3 justify-start">
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
              }}>
                <Bot className="h-5 w-5 text-white" />
              </div>
              <div className="p-3 rounded-lg" style={{ 
                background: 'rgba(41, 91, 172, 0.25)',
                border: '1px solid rgba(255,255,255,0.1)',
                boxShadow: 'none'
              }}>
                <div className="flex items-center gap-2 text-sm font-bold" style={{ 
                  color: 'white',
                  textShadow: '0 2px 6px rgba(0, 0, 0, 0.9), 0 1px 2px rgba(0, 0, 0, 0.6)'
                }}>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing your request...
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="p-4" style={{
        background: 'transparent',
        border: 'none',
        boxShadow: 'none'
      }}>
        <div className="max-w-4xl mx-auto">
          {/* Attachments */}
          {attachments.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {attachments.map((file, index) => (
                <Badge key={index} variant="secondary" className="flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  {file.name}
                  <button
                    onClick={() => setAttachments(prev => prev.filter((_, i) => i !== index))}
                    className="ml-1 hover:text-destructive"
                  >
                    ×
                  </button>
                </Badge>
              ))}
            </div>
          )}

          {/* Input controls */}
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.txt,.doc,.docx"
              onChange={handleFileSelect}
              className="hidden"
            />
            
            <Button
              variant="outline"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={chatMutation.isPending}
            >
              <Paperclip className="h-4 w-4" />
            </Button>

            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Ask me anything about RV repair, upload manuals, or request SOPs..."
              className="flex-1 min-h-[60px] resize-none text-white font-bold placeholder:text-white/70"
              style={{
                background: 'rgba(41, 91, 172, 0.25)',
                border: '1px solid rgba(255,255,255,0.1)',
                boxShadow: 'none',
                textShadow: '0 1px 3px rgba(0, 0, 0, 0.7)'
              }}
              disabled={chatMutation.isPending}
            />

            <Button
              onClick={handleSend}
              disabled={chatMutation.isPending || (!input.trim() && attachments.length === 0)}
              size="icon"
              className="self-end"
            >
              {chatMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Quick Actions */}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => quickActionMutation.mutate('upload_manual')}
              disabled={quickActionMutation.isPending}
              className="text-xs"
            >
              <FileText className="h-3 w-3 mr-1" />
              Upload Manual
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => quickActionMutation.mutate('generate_sop')}
              disabled={quickActionMutation.isPending}
              className="text-xs"
            >
              <Wrench className="h-3 w-3 mr-1" />
              Generate SOP
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => quickActionMutation.mutate('troubleshoot')}
              disabled={quickActionMutation.isPending}
              className="text-xs"
            >
              <AlertCircle className="h-3 w-3 mr-1" />
              Troubleshoot
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => quickActionMutation.mutate('recent_sops')}
              disabled={quickActionMutation.isPending}
              className="text-xs"
            >
              <CheckCircle className="h-3 w-3 mr-1" />
              Recent SOPs
            </Button>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}