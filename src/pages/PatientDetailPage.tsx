import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  ArrowLeft, Plus, FileText, User, Phone, MapPin, Download, Copy,
  Calendar, Loader2, Activity, AlertTriangle, Clock,
  Pencil, Trash2, Save, X, PlusCircle, Search,
} from 'lucide-react';
import {
  getPatient, getPatientPrescriptions, updatePrescriptionStatus,
  updatePrescription, updatePatient, deletePatient, searchMedicines, addPrescription,
} from '@/lib/store';
import { useAuth } from '@/hooks/useAuth';
import { generatePrescriptionPDF } from '@/lib/pdf';
import type { Patient, Prescription, PrescriptionItem, Medicine } from '@/lib/types';
import { toast } from 'sonner';

const STATUS_COLORS: Record<string, string> = {
  draft:  'bg-yellow-100 text-yellow-800 border-yellow-200',
  issued: 'bg-blue-100  text-blue-800  border-blue-200',
};

interface EditableItem extends PrescriptionItem { _new?: boolean; }

function MedicineSearch({ onSelect }: { onSelect: (m: Medicine) => void }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Medicine[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!q.trim()) { setResults([]); return; }
    const t = setTimeout(() => searchMedicines(q).then(r => { setResults(r.slice(0, 6)); setOpen(true); }), 250);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
        <Input className="h-9 pl-8 text-xs" placeholder="Search medicine to add..."
          value={q} onChange={e => setQ(e.target.value)} onFocus={() => q && setOpen(true)} />
      </div>
      {open && results.length > 0 && (
        <div className="absolute z-50 top-full mt-1 w-full bg-card border rounded-lg shadow-lg overflow-hidden">
          {results.map(m => (
            <button key={m.id} className="w-full text-left px-3 py-2 text-xs hover:bg-accent flex justify-between"
              onMouseDown={() => { onSelect(m); setQ(''); setOpen(false); }}>
              <span className="font-medium">{m.name}</span>
              <span className="text-muted-foreground">{m.category}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function PatientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { doctor } = useAuth();

  const [patient,       setPatient]       = useState<Patient | null>(null);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading,       setLoading]       = useState(true);

  const [showEditPatient, setShowEditPatient] = useState(false);
  const [patientForm, setPatientForm] = useState({ name: '', phone: '', age: '', gender: 'Male', address: '', allergies: '' });
  const [savingPatient, setSavingPatient] = useState(false);

  const [confirmDelete,   setConfirmDelete]   = useState(false);
  const [deletingPatient, setDeletingPatient] = useState(false);

  const [editingRxId,   setEditingRxId]   = useState<string | null>(null);
  const [editItems,     setEditItems]     = useState<EditableItem[]>([]);
  const [editDiagnosis, setEditDiagnosis] = useState('');
  const [editLabTests,  setEditLabTests]  = useState('');
  const [editNextVisit, setEditNextVisit] = useState('');
  const [savingRx,      setSavingRx]      = useState(false);
  const [saveAsNew,     setSaveAsNew]     = useState(false);

  useEffect(() => {
    if (!id) return;
    Promise.all([getPatient(id), getPatientPrescriptions(id)])
      .then(([p, rx]) => {
        setPatient(p);
        setPrescriptions(rx);
        if (p) setPatientForm({ name: p.name, phone: p.phone, age: String(p.age), gender: p.gender, address: p.address || '', allergies: p.allergies || '' });
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleStatusChange = async (rxId: string, status: 'draft' | 'issued') => {
    try {
      const updated = await updatePrescriptionStatus(rxId, status);
      setPrescriptions(prev => prev.map(rx => rx.id === rxId ? updated : rx));
      toast.success(`Status updated to ${status}`);
    } catch { toast.error('Failed to update status'); }
  };

  const openEditRx = (rx: Prescription) => {
    setEditingRxId(rx.id);
    setEditDiagnosis(rx.diagnosis || '');
    setEditLabTests(rx.lab_tests || '');
    setEditNextVisit(rx.next_visit_date || '');
    setEditItems(rx.items.map(i => ({ ...i })));
    setSaveAsNew(false);
  };

  const updateEditItem = (idx: number, field: keyof EditableItem, value: any) =>
    setEditItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: value } : it));

  const addMedicineToEdit = (m: Medicine) =>
    setEditItems(prev => [...prev, {
      id: crypto.randomUUID(), medicine_id: m.id, medicineName: m.name,
      strength: '', days: 5, times_per_day: 1, notes: null, _new: true,
    } as EditableItem]);

  const saveEditedRx = async () => {
    if (!editingRxId || !patient) return;
    setSavingRx(true);
    try {
      const payload = {
        diagnosis: editDiagnosis, labTests: editLabTests, nextVisitDate: editNextVisit,
        items: editItems.map(i => ({
          medicine_id: i.medicine_id, strength: i.strength || null,
          days: i.days, times_per_day: i.times_per_day, notes: i.notes || null,
        })),
      };
      if (saveAsNew) {
        const newRx = await addPrescription({
          patientId: patient.id, date: new Date().toISOString().split('T')[0],
          diagnosis: editDiagnosis, labTests: editLabTests,
          nextVisitDate: editNextVisit, status: 'draft', items: payload.items,
        });
        setPrescriptions(prev => [newRx, ...prev]);
        toast.success('Saved as new prescription copy');
      } else {
        const updated = await updatePrescription(editingRxId, payload);
        setPrescriptions(prev => prev.map(rx => rx.id === editingRxId ? updated : rx));
        toast.success('Prescription updated');
      }
      setEditingRxId(null);
    } catch { toast.error('Failed to save prescription'); }
    finally { setSavingRx(false); }
  };

  const savePatient = async () => {
    if (!patient) return;
    setSavingPatient(true);
    try {
      const updated = await updatePatient(patient.id, {
        name: patientForm.name, phone: patientForm.phone, age: Number(patientForm.age),
        gender: patientForm.gender as any, address: patientForm.address, allergies: patientForm.allergies,
      });
      setPatient(updated);
      setShowEditPatient(false);
      toast.success('Patient updated');
    } catch { toast.error('Failed to update patient'); }
    finally { setSavingPatient(false); }
  };

  const handleDeletePatient = async () => {
    if (!patient) return;
    setDeletingPatient(true);
    try {
      await deletePatient(patient.id);
      toast.success('Patient deleted');
      navigate('/patients');
    } catch { toast.error('Failed to delete patient'); setDeletingPatient(false); }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (!patient) return (
    <div className="flex flex-col items-center justify-center py-20">
      <p className="text-muted-foreground">Patient not found</p>
      <Button variant="outline" className="mt-4" onClick={() => navigate('/patients')}><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
    </div>
  );

  return (
    <div className="space-y-6 max-w-6xl">

      {/* Edit Patient Modal */}
      {showEditPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-lg border">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="font-semibold text-base">Edit Patient</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowEditPatient(false)}><X className="h-4 w-4" /></Button>
            </div>
            <div className="p-5 space-y-3">
              {([
                { label: 'Full Name', key: 'name', type: 'text' },
                { label: 'Phone', key: 'phone', type: 'tel' },
                { label: 'Age', key: 'age', type: 'number' },
                { label: 'Address', key: 'address', type: 'text' },
                { label: 'Allergies (comma-separated)', key: 'allergies', type: 'text' },
              ] as const).map(f => (
                <div key={f.key} className="space-y-1">
                  <Label className="text-xs text-muted-foreground">{f.label}</Label>
                  <Input type={f.type} value={(patientForm as any)[f.key]}
                    onChange={e => setPatientForm(p => ({ ...p, [f.key]: e.target.value }))} className="h-9" />
                </div>
              ))}
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Gender</Label>
                <select value={patientForm.gender} onChange={e => setPatientForm(p => ({ ...p, gender: e.target.value }))}
                  className="w-full h-9 text-sm rounded-md border bg-card px-3 outline-none focus:ring-1 ring-primary">
                  <option>Male</option><option>Female</option><option>Other</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 px-5 pb-5">
              <Button variant="outline" onClick={() => setShowEditPatient(false)}>Cancel</Button>
              <Button onClick={savePatient} disabled={savingPatient}>
                {savingPatient ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Save className="h-4 w-4 mr-1.5" />}
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-sm border p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0">
                <Trash2 className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="font-semibold text-sm">Delete Patient?</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Permanently deletes <strong>{patient.name}</strong> and all prescriptions. Cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setConfirmDelete(false)}>Cancel</Button>
              <Button variant="destructive" onClick={handleDeletePatient} disabled={deletingPatient}>
                {deletingPatient ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Trash2 className="h-4 w-4 mr-1.5" />}
                Yes, Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Page Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="icon" onClick={() => navigate('/patients')} className="rounded-xl">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">{patient.name}</h1>
          <p className="text-muted-foreground text-sm font-mono">{patient.display_id}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => setShowEditPatient(true)}>
            <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit Patient
          </Button>
          <Button variant="outline" size="sm"
            className="text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/5"
            onClick={() => setConfirmDelete(true)}>
            <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Delete
          </Button>
          <Button onClick={() => navigate(`/prescriptions/new?patientId=${patient.id}`)}>
            <Plus className="h-4 w-4 mr-1.5" /> New Prescription
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Patient Info */}
        <Card className="card-shadow lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Patient Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { icon: User,     primary: `${patient.age} years, ${patient.gender}`, label: 'Age & Gender' },
              { icon: Phone,    primary: patient.phone,                             label: 'Phone' },
              ...(patient.address ? [{ icon: MapPin, primary: patient.address, label: 'Address' }] : []),
              { icon: Activity, primary: `${patient.visit_count} visit${patient.visit_count !== 1 ? 's' : ''}`, label: 'Total Visits' },
              ...(patient.last_visit_date ? [{ icon: Clock, primary: patient.last_visit_date, label: 'Last Visit' }] : []),
              { icon: Calendar, primary: patient.created_at?.split('T')[0], label: 'Registered' },
            ].map((row, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <div className="h-8 w-8 rounded-lg bg-accent flex items-center justify-center flex-shrink-0">
                  <row.icon className="h-4 w-4 text-accent-foreground" />
                </div>
                <div><p className="font-medium">{row.primary}</p><p className="text-xs text-muted-foreground">{row.label}</p></div>
              </div>
            ))}
            {patient.allergies && (
              <div className="flex items-start gap-2 p-3 bg-destructive/10 rounded-xl border border-destructive/20 text-sm">
                <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-destructive text-xs uppercase tracking-wider mb-0.5">Allergies</p>
                  <p>{patient.allergies}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Prescriptions */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Prescription History ({prescriptions.length})
          </h2>

          {prescriptions.length === 0 ? (
            <Card className="card-shadow">
              <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <FileText className="h-12 w-12 mb-3 opacity-30" />
                <p className="font-medium">No prescriptions yet</p>
              </CardContent>
            </Card>
          ) : prescriptions.map(rx => {
            const isEditing = editingRxId === rx.id;
            return (
              <Card key={rx.id} className={`card-shadow overflow-hidden ${isEditing ? 'ring-2 ring-primary' : 'card-hover'}`}>
                <CardContent className="p-0">
                  {/* Header */}
                  <div className="flex justify-between items-start gap-3 p-4 border-b bg-muted/30">
                    <div className="flex-1 min-w-0">
                      {isEditing ? (
                        <div className="flex flex-wrap gap-2">
                          <div className="space-y-0.5">
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Diagnosis</p>
                            <Input className="h-7 text-xs w-44" value={editDiagnosis} placeholder="Diagnosis..."
                              onChange={e => setEditDiagnosis(e.target.value)} />
                          </div>
                          <div className="space-y-0.5">
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Lab Tests</p>
                            <Input className="h-7 text-xs w-36" value={editLabTests} placeholder="Lab tests..."
                              onChange={e => setEditLabTests(e.target.value)} />
                          </div>
                          <div className="space-y-0.5">
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Next Visit</p>
                            <Input className="h-7 text-xs w-32" type="date" value={editNextVisit}
                              onChange={e => setEditNextVisit(e.target.value)} />
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="font-semibold text-sm">
                            {new Date(rx.date).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </p>
                          {rx.diagnosis && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">Dx: {rx.diagnosis}</p>}
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {isEditing ? (
                        <>
                          <label className="flex items-center gap-1.5 text-[10px] text-muted-foreground cursor-pointer select-none mr-1">
                            <input type="checkbox" checked={saveAsNew} onChange={e => setSaveAsNew(e.target.checked)} />
                            Save as new copy
                          </label>
                          <Button size="sm" className="h-7 text-xs px-3" onClick={saveEditedRx} disabled={savingRx}>
                            {savingRx ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Save className="h-3 w-3 mr-1" />}
                            {saveAsNew ? 'Save Copy' : 'Save'}
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditingRxId(null)}>
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <select value={rx.status}
                            onChange={e => handleStatusChange(rx.id, e.target.value as 'draft' | 'issued')}
                            className={`text-[10px] font-semibold px-2 py-1 rounded-full border cursor-pointer outline-none ${STATUS_COLORS[rx.status] || ''}`}>
                            <option value="draft">Draft</option>
                            <option value="issued">Issued</option>
                          </select>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            title="Edit" onClick={() => openEditRx(rx)}><Pencil className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            title="Duplicate" onClick={() => navigate(`/prescriptions/new?duplicate=${rx.id}&patientId=${patient.id}`)}>
                            <Copy className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            title="PDF" onClick={() => doctor && generatePrescriptionPDF(rx, patient, doctor)}>
                            <Download className="h-3.5 w-3.5" /></Button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Table */}
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        {['Medicine','Strength','Days','×/Day','Notes'].map(h => (
                          <TableHead key={h} className="text-[10px] uppercase tracking-wider h-8 font-semibold">{h}</TableHead>
                        ))}
                        {isEditing && <TableHead className="w-8" />}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(isEditing ? editItems : rx.items).map((item, idx) => (
                        <TableRow key={item.id} className="hover:bg-transparent">
                          <TableCell className="py-2 text-sm font-medium">
                            {isEditing
                              ? <Input className="h-7 text-xs w-36" value={item.medicineName} readOnly />
                              : item.medicineName}
                          </TableCell>
                          <TableCell className="py-2 text-xs text-muted-foreground">
                            {isEditing
                              ? <Input className="h-7 text-xs w-20" value={item.strength || ''} placeholder="500mg"
                                  onChange={e => updateEditItem(idx, 'strength', e.target.value)} />
                              : (item.strength || '—')}
                          </TableCell>
                          <TableCell className="py-2 text-xs text-muted-foreground">
                            {isEditing
                              ? <Input className="h-7 text-xs w-14" type="number" min={1} max={365} value={item.days}
                                  onChange={e => updateEditItem(idx, 'days', parseInt(e.target.value) || 1)} />
                              : `${item.days}d`}
                          </TableCell>
                          <TableCell className="py-2 text-xs text-muted-foreground">
                            {isEditing
                              ? <Input className="h-7 text-xs w-14" type="number" min={1} max={10} value={item.times_per_day}
                                  onChange={e => updateEditItem(idx, 'times_per_day', parseInt(e.target.value) || 1)} />
                              : `${item.times_per_day}/day`}
                          </TableCell>
                          <TableCell className="py-2 text-xs text-muted-foreground">
                            {isEditing
                              ? <Input className="h-7 text-xs w-28" value={item.notes || ''} placeholder="After food..."
                                  onChange={e => updateEditItem(idx, 'notes', e.target.value)} />
                              : (item.notes || '—')}
                          </TableCell>
                          {isEditing && (
                            <TableCell className="py-2 w-8">
                              <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive/70 hover:text-destructive"
                                onClick={() => setEditItems(prev => prev.filter((_, i) => i !== idx))}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {isEditing && (
                    <div className="px-4 pb-4 pt-2 border-t bg-muted/20">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1">
                        <PlusCircle className="h-3 w-3" /> Add Medicine
                      </p>
                      <MedicineSearch onSelect={addMedicineToEdit} />
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
