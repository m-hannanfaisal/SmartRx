import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft, Plus, Trash2, Sparkles, Lightbulb, FileDown, Save,
  FlaskConical, CalendarClock, ChevronDown, ChevronUp, Loader2,
  AlertTriangle, Clock, History,
} from 'lucide-react';
import {
  getPatient, getPatients, searchMedicines, addMedicine, getDiseases, getTemplatesByDisease,
  addPrescription, getFrequentCombinations, getPrescription, getPatientPrescriptions,
} from '@/lib/store';
import { useAuth } from '@/hooks/useAuth';
import type { Patient, Disease, Medicine, Prescription } from '@/lib/types';
import { generatePrescriptionPDF } from '@/lib/pdf';
import { toast } from 'sonner';
import { FullScreenOverlay } from '@/components/ui/FullScreenOverlay';

const DRAFT_KEY = 'smartrx_rx_draft';

interface FormItem {
  tempId: string;
  medicine_id: string;
  medicineName: string;
  strength: string;
  description: string;
  days: number;
  times_per_day: number;
  notes: string;
}

export default function NewPrescriptionPage() {
  const navigate   = useNavigate();
  const { doctor } = useAuth();
  const [searchParams] = useSearchParams();

  const [patients,  setPatients]  = useState<Patient[]>([]);
  const [diseases,  setDiseases]  = useState<Disease[]>([]);
  const [patientId, setPatientId] = useState(searchParams.get('patientId') || '');
  const [items,     setItems]     = useState<FormItem[]>([]);
  const [selectedDisease, setSelectedDisease] = useState('');
  const [diagnosis,      setDiagnosis]     = useState('');
  const [labTests,       setLabTests]      = useState('');
  const [nextVisitDate,  setNextVisitDate]  = useState('');
  const [rxStatus,       setRxStatus]      = useState<'draft' | 'issued'>('issued');
  const [expandedRows,   setExpandedRows]   = useState<Set<number>>(new Set());
  const [saving, setSaving]         = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Patient search
  const [patientSearch,       setPatientSearch]       = useState('');
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);
  const patientSearchRef = useRef<HTMLDivElement>(null);

  // Patient history sidebar
  const [recentRx, setRecentRx] = useState<Prescription[]>([]);

  // Autocomplete
  const [activeRow,    setActiveRow]    = useState<number | null>(null);
  const [medQuery,     setMedQuery]     = useState('');
  const [suggestions,  setSuggestions]  = useState<Medicine[]>([]);

  // Smart suggestions
  const [combos, setCombos] = useState<{ medicine_id: string; medicineName: string; frequency: number }[]>([]);

  const filteredPatients = patientSearch.trim()
    ? patients.filter(p =>
        p.name.toLowerCase().includes(patientSearch.toLowerCase()) ||
        p.display_id.toLowerCase().includes(patientSearch.toLowerCase()) ||
        p.phone.includes(patientSearch)
      )
    : patients;

  // Load patients + diseases
  useEffect(() => {
    Promise.all([getPatients(), getDiseases()]).then(([p, d]) => {
      setPatients(p); setDiseases(d);
      const preId = searchParams.get('patientId');
      if (preId) {
        const found = p.find(pt => pt.id === preId);
        if (found) setPatientSearch(`${found.name} (${found.display_id})`);
      }
    });
  }, []);

  // Load recent prescriptions when patient selected
  useEffect(() => {
    if (!patientId) { setRecentRx([]); return; }
    getPatientPrescriptions(patientId).then(rx => setRecentRx(rx.slice(0, 3)));
  }, [patientId]);

  // Restore draft (only once, only if no patientId pre-set)
  useEffect(() => {
    const preId = searchParams.get('patientId');
    if (preId || draftRestored) return;
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return;
    try {
      const draft = JSON.parse(raw);
      if (draft.items?.length > 0) {
        const restore = window.confirm('You have an unsaved draft prescription. Restore it?');
        if (restore) {
          setItems(draft.items || []);
          setDiagnosis(draft.diagnosis || '');
          setLabTests(draft.labTests || '');
          setNextVisitDate(draft.nextVisitDate || '');
          if (draft.patientId) setPatientId(draft.patientId);
          toast.success('Draft restored');
        } else {
          localStorage.removeItem(DRAFT_KEY);
        }
      }
    } catch { localStorage.removeItem(DRAFT_KEY); }
    setDraftRestored(true);
  }, []);

  // Auto-save draft every 30s
  useEffect(() => {
    const timer = setInterval(() => {
      if (items.length > 0) {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ patientId, items, diagnosis, labTests, nextVisitDate }));
      }
    }, 30000);
    return () => clearInterval(timer);
  }, [items, patientId, diagnosis, labTests, nextVisitDate]);

  // Close patient dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (patientSearchRef.current && !patientSearchRef.current.contains(e.target as Node))
        setShowPatientDropdown(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Duplicate prescription
  useEffect(() => {
    const dupId = searchParams.get('duplicate');
    if (!dupId) return;
    getPrescription(dupId).then(rx => {
      if (!rx) return;
      setItems(rx.items.map(i => ({
        tempId: `dup-${Date.now()}-${Math.random()}`,
        medicine_id: i.medicine_id, medicineName: i.medicineName,
        strength: i.strength || '', description: i.description || '',
        days: i.days, times_per_day: i.times_per_day, notes: i.notes || '',
      })));
      if (rx.diagnosis)      setDiagnosis(rx.diagnosis);
      if (rx.lab_tests)      setLabTests(rx.lab_tests);
      if (rx.next_visit_date) setNextVisitDate(rx.next_visit_date);
    });
  }, [searchParams]);

  // Disease template — APPEND
  useEffect(() => {
    if (!selectedDisease) return;
    getTemplatesByDisease(selectedDisease).then(templates => {
      if (templates.length > 0) {
        const t = templates[0];
        const newItems: FormItem[] = t.medicines.map((m, i) => ({
          tempId: `tmpl-${Date.now()}-${i}`,
          medicine_id: m.medicine_id, medicineName: m.medicineName,
          strength: '', description: '',
          days: m.days, times_per_day: m.times_per_day, notes: '',
        }));
        setItems(prev => [...prev, ...newItems]);
        const disease = diseases.find(d => d.id === selectedDisease);
        if (disease) setDiagnosis(prev => prev ? `${prev}, ${disease.name}` : disease.name);
        toast.success(`Added template: ${t.name}`);
      }
      setSelectedDisease('');
    });
  }, [selectedDisease]);

  useEffect(() => {
    if (medQuery.length >= 1) searchMedicines(medQuery).then(s => setSuggestions(s.slice(0, 8)));
    else setSuggestions([]);
  }, [medQuery]);

  useEffect(() => {
    const ids = items.map(i => i.medicine_id).filter(Boolean);
    if (ids.length === 0) { setCombos([]); return; }
    getFrequentCombinations(ids).then(setCombos);
  }, [items]);

  const toggleRowExpand = (idx: number) => {
    setExpandedRows(prev => { const next = new Set(prev); next.has(idx) ? next.delete(idx) : next.add(idx); return next; });
  };

  const addItem = () => setItems([...items, {
    tempId: `item-${Date.now()}`, medicine_id: '', medicineName: '',
    strength: '', description: '', days: 1, times_per_day: 1, notes: '',
  }]);

  const removeItem = (idx: number) => {
    setItems(items.filter((_, i) => i !== idx));
    setExpandedRows(prev => {
      const next = new Set<number>();
      prev.forEach(v => { if (v < idx) next.add(v); else if (v > idx) next.add(v - 1); });
      return next;
    });
  };

  const updateItem = (idx: number, field: keyof FormItem, value: string | number) => {
    const updated = [...items]; (updated[idx] as any)[field] = value; setItems(updated);
  };

  const selectMedicine = (idx: number, med: { id: string; name: string }) => {
    const updated = [...items];
    updated[idx].medicine_id = med.id; updated[idx].medicineName = med.name;
    setItems(updated); setActiveRow(null); setMedQuery(''); setSuggestions([]);
  };

  const createAndSelectMedicine = async (idx: number, name: string) => {
    if (!name.trim()) return;
    try {
      const newMed = await addMedicine(name.trim(), 'General');
      selectMedicine(idx, { id: newMed.id, name: newMed.name });
      toast.success(`"${newMed.name}" added to medicines database`);
    } catch (e: any) { toast.error(e.message || 'Failed to add medicine'); }
  };

  const addSuggestedMedicine = (medId: string, medName: string) => {
    setItems([...items, {
      tempId: `sug-${Date.now()}`, medicine_id: medId, medicineName: medName,
      strength: '', description: '', days: 5, times_per_day: 1, notes: '',
    }]);
    toast.success(`Added ${medName}`);
  };

  const handleSave = async (download: boolean) => {
    if (!patientId)          { toast.error('Please select a patient'); return; }
    if (items.length === 0)  { toast.error('Add at least one medicine'); return; }
    if (items.some(i => !i.medicine_id)) { toast.error('Please select or add all medicine names'); return; }
    if (!doctor)             { toast.error('Doctor profile not loaded'); return; }

    setSaving(true);
    try {
      const rx = await addPrescription({
        patientId,
        date: new Date().toISOString().split('T')[0],
        diagnosis:     diagnosis     || undefined,
        labTests:      labTests      || undefined,
        nextVisitDate: nextVisitDate || undefined,
        status:        rxStatus,
        items: items.map(i => ({
          medicine_id:   i.medicine_id,
          strength:      i.strength     || null,
          description:   i.description  || null,
          days:          i.days,
          times_per_day: i.times_per_day,
          notes:         i.notes        || null,
        })),
      });

      localStorage.removeItem(DRAFT_KEY);

      if (download) {
        const patient = await getPatient(patientId);
        if (patient) generatePrescriptionPDF(rx, patient, doctor);
      }
      setShowSuccess(true);
      setTimeout(() => {
        navigate(`/patients/${patientId}`);
      }, 2000);
    } catch (e: any) {
      toast.error(e.message || 'Failed to save');
    } finally { setSaving(false); }
  };

  const patient = patients.find(p => p.id === patientId);

  return (
    <div className="space-y-6 max-w-5xl relative">
      <FullScreenOverlay show={showSuccess} type="success" message="Prescription generated successfully" />
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-xl">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">New Prescription</h1>
          <p className="text-muted-foreground text-sm">Create a digital prescription</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">

          {/* ── Patient Card ── */}
          <Card className="card-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Patient</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div ref={patientSearchRef} className="relative">
                <Input className="h-11" placeholder="Search by name, ID, or phone..."
                  value={patientSearch}
                  onChange={e => { setPatientSearch(e.target.value); setShowPatientDropdown(true); }}
                  onFocus={() => setShowPatientDropdown(true)} />
                {showPatientDropdown && filteredPatients.length > 0 && (
                  <div className="absolute z-50 w-full bg-card border rounded-xl shadow-lg max-h-52 overflow-y-auto mt-1">
                    {filteredPatients.slice(0, 10).map(p => (
                      <button key={p.id}
                        className="w-full text-left px-3 py-2.5 hover:bg-accent text-sm flex justify-between items-center transition-colors"
                        onClick={() => {
                          setPatientId(p.id);
                          setPatientSearch(`${p.name} (${p.display_id})`);
                          setShowPatientDropdown(false);
                        }}>
                        <span className="font-medium">{p.name}</span>
                        <span className="text-xs text-muted-foreground">{p.display_id} • {p.phone}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <Select value={patientId} onValueChange={id => {
                setPatientId(id);
                const found = patients.find(p => p.id === id);
                if (found) setPatientSearch(`${found.name} (${found.display_id})`);
                setShowPatientDropdown(false);
              }}>
                <SelectTrigger className="h-11"><SelectValue placeholder="Or pick from list..." /></SelectTrigger>
                <SelectContent>
                  {patients.map(p => <SelectItem key={p.id} value={p.id}>{p.name} ({p.display_id})</SelectItem>)}
                </SelectContent>
              </Select>
              {patient && (
                <div className="mt-2 p-3 bg-muted/50 rounded-xl text-sm space-y-1">
                  <div className="flex justify-between">
                    <span><span className="text-muted-foreground">Age:</span> {patient.age} • {patient.gender}</span>
                    <span><span className="text-muted-foreground">Visits:</span> <strong>{patient.visit_count}</strong></span>
                  </div>
                  <p><span className="text-muted-foreground">Phone:</span> {patient.phone}</p>
                  {patient.last_visit_date && (
                    <p className="flex items-center gap-1 text-muted-foreground text-xs">
                      <Clock className="h-3 w-3" /> Last visit: {patient.last_visit_date}
                    </p>
                  )}
                  {patient.allergies && (
                    <div className="flex items-center gap-1.5 text-destructive text-xs font-medium mt-1">
                      <AlertTriangle className="h-3.5 w-3.5" /> Allergies: {patient.allergies}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Template + Status ── */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="card-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2 uppercase tracking-wider text-muted-foreground">
                  <Sparkles className="h-3.5 w-3.5 text-primary" /> Template
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={selectedDisease} onValueChange={setSelectedDisease}>
                  <SelectTrigger className="h-11"><SelectValue placeholder="Load template..." /></SelectTrigger>
                  <SelectContent>
                    {diseases.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
            <Card className="card-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Status</CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={rxStatus} onValueChange={(v: any) => setRxStatus(v)}>
                  <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="issued">Issued</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          </div>

          {/* ── Diagnosis ── */}
          <Card className="card-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Diagnosis (Optional)</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea value={diagnosis} onChange={e => setDiagnosis(e.target.value)}
                placeholder="e.g. Viral Fever with mild dehydration..."
                className="min-h-[60px] bg-muted/50 border-0 focus-visible:ring-1 resize-none" />
            </CardContent>
          </Card>

          {/* ── Smart Suggestions ── */}
          {combos.length > 0 && (
            <Card className="card-shadow border-primary/20 bg-accent/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Lightbulb className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-sm font-semibold">Smart Suggestions</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {combos.map(c => (
                    <Button key={c.medicine_id} variant="outline" size="sm"
                      className="text-xs bg-card hover:bg-accent"
                      onClick={() => addSuggestedMedicine(c.medicine_id, c.medicineName)}>
                      <Plus className="h-3 w-3 mr-1" /> {c.medicineName}
                      <span className="ml-1 text-muted-foreground">({c.frequency}×)</span>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Medicines ── */}
          <Card className="card-shadow">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Medicines</CardTitle>
                <Button size="sm" variant="outline" onClick={addItem}>
                  <Plus className="h-4 w-4 mr-1.5" /> Add Medicine
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {items.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <p className="text-sm font-medium">No medicines added</p>
                  <p className="text-xs mt-1">Click "Add Medicine" or select a template above</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {items.map((item, idx) => (
                    <div key={item.tempId} className="p-4 bg-muted/50 rounded-xl border border-border/50">
                      <div className="grid grid-cols-12 gap-2 items-start">
                        {/* Medicine name */}
                        <div className="col-span-12 sm:col-span-3 relative">
                          <Label className="text-[11px] text-muted-foreground mb-1.5 block font-medium uppercase tracking-wider">Medicine</Label>
                          <Input className="h-10 bg-card"
                            value={activeRow === idx ? medQuery : item.medicineName}
                            onChange={e => { setActiveRow(idx); setMedQuery(e.target.value); }}
                            onFocus={() => { setActiveRow(idx); setMedQuery(item.medicineName); }}
                            onKeyDown={e => {
                              if (e.key === 'Enter' && activeRow === idx && medQuery.trim() && suggestions.length === 0)
                                createAndSelectMedicine(idx, medQuery);
                            }}
                            placeholder="Type medicine name..." />
                          {activeRow === idx && medQuery.trim().length > 0 && (
                            <div className="absolute z-50 w-full mt-1 bg-card border rounded-xl shadow-lg max-h-48 overflow-y-auto">
                              {suggestions.map(s => (
                                <button key={s.id}
                                  className="w-full text-left px-3 py-2.5 hover:bg-accent text-sm flex justify-between transition-colors"
                                  onClick={() => selectMedicine(idx, s)}>
                                  <span>{s.name}</span>
                                  <span className="text-xs text-muted-foreground">{s.usage_count} uses</span>
                                </button>
                              ))}
                              {medQuery.trim() && !suggestions.some(s => s.name.toLowerCase() === medQuery.trim().toLowerCase()) && (
                                <button
                                  className="w-full text-left px-3 py-2.5 hover:bg-primary/10 text-sm flex items-center gap-2 text-primary border-t transition-colors"
                                  onClick={() => createAndSelectMedicine(idx, medQuery)}>
                                  <Plus className="h-3.5 w-3.5 flex-shrink-0" />
                                  Add "<strong>{medQuery.trim()}</strong>" as new medicine
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                        {/* Strength */}
                        <div className="col-span-6 sm:col-span-2">
                          <Label className="text-[11px] text-muted-foreground mb-1.5 block font-medium uppercase tracking-wider">Strength</Label>
                          <Input className="h-10 bg-card" value={item.strength}
                            onChange={e => updateItem(idx, 'strength', e.target.value)}
                            placeholder="e.g. 500mg" />
                        </div>
                        {/* Days */}
                        <div className="col-span-3 sm:col-span-2">
                          <Label className="text-[11px] text-muted-foreground mb-1.5 block font-medium uppercase tracking-wider">Days</Label>
                          <Input className="h-10 bg-card" type="number" min={1} value={item.days}
                            onChange={e => updateItem(idx, 'days', parseInt(e.target.value) || 1)} />
                        </div>
                        {/* Times/day */}
                        <div className="col-span-3 sm:col-span-2">
                          <Label className="text-[11px] text-muted-foreground mb-1.5 block font-medium uppercase tracking-wider">×/Day</Label>
                          <Input className="h-10 bg-card" type="number" min={1} value={item.times_per_day}
                            onChange={e => updateItem(idx, 'times_per_day', parseInt(e.target.value) || 1)} />
                        </div>
                        {/* Notes */}
                        <div className="col-span-10 sm:col-span-2">
                          <Label className="text-[11px] text-muted-foreground mb-1.5 block font-medium uppercase tracking-wider">Notes</Label>
                          <Input className="h-10 bg-card" value={item.notes}
                            onChange={e => updateItem(idx, 'notes', e.target.value)} placeholder="After food..." />
                        </div>
                        {/* Actions */}
                        <div className="col-span-2 sm:col-span-1 flex items-end gap-1">
                          <Button variant="ghost" size="icon"
                            className="text-muted-foreground hover:text-foreground mt-6 h-10 w-10"
                            onClick={() => toggleRowExpand(idx)} title="Add disease description">
                            {expandedRows.has(idx) ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </Button>
                          <Button variant="ghost" size="icon"
                            className="text-destructive/60 hover:text-destructive mt-6 h-10 w-10"
                            onClick={() => removeItem(idx)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      {expandedRows.has(idx) && (
                        <div className="mt-3 pt-3 border-t border-border/30">
                          <Label className="text-[11px] text-muted-foreground mb-1.5 block font-medium uppercase tracking-wider">Disease / Description (Optional)</Label>
                          <Input className="h-10 bg-card" value={item.description}
                            onChange={e => updateItem(idx, 'description', e.target.value)}
                            placeholder="e.g. For fever, For inflammation..." />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Lab Tests ── */}
          <Card className="card-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 uppercase tracking-wider text-muted-foreground">
                <FlaskConical className="h-3.5 w-3.5 text-primary" /> Lab Tests (Optional)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea value={labTests} onChange={e => setLabTests(e.target.value)}
                placeholder="e.g. CBC, Blood Sugar (Fasting), Thyroid Panel..."
                className="min-h-[60px] bg-muted/50 border-0 focus-visible:ring-1 resize-none" />
            </CardContent>
          </Card>

          {/* ── Next Visit ── */}
          <Card className="card-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 uppercase tracking-wider text-muted-foreground">
                <CalendarClock className="h-3.5 w-3.5 text-primary" /> Next Visit (Optional)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Input type="date" value={nextVisitDate} onChange={e => setNextVisitDate(e.target.value)}
                className="h-11 bg-muted/50 border-0 focus-visible:ring-1 max-w-xs"
                min={new Date().toISOString().split('T')[0]} />
            </CardContent>
          </Card>
        </div>

        {/* ── Right Sidebar: Patient History ── */}
        <div className="space-y-4">
          <Card className="card-shadow sticky top-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 uppercase tracking-wider text-muted-foreground">
                <History className="h-3.5 w-3.5 text-primary" /> Recent History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!patientId ? (
                <p className="text-xs text-muted-foreground">Select a patient to view their recent prescriptions.</p>
              ) : recentRx.length === 0 ? (
                <p className="text-xs text-muted-foreground">No previous prescriptions found.</p>
              ) : (
                <div className="space-y-3">
                  {recentRx.map(rx => (
                    <div key={rx.id} className="p-3 bg-muted/50 rounded-xl text-xs space-y-1.5 border border-border/40">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-foreground">{rx.date}</span>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {rx.status}
                        </Badge>
                      </div>
                      {rx.diagnosis && <p className="text-muted-foreground line-clamp-1">Dx: {rx.diagnosis}</p>}
                      <ul className="space-y-0.5">
                        {rx.items.slice(0, 4).map(item => (
                          <li key={item.id} className="flex items-center gap-1 text-foreground/80">
                            <span className="h-1 w-1 rounded-full bg-primary/60 flex-shrink-0" />
                            {item.medicineName}
                            {item.strength && <span className="text-muted-foreground">({item.strength})</span>}
                          </li>
                        ))}
                        {rx.items.length > 4 && (
                          <li className="text-muted-foreground">+{rx.items.length - 4} more</li>
                        )}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Actions ── */}
      <div className="flex gap-3 justify-end pb-8">
        <Button variant="outline" onClick={() => navigate(-1)} disabled={saving}>Cancel</Button>
        <Button variant="outline" onClick={() => handleSave(false)} className="gap-1.5" disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save
        </Button>
        <Button onClick={() => handleSave(true)} className="gap-1.5 shadow-sm" disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />} Save & Download PDF
        </Button>
      </div>
    </div>
  );
}
