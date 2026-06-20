import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Users, FileText, Pill, Search, Plus, Clock, TrendingUp, ArrowRight, Loader2, CalendarDays, CalendarCheck, CalendarRange, CheckCircle2, MessageCircle } from 'lucide-react';
import { getPatients, getPrescriptions, getMedicines, getTopMedicines, searchPatients, addPatient, addMedicine, getDoctorUnreadCount } from '@/lib/store';
import type { Patient, Prescription, Medicine } from '@/lib/types';
import { toast } from 'sonner';
import { FullScreenOverlay } from '@/components/ui/FullScreenOverlay';

type DateRange = 'today' | 'week' | 'month' | 'all';

function getDateRange(range: DateRange): { from?: string; to?: string } {
  const today = new Date();
  const fmt = (d: Date) => d.toISOString().split('T')[0];
  if (range === 'today') return { from: fmt(today), to: fmt(today) };
  if (range === 'week') {
    const from = new Date(today); from.setDate(today.getDate() - 7);
    return { from: fmt(from), to: fmt(today) };
  }
  if (range === 'month') {
    const from = new Date(today); from.setDate(1);
    return { from: fmt(from), to: fmt(today) };
  }
  return {};
}

const STATUS_BADGE: Record<string, string> = {
  draft:     'bg-yellow-100 text-yellow-800',
  issued:    'bg-blue-100 text-blue-800',
  dispensed: 'bg-green-100 text-green-800',
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const [searchQuery,    setSearchQuery]    = useState('');
  const [dateRange,      setDateRange]      = useState<DateRange>('month');
  const [patients,       setPatients]       = useState<Patient[]>([]);
  const [prescriptions,  setPrescriptions]  = useState<Prescription[]>([]);
  const [medicines,      setMedicines]      = useState<Medicine[]>([]);
  const [topMeds,        setTopMeds]        = useState<Medicine[]>([]);
  const [searchResults,  setSearchResults]  = useState<Patient[]>([]);
  const [loading,        setLoading]        = useState(true);

  // Prescription analytics counts
  const [rxToday, setRxToday] = useState(0);
  const [rxWeek,  setRxWeek]  = useState(0);
  const [rxMonth, setRxMonth] = useState(0);

  // Today's activity counts
  const [newPatientsToday, setNewPatientsToday] = useState(0);
  const [newRxToday,       setNewRxToday]       = useState(0);
  const [newMedsToday,     setNewMedsToday]     = useState(0);
  const [unreadMessages,   setUnreadMessages]   = useState(0);

  const [patientModalOpen, setPatientModalOpen] = useState(false);
  const [medicineModalOpen, setMedicineModalOpen] = useState(false);
  const [showSuccessAnim, setShowSuccessAnim] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  
  const [patientForm, setPatientForm] = useState({ name: '', phone: '', age: '', gender: '' as string, address: '', allergies: '' });
  const [medicineForm, setMedicineForm] = useState({ name: '', category: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const today      = new Date().toISOString().split('T')[0];
    const weekStart  = (() => { const d = new Date(); d.setDate(d.getDate() - 7); return d.toISOString().split('T')[0]; })();
    const monthStart = (() => { const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0]; })();

    Promise.all([
      getPatients(),
      getMedicines(),
      getTopMedicines(5),
      getPrescriptions({ from: today,      to: today }),
      getPrescriptions({ from: weekStart,  to: today }),
      getPrescriptions({ from: monthStart, to: today }),
    ]).then(([p, m, top, rxTodayList, rxWeekList, rxMonthList]) => {
      setPatients(p);
      setMedicines(m);
      setTopMeds(top);

      setRxToday(rxTodayList.length);
      setRxWeek(rxWeekList.length);
      setRxMonth(rxMonthList.length);
      setNewRxToday(rxTodayList.length);

      const todayObj = new Date();
      const isToday = (dateStr?: string) => {
        if (!dateStr) return false;
        const d = new Date(dateStr);
        return d.getDate() === todayObj.getDate() &&
               d.getMonth() === todayObj.getMonth() &&
               d.getFullYear() === todayObj.getFullYear();
      };

      const todayPts = p.filter(pt => isToday(pt.created_at));
      setNewPatientsToday(todayPts.length);

      const newMeds = m.filter(med => isToday(med.created_at));
      setNewMedsToday(newMeds.length);
    }).finally(() => setLoading(false));

    // Fetch unread messages
    getDoctorUnreadCount().then(setUnreadMessages);
  }, []);

  const triggerSuccessAnim = (msg: string) => {
    setSuccessMsg(msg);
    setShowSuccessAnim(true);
    setTimeout(() => setShowSuccessAnim(false), 2500);
  };

  const handleAddPatient = async () => {
    if (!patientForm.name || !patientForm.phone || !patientForm.age || !patientForm.gender) {
      toast.error('Please fill all required fields'); return;
    }
    setSaving(true);
    try {
      const newPt = await addPatient({
        name: patientForm.name,
        phone: patientForm.phone,
        age: parseInt(patientForm.age),
        gender: patientForm.gender as 'Male' | 'Female' | 'Other',
        address: patientForm.address,
        allergies: patientForm.allergies,
      });
      setPatients(prev => [newPt, ...prev]);
      setNewPatientsToday(prev => prev + 1);
      setPatientModalOpen(false);
      setPatientForm({ name: '', phone: '', age: '', gender: '', address: '', allergies: '' });
      triggerSuccessAnim('Patient added successfully!');
    } catch (e: any) {
      toast.error(e.message || 'Failed to add patient');
    } finally {
      setSaving(false);
    }
  };

  const handleAddMedicine = async () => {
    if (!medicineForm.name || !medicineForm.category) {
      toast.error('Please fill all required fields'); return;
    }
    setSaving(true);
    try {
      const newMed = await addMedicine(medicineForm.name, medicineForm.category);
      setMedicines(prev => [newMed, ...prev]);
      setNewMedsToday(prev => prev + 1);
      setMedicineModalOpen(false);
      setMedicineForm({ name: '', category: '' });
      triggerSuccessAnim('Medicine added successfully!');
    } catch (e: any) {
      toast.error(e.message || 'Failed to add medicine');
    } finally {
      setSaving(false);
    }
  };

  // Reload filtered prescription list when date filter changes
  useEffect(() => {
    const { from, to } = getDateRange(dateRange);
    getPrescriptions({ from, to }).then(setPrescriptions);
  }, [dateRange]);

  useEffect(() => {
    if (!searchQuery) { setSearchResults([]); return; }
    searchPatients(searchQuery).then(setSearchResults);
  }, [searchQuery]);

  const recentRx = [...prescriptions].slice(0, 5);

  const mainStats = [
    { label: 'Total Patients',  value: patients.length,  icon: Users,    gradient: 'from-primary to-primary/80' },
    { label: 'Prescriptions',   value: rxMonth,          icon: FileText, gradient: 'from-success to-success/80' },
    { label: 'Medicines',       value: medicines.length, icon: Pill,     gradient: 'from-warning to-warning/80' },
  ];

  const todayStats = [
    { label: "Today's Patients",       value: newPatientsToday, icon: CalendarDays,    sub: 'New registrations',       color: 'text-primary',      bg: 'bg-primary/10',    link: '/patients'       },
    { label: "Today's Prescriptions",  value: newRxToday,       icon: CalendarCheck,   sub: 'Prescriptions issued',    color: 'text-emerald-600',  bg: 'bg-emerald-50',    link: '/prescriptions'  },
    { label: "Today's Medicines",      value: newMedsToday,     icon: CalendarRange,   sub: 'New medicines added',      color: 'text-amber-600',    bg: 'bg-amber-50',      link: '/medicines'      },
    { label: "Unread Messages",        value: unreadMessages,   icon: MessageCircle,   sub: 'Patient messages',         color: 'text-rose-600',     bg: 'bg-rose-50',        link: '/messages'       },
  ];

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-8 max-w-7xl relative">
      <FullScreenOverlay 
        show={showSuccessAnim} 
        type="success" 
        message={successMsg} 
        onClose={() => setShowSuccessAnim(false)} 
      />
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">Welcome back! Here's your clinic overview.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setPatientModalOpen(true)} size="sm" className="shadow-sm">
            <Plus className="h-4 w-4 mr-1.5" /> New Patient
          </Button>
          <Button onClick={() => setMedicineModalOpen(true)} size="sm" variant="secondary" className="shadow-sm">
            <Plus className="h-4 w-4 mr-1.5" /> New Medicine
          </Button>
          <Button onClick={() => navigate('/prescriptions/new')} variant="outline" size="sm">
            <FileText className="h-4 w-4 mr-1.5" /> New Prescription
          </Button>
        </div>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {mainStats.map((s, i) => (
          <Card key={s.label} className="card-shadow card-hover overflow-hidden animate-fade-up" style={{ animationDelay: `${i * 100}ms` }}>
            <CardContent className="flex items-center gap-4 p-6">
              <div className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${s.gradient} flex items-center justify-center shadow-sm hover:scale-110 transition-transform duration-300`}>
                <s.icon className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <p className="text-3xl font-bold tracking-tight">{s.value}</p>
                <p className="text-xs text-muted-foreground font-medium">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Today's Activity Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-5">
        {todayStats.map((s, i) => (
          <Card
            key={s.label}
            className="card-shadow card-hover overflow-hidden border border-dashed animate-fade-up cursor-pointer"
            style={{ animationDelay: `${(i + 3) * 100}ms` }}
            onClick={() => navigate(s.link)}
          >
            <CardContent className="flex items-center gap-4 p-6">
              <div className={`h-12 w-12 rounded-2xl ${s.bg} flex items-center justify-center hover:scale-110 transition-transform duration-300 group`}>
                <s.icon className={`h-5 w-5 ${s.color} group-hover:animate-pulse`} />
              </div>
              <div>
                <p className={`text-3xl font-bold tracking-tight ${s.color}`}>{s.value}</p>
                <p className="text-xs text-muted-foreground font-medium">{s.label}</p>
                <p className="text-[10px] text-muted-foreground/60 mt-0.5">{s.sub}</p>
              </div>
            </CardContent>
          </Card>
        ))}

      </div>

      {/* Quick search */}
      <Card className="card-shadow animate-fade-up" style={{ animationDelay: '600ms' }}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
            <Search className="h-3.5 w-3.5" /> Quick Patient Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Search by name, phone, or ID..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="h-11 bg-muted/50 border-0 focus-visible:ring-1" />
          {searchResults.length > 0 && (
            <div className="mt-3 divide-y divide-border rounded-lg border overflow-hidden">
              {searchResults.slice(0, 5).map(p => (
                <button key={p.id} onClick={() => navigate(`/patients/${p.id}`)}
                  className="w-full text-left px-4 py-3 table-row-hover flex justify-between items-center">
                  <div>
                    <p className="font-medium text-sm">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.display_id} • {p.phone}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="badge-primary">{p.age}y, {p.gender}</span>
                    <span className="text-xs text-muted-foreground">{p.visit_count} visits</span>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-5">
        {/* Recent Prescriptions with Date Filter + Analytics pills */}
        <Card className="card-shadow animate-fade-up" style={{ animationDelay: '700ms' }}>
          <CardHeader className="pb-3">
            <div className="flex justify-between items-center gap-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
                <Clock className="h-3.5 w-3.5" /> Prescriptions
              </CardTitle>
              <div className="flex items-center gap-2">
                <Select value={dateRange} onValueChange={(v: any) => setDateRange(v)}>
                  <SelectTrigger className="h-7 text-xs w-32 border border-primary/40 bg-primary/5 text-primary font-medium">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">This Week</SelectItem>
                    <SelectItem value="month">This Month</SelectItem>
                    <SelectItem value="all">All Time</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={() => navigate('/prescriptions')}>
                  View all <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
            </div>

            {/* Prescription analytics pills */}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                <CalendarDays className="h-3 w-3" /> Today: <strong className="ml-0.5">{rxToday}</strong>
              </span>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full bg-violet-50 text-violet-700 border border-violet-100">
                <CalendarRange className="h-3 w-3" /> Week: <strong className="ml-0.5">{rxWeek}</strong>
              </span>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                <CalendarCheck className="h-3 w-3" /> Month: <strong className="ml-0.5">{rxMonth}</strong>
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-border">
              {recentRx.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">No prescriptions in this period</p>}
              {recentRx.map(rx => {
                const patient = patients.find(p => p.id === rx.patient_id);
                return (
                  <button key={rx.id}
                    onClick={() => patient && navigate(`/patients/${patient.id}`)}
                    className="w-full text-left py-3 table-row-hover px-1 flex justify-between items-center">
                    <div>
                      <p className="font-medium text-sm">{patient?.name || 'Unknown'}</p>
                      <p className="text-xs text-muted-foreground">{rx.items.length} medicine(s)</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_BADGE[rx.status] || ''}`}>
                        {rx.status}
                      </span>
                      <span className="text-xs text-muted-foreground font-medium">{rx.date}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Top Medicines */}
        <Card className="card-shadow animate-fade-up" style={{ animationDelay: '800ms' }}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
              <TrendingUp className="h-3.5 w-3.5 text-primary" /> Top Medicines
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-border">
              {topMeds.map((m, i) => (
                <div key={m.id} className="flex items-center justify-between py-3 px-1">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-muted-foreground/60 w-5 text-center">{i + 1}</span>
                    <div>
                      <p className="font-medium text-sm">{m.name}</p>
                      <p className="text-xs text-muted-foreground">{m.category}</p>
                    </div>
                  </div>
                  <span className="badge-primary">{m.usage_count} uses</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={patientModalOpen} onOpenChange={setPatientModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add New Patient</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Full Name *</Label>
              <Input value={patientForm.name} onChange={e => setPatientForm({ ...patientForm, name: e.target.value })} placeholder="Patient name" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Phone *</Label>
                <Input value={patientForm.phone} onChange={e => setPatientForm({ ...patientForm, phone: e.target.value })} placeholder="Phone number" />
              </div>
              <div className="space-y-2">
                <Label>Age *</Label>
                <Input type="number" value={patientForm.age} onChange={e => setPatientForm({ ...patientForm, age: e.target.value })} placeholder="Age" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Gender *</Label>
              <Select value={patientForm.gender} onValueChange={v => setPatientForm({ ...patientForm, gender: v })}>
                <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Input value={patientForm.address} onChange={e => setPatientForm({ ...patientForm, address: e.target.value })} placeholder="Address (optional)" />
              <Label>Known Allergies</Label>
              <Input value={patientForm.allergies} onChange={e => setPatientForm({ ...patientForm, allergies: e.target.value })} placeholder="e.g. Penicillin (optional)" />
            </div>
            <Button onClick={handleAddPatient} disabled={saving} className="w-full">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Add Patient
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={medicineModalOpen} onOpenChange={setMedicineModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add New Medicine</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Medicine Name *</Label>
              <Input value={medicineForm.name} onChange={e => setMedicineForm({ ...medicineForm, name: e.target.value })} placeholder="e.g. Paracetamol" />
            </div>
            <div className="space-y-2">
              <Label>Category *</Label>
              <Input value={medicineForm.category} onChange={e => setMedicineForm({ ...medicineForm, category: e.target.value })} placeholder="e.g. Analgesic" />
            </div>
            <Button onClick={handleAddMedicine} disabled={saving} className="w-full">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Add Medicine
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
