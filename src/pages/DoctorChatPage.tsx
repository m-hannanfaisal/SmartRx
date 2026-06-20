import { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  MessageCircle, Send, Loader2, User, Stethoscope,
  Search, RefreshCw, AlertCircle, ArrowLeft, Inbox,
} from 'lucide-react';
import { getDoctorConversations, getDoctorChatMessages, sendDoctorChatMessage } from '@/lib/store';
import { format } from 'date-fns';

interface Conversation {
  patient_id: string;
  patient_name: string;
  display_id: string;
  phone: string;
  last_message: string;
  last_sender: 'patient' | 'doctor';
  last_message_at: string;
  unread_count: number;
}

interface ChatMessage {
  id: string;
  sender_type: 'patient' | 'doctor';
  message: string;
  is_read: boolean;
  created_at: string;
}

interface PatientInfo {
  id: string;
  name: string;
  display_id: string;
  phone: string;
}

export default function DoctorChatPage() {
  const [conversations, setConversations]     = useState<Conversation[]>([]);
  const [filteredConvos, setFilteredConvos]   = useState<Conversation[]>([]);
  const [searchQuery, setSearchQuery]         = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [messages, setMessages]               = useState<ChatMessage[]>([]);
  const [patientInfo, setPatientInfo]         = useState<PatientInfo | null>(null);
  const [loading, setLoading]                 = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending]                 = useState(false);
  const [newMessage, setNewMessage]           = useState('');
  const [refreshing, setRefreshing]           = useState(false);
  const [error, setError]                     = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef       = useRef<HTMLTextAreaElement>(null);

  // Load conversation list
  const loadConversations = async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);
      else setRefreshing(true);
      const data = await getDoctorConversations();
      setConversations(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load conversations');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Load messages for selected patient
  const loadMessages = async (patientId: string) => {
    try {
      setLoadingMessages(true);
      const data = await getDoctorChatMessages(patientId);
      setMessages(data.messages || []);
      setPatientInfo(data.patient || null);

      // Update unread count in conversations list to 0 for this patient
      setConversations(prev =>
        prev.map(c =>
          c.patient_id === patientId ? { ...c, unread_count: 0 } : c
        )
      );
    } catch (err: any) {
      setError(err.message || 'Failed to load messages');
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    loadConversations();

    // Auto-refresh conversations every 15 seconds
    const interval = setInterval(() => loadConversations(false), 15000);
    return () => clearInterval(interval);
  }, []);

  // Auto-refresh messages when a patient is selected
  useEffect(() => {
    if (!selectedPatientId) return;

    const interval = setInterval(() => {
      loadMessages(selectedPatientId);
    }, 10000);
    return () => clearInterval(interval);
  }, [selectedPatientId]);

  // Filter conversations by search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredConvos(conversations);
    } else {
      const q = searchQuery.toLowerCase();
      setFilteredConvos(
        conversations.filter(
          c =>
            c.patient_name.toLowerCase().includes(q) ||
            c.display_id.toLowerCase().includes(q) ||
            c.phone.includes(q)
        )
      );
    }
  }, [searchQuery, conversations]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSelectPatient = (patientId: string) => {
    setSelectedPatientId(patientId);
    loadMessages(patientId);
  };

  const handleSend = async () => {
    const msg = newMessage.trim();
    if (!msg || !selectedPatientId) return;

    setSending(true);
    try {
      const result = await sendDoctorChatMessage(selectedPatientId, msg);
      setMessages(prev => [...prev, result]);
      setNewMessage('');

      // Update last message in conversation list
      setConversations(prev =>
        prev.map(c =>
          c.patient_id === selectedPatientId
            ? { ...c, last_message: msg, last_sender: 'doctor', last_message_at: new Date().toISOString() }
            : c
        )
      );

      inputRef.current?.focus();
    } catch (err: any) {
      setError(err.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const totalUnread = conversations.reduce((sum, c) => sum + (parseInt(String(c.unread_count)) || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl space-y-4">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <MessageCircle className="h-6 w-6 text-primary" />
            Patient Messages
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {totalUnread > 0 ? (
              <span className="text-primary font-medium">{totalUnread} unread message{totalUnread > 1 ? 's' : ''}</span>
            ) : (
              'All caught up! No unread messages.'
            )}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => loadConversations(false)}
          disabled={refreshing}
        >
          <RefreshCw className={`h-4 w-4 mr-1.5 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <p>{error}</p>
          <button onClick={() => setError('')} className="ml-auto text-destructive/50 hover:text-destructive">✕</button>
        </div>
      )}

      {/* Main chat layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-4 h-[calc(100vh-14rem)]">
        {/* Conversations sidebar */}
        <Card className="card-shadow flex flex-col overflow-hidden">
          <CardHeader className="pb-3 shrink-0">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
              <Inbox className="h-3.5 w-3.5" /> Conversations
              {totalUnread > 0 && (
                <span className="ml-auto inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                  {totalUnread}
                </span>
              )}
            </CardTitle>
            <div className="relative mt-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search patients..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 h-9 bg-muted/50 border-0 text-sm"
              />
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-0">
            {filteredConvos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                <div className="h-14 w-14 rounded-full bg-muted/50 flex items-center justify-center mb-3">
                  <MessageCircle className="h-7 w-7 text-muted-foreground/40" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">No conversations yet</p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  Messages from patients will appear here
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filteredConvos.map(convo => (
                  <button
                    key={convo.patient_id}
                    onClick={() => handleSelectPatient(convo.patient_id)}
                    className={`w-full text-left px-4 py-3.5 transition-colors hover:bg-accent/50 relative ${
                      selectedPatientId === convo.patient_id
                        ? 'bg-primary/5 border-l-2 border-l-primary'
                        : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 text-xs font-bold shadow-sm ${
                        convo.unread_count > 0
                          ? 'bg-gradient-to-br from-primary to-primary/80 text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        {convo.patient_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className={`text-sm truncate ${
                            convo.unread_count > 0 ? 'font-bold text-foreground' : 'font-medium text-foreground'
                          }`}>
                            {convo.patient_name}
                          </p>
                          <span className="text-[10px] text-muted-foreground shrink-0">
                            {formatRelativeTime(convo.last_message_at)}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground/70 mb-1">{convo.display_id}</p>
                        <p className={`text-xs truncate ${
                          convo.unread_count > 0 ? 'text-foreground font-medium' : 'text-muted-foreground'
                        }`}>
                          {convo.last_sender === 'doctor' ? 'You: ' : ''}{convo.last_message}
                        </p>
                      </div>
                      {convo.unread_count > 0 && (
                        <span className="inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold shrink-0 mt-1 animate-pulse">
                          {convo.unread_count}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Chat area */}
        <Card className="card-shadow flex flex-col overflow-hidden">
          {!selectedPatientId ? (
            /* No patient selected */
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <div className="h-24 w-24 rounded-full bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center mb-5">
                <MessageCircle className="h-12 w-12 text-primary/30" />
              </div>
              <h3 className="text-lg font-semibold text-muted-foreground/80">Select a Conversation</h3>
              <p className="text-sm text-muted-foreground/50 mt-2 max-w-sm">
                Choose a patient from the list to view and reply to their messages
              </p>
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div className="flex items-center gap-3 p-4 border-b bg-card shrink-0">
                <button
                  onClick={() => { setSelectedPatientId(null); setMessages([]); setPatientInfo(null); }}
                  className="lg:hidden p-1.5 rounded-lg hover:bg-accent transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-primary-foreground text-xs font-bold shadow-md">
                  {patientInfo?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'PT'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{patientInfo?.name || 'Patient'}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {patientInfo?.display_id} • {patientInfo?.phone}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => selectedPatientId && loadMessages(selectedPatientId)}
                  disabled={loadingMessages}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <RefreshCw className={`h-4 w-4 ${loadingMessages ? 'animate-spin' : ''}`} />
                </Button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/20">
                {loadingMessages && messages.length === 0 ? (
                  <div className="flex items-center justify-center py-20">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mb-3">
                      <MessageCircle className="h-8 w-8 text-muted-foreground/30" />
                    </div>
                    <p className="text-sm font-medium text-muted-foreground">No messages yet</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">Start the conversation with this patient</p>
                  </div>
                ) : (
                  <>
                    {messages.map(msg => (
                      <DoctorMessageBubble
                        key={msg.id}
                        msg={msg}
                        patientName={patientInfo?.name || 'Patient'}
                      />
                    ))}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              {/* Input area */}
              <div className="border-t bg-card p-3 flex items-end gap-3 shrink-0">
                <div className="flex-1 relative">
                  <textarea
                    ref={inputRef}
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type your reply..."
                    rows={1}
                    className="w-full resize-none border border-border bg-muted/50 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 focus:bg-background transition-colors outline-none min-h-[44px] max-h-32"
                    style={{ height: 'auto', overflow: 'hidden' }}
                    onInput={(e) => {
                      const target = e.target as HTMLTextAreaElement;
                      target.style.height = 'auto';
                      target.style.height = Math.min(target.scrollHeight, 128) + 'px';
                    }}
                  />
                </div>
                <Button
                  onClick={handleSend}
                  disabled={sending || !newMessage.trim()}
                  className="h-11 w-11 rounded-xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg p-0 shrink-0"
                >
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin text-primary-foreground" />
                  ) : (
                    <Send className="h-4 w-4 text-primary-foreground" />
                  )}
                </Button>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}

// ─── Message bubble component ──────────────────────────────
function DoctorMessageBubble({ msg, patientName }: { msg: ChatMessage; patientName: string }) {
  const isDoctor = msg.sender_type === 'doctor';
  const time = format(new Date(msg.created_at), 'hh:mm a');
  const dateStr = format(new Date(msg.created_at), 'MMM dd');

  return (
    <div className={`flex ${isDoctor ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex items-end gap-2 max-w-[75%] ${isDoctor ? 'flex-row-reverse' : ''}`}>
        {/* Avatar */}
        <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold shadow-sm ${
          isDoctor
            ? 'bg-gradient-to-br from-primary to-primary/80 text-primary-foreground'
            : 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white'
        }`}>
          {isDoctor ? <Stethoscope className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />}
        </div>

        {/* Bubble */}
        <div className={`${
          isDoctor
            ? 'bg-gradient-to-br from-primary to-primary/90 text-primary-foreground rounded-2xl rounded-br-md'
            : 'bg-card border border-border text-foreground rounded-2xl rounded-bl-md shadow-sm'
        } px-4 py-3`}>
          <p className={`text-xs font-semibold mb-1 ${
            isDoctor ? 'text-primary-foreground/70' : 'text-muted-foreground'
          }`}>
            {isDoctor ? 'You' : patientName}
          </p>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.message}</p>
          <p className={`text-[10px] mt-1.5 ${
            isDoctor ? 'text-primary-foreground/50' : 'text-muted-foreground'
          }`}>
            {dateStr} • {time}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Helper: relative time ──────────────────────────────────
function formatRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHrs = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return 'now';
  if (diffMin < 60) return `${diffMin}m`;
  if (diffHrs < 24) return `${diffHrs}h`;
  if (diffDays < 7) return `${diffDays}d`;
  return format(date, 'MMM dd');
}
