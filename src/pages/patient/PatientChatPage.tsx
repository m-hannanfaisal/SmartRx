import { useEffect, useState, useRef } from 'react';
import { usePatientAuth, DoctorRelation } from '@/hooks/usePatientAuth';
import { getPatientChatMessages, sendPatientChatMessage, getPatientDoctors } from '@/lib/patientApi';
import {
  MessageCircle, Send, Loader2, Stethoscope,
  User, RefreshCw, AlertCircle, Search, Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';

interface ChatMessage {
  id: string;
  sender_type: 'patient' | 'doctor';
  message: string;
  is_read: boolean;
  created_at: string;
}

export default function PatientChatPage() {
  const { patient, doctors: contextDoctors, setDoctors } = usePatientAuth();
  
  const [doctorsList, setDoctorsList] = useState<DoctorRelation[]>(contextDoctors || []);
  const [activeDoctorId, setActiveDoctorId] = useState<string | null>(null);
  
  const [messages, setMessages]     = useState<ChatMessage[]>([]);
  const [loading, setLoading]       = useState(true);
  const [sending, setSending]       = useState(false);
  const [error, setError]           = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch]         = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef       = useRef<HTMLTextAreaElement>(null);

  // 1. Fetch doctors on mount
  useEffect(() => {
    const fetchDocs = async () => {
      try {
        const docs = await getPatientDoctors() as DoctorRelation[];
        setDoctorsList(docs);
        setDoctors(docs);
        if (docs.length > 0 && !activeDoctorId) {
          setActiveDoctorId(docs[0].doctor_id);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load doctors');
      } finally {
        setLoading(false);
      }
    };
    fetchDocs();
  }, []);

  // 2. Fetch messages when active doctor changes
  const loadMessages = async (showLoader = true) => {
    if (!activeDoctorId) return;
    try {
      if (showLoader) setLoading(true);
      else setRefreshing(true);
      
      const result: any = await getPatientChatMessages(activeDoctorId);
      setMessages(result.messages || []);
      
      // Update unread count for this doctor locally
      setDoctorsList(prev => prev.map(d => 
        d.doctor_id === activeDoctorId ? { ...d, unread_count: 0 } : d
      ));
    } catch (err: any) {
      setError(err.message || 'Failed to load messages');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (activeDoctorId) {
      loadMessages(true);
    }
  }, [activeDoctorId]);

  // Auto-refresh every 10 seconds for the active chat
  useEffect(() => {
    const interval = setInterval(() => {
      if (activeDoctorId) loadMessages(false);
    }, 10000);
    return () => clearInterval(interval);
  }, [activeDoctorId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const msg = newMessage.trim();
    if (!msg || !activeDoctorId) return;

    setSending(true);
    try {
      const result: any = await sendPatientChatMessage(msg, activeDoctorId);
      setMessages(prev => [...prev, result]);
      setNewMessage('');
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

  if (loading && !doctorsList.length) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
      </div>
    );
  }

  const activeDoctor = doctorsList.find(d => d.doctor_id === activeDoctorId);
  const filteredDoctors = doctorsList.filter(d => 
    d.doctor_name.toLowerCase().includes(search.toLowerCase()) || 
    d.clinic_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto h-[calc(100vh-8rem)] flex gap-6">
      {/* Left Sidebar: Doctors List (Only show if multiple doctors, otherwise hidden to save space or just keep it for consistency) */}
      <div className={`w-full md:w-80 flex-col bg-white rounded-2xl border border-slate-200 shadow-lg shadow-slate-200/50 overflow-hidden ${doctorsList.length <= 1 ? 'hidden' : 'flex hidden md:flex'}`}>
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <h2 className="font-bold text-slate-900 mb-3">Your Doctors</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search doctors..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-10 bg-white border-slate-200 rounded-xl"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {filteredDoctors.map(doc => (
            <button
              key={doc.doctor_id}
              onClick={() => setActiveDoctorId(doc.doctor_id)}
              className={`w-full text-left p-3 rounded-xl transition-all border ${
                activeDoctorId === doc.doctor_id
                  ? 'bg-gradient-to-r from-teal-50 to-emerald-50 border-teal-200 shadow-sm'
                  : 'bg-white border-transparent hover:bg-slate-50 hover:border-slate-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 shadow-sm ${
                  activeDoctorId === doc.doctor_id
                    ? 'bg-gradient-to-br from-teal-500 to-emerald-600 text-white'
                    : 'bg-slate-100 text-slate-500'
                }`}>
                  <Stethoscope className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className={`text-sm font-bold truncate ${activeDoctorId === doc.doctor_id ? 'text-teal-900' : 'text-slate-900'}`}>
                      Dr. {doc.doctor_name}
                    </p>
                    {!!doc.unread_count && doc.unread_count > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold animate-pulse">
                        {doc.unread_count}
                      </span>
                    )}
                  </div>
                  <p className={`text-xs truncate ${activeDoctorId === doc.doctor_id ? 'text-teal-700/70' : 'text-slate-500'}`}>
                    {doc.clinic_name}
                  </p>
                </div>
              </div>
            </button>
          ))}
          {filteredDoctors.length === 0 && (
            <div className="text-center py-8 text-slate-400">
              <p className="text-sm">No doctors found</p>
            </div>
          )}
        </div>
      </div>

      {/* Right side: Active Chat */}
      <div className="flex-1 flex flex-col min-w-0 bg-white rounded-2xl border border-slate-200 shadow-lg shadow-slate-200/50">
        {!activeDoctor ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="h-20 w-20 rounded-full bg-teal-50 flex items-center justify-center mb-4">
              <MessageCircle className="h-10 w-10 text-teal-300" />
            </div>
            <p className="text-lg font-semibold text-slate-400">Select a doctor</p>
            <p className="text-sm text-slate-400 mt-1 max-w-sm">
              Choose a doctor from the list to start messaging.
            </p>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50 rounded-t-2xl">
              <div className="flex items-center gap-4">
                <div className="md:hidden">
                  {/* Mobile doctor selector dropdown could go here, for now just show active */}
                </div>
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-md">
                  <Stethoscope className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-base font-bold text-slate-900">
                    Dr. {activeDoctor.doctor_name}
                  </h1>
                  <p className="text-xs text-slate-500">
                    {activeDoctor.specialization} • {activeDoctor.clinic_name}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => loadMessages(false)}
                disabled={refreshing}
                className="text-slate-400 hover:text-teal-600"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              </Button>
            </div>

            {error && (
              <div className="m-4 flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <p>{error}</p>
                <button onClick={() => setError('')} className="ml-auto text-red-400 hover:text-red-600">✕</button>
              </div>
            )}

            {/* Messages area */}
            <div className="flex-1 overflow-y-auto bg-slate-50/30 p-4 space-y-4">
              {loading && messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-6 w-6 animate-spin text-teal-500" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="h-16 w-16 rounded-full bg-teal-50 flex items-center justify-center mb-4">
                    <MessageCircle className="h-8 w-8 text-teal-300" />
                  </div>
                  <p className="text-lg font-semibold text-slate-400">No messages yet</p>
                  <p className="text-sm text-slate-400 mt-1 max-w-sm">
                    Start a conversation with Dr. {activeDoctor.doctor_name}.
                  </p>
                </div>
              ) : (
                <>
                  {messages.map((msg) => (
                    <MessageBubble 
                      key={msg.id} 
                      msg={msg} 
                      patientName={patient?.name || 'You'} 
                      doctorName={activeDoctor.doctor_name} 
                    />
                  ))}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Input area */}
            <div className="p-3 bg-white border-t border-slate-100 rounded-b-2xl">
              <div className="flex items-end gap-3">
                <div className="flex-1 relative">
                  <textarea
                    ref={inputRef}
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={`Message Dr. ${activeDoctor.doctor_name}...`}
                    rows={1}
                    className="w-full resize-none border-0 bg-slate-50 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500/20 focus:bg-white transition-colors outline-none min-h-[44px] max-h-32"
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
                  className="h-11 w-11 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 shadow-lg shadow-teal-500/20 p-0 shrink-0"
                >
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin text-white" />
                  ) : (
                    <Send className="h-4 w-4 text-white" />
                  )}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function MessageBubble({ msg, patientName, doctorName }: { msg: ChatMessage; patientName: string; doctorName: string }) {
  const isPatient = msg.sender_type === 'patient';
  const time = format(new Date(msg.created_at), 'hh:mm a');
  const dateStr = format(new Date(msg.created_at), 'MMM dd');

  return (
    <div className={`flex ${isPatient ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex items-end gap-2 max-w-[80%] ${isPatient ? 'flex-row-reverse' : ''}`}>
        {/* Avatar */}
        <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold shadow-sm ${
          isPatient
            ? 'bg-gradient-to-br from-teal-500 to-emerald-600 text-white'
            : 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white'
        }`}>
          {isPatient ? <User className="h-3.5 w-3.5" /> : <Stethoscope className="h-3.5 w-3.5" />}
        </div>

        {/* Bubble */}
        <div className={`${
          isPatient
            ? 'bg-gradient-to-br from-teal-500 to-emerald-500 text-white rounded-2xl rounded-br-md'
            : 'bg-white border border-slate-200 text-slate-900 rounded-2xl rounded-bl-md shadow-sm'
        } px-4 py-3`}>
          <p className={`text-[11px] font-bold mb-1 opacity-80 ${isPatient ? 'text-teal-50' : 'text-slate-500'}`}>
            {isPatient ? 'You' : `Dr. ${doctorName}`}
          </p>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.message}</p>
          <p className={`text-[9px] mt-1.5 opacity-70 font-medium ${isPatient ? 'text-teal-50 text-right' : 'text-slate-400'}`}>
            {dateStr} • {time}
          </p>
        </div>
      </div>
    </div>
  );
}
