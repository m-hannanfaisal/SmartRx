import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Stethoscope, Plus, Trash2, X, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  getTemplates, getDiseases, deleteTemplate, addTemplate, addDisease, getMedicines,
} from '@/lib/store';
import type { DiseaseTemplate, Disease, Medicine } from '@/lib/types';
import { toast } from 'sonner';

export default function TemplatesPage() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [diseaseOpen, setDiseaseOpen] = useState(false);
  const [newDiseaseName, setNewDiseaseName] = useState('');
  const [templates, setTemplates] = useState<DiseaseTemplate[]>([]);
  const [diseases, setDiseases] = useState<Disease[]>([]);
  const [allMedicines, setAllMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    diseaseId: '',
    name: '',
    medicines: [] as { medicine_id: string; medicineName: string; days: number; times_per_day: number }[],
  });
  const [medSearch, setMedSearch] = useState('');

  const reload = async () => {
    setLoading(true);
    const [t, d, m] = await Promise.all([getTemplates(), getDiseases(), getMedicines()]);
    setTemplates(t); setDiseases(d); setAllMedicines(m);
    setLoading(false);
  };

  useEffect(() => { reload(); }, []);

  const filteredMeds = medSearch.length >= 1
    ? allMedicines.filter(m => m.name.toLowerCase().includes(medSearch.toLowerCase())).slice(0, 6)
    : [];

  const addMedToTemplate = (med: Medicine) => {
    if (form.medicines.some(m => m.medicine_id === med.id)) return;
    setForm({
      ...form,
      medicines: [...form.medicines, { medicine_id: med.id, medicineName: med.name, days: 5, times_per_day: 1 }],
    });
    setMedSearch('');
  };

  const removeMedFromTemplate = (idx: number) => {
    setForm({ ...form, medicines: form.medicines.filter((_, i) => i !== idx) });
  };

  const updateMedField = (idx: number, field: 'days' | 'times_per_day', value: number) => {
    const updated = [...form.medicines];
    updated[idx][field] = value;
    setForm({ ...form, medicines: updated });
  };

  const handleCreateTemplate = async () => {
    if (!form.diseaseId || !form.name || form.medicines.length === 0) {
      toast.error('Please fill disease, name, and at least one medicine'); return;
    }
    try {
      await addTemplate({
        diseaseId: form.diseaseId,
        name: form.name,
        medicines: form.medicines.map(m => ({
          medicine_id: m.medicine_id, days: m.days, times_per_day: m.times_per_day,
        })),
      });
      toast.success('Template created');
      setForm({ diseaseId: '', name: '', medicines: [] });
      setOpen(false);
      reload();
    } catch (e: any) { toast.error(e.message || 'Failed'); }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteTemplate(id);
      toast.success('Template deleted');
      reload();
    } catch (e: any) { toast.error(e.message || 'Failed'); }
  };

  const handleAddDisease = async () => {
    if (!newDiseaseName.trim()) { toast.error('Enter disease name'); return; }
    try {
      await addDisease(newDiseaseName.trim());
      toast.success('Disease added');
      setNewDiseaseName('');
      setDiseaseOpen(false);
      reload();
    } catch (e: any) { toast.error(e.message || 'Failed'); }
  };

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Disease Templates</h1>
          <p className="text-muted-foreground text-sm mt-1">Preset prescription templates for quick consultations</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={diseaseOpen} onOpenChange={setDiseaseOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm"><Plus className="h-4 w-4 mr-1.5" /> Add Disease</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add New Disease</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>Disease Name</Label>
                  <Input value={newDiseaseName} onChange={e => setNewDiseaseName(e.target.value)} placeholder="e.g. Bronchitis" />
                </div>
                <Button onClick={handleAddDisease} className="w-full">Add Disease</Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="shadow-sm"><Plus className="h-4 w-4 mr-1.5" /> New Template</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Create Template</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Disease *</Label>
                    <Select value={form.diseaseId} onValueChange={v => setForm({ ...form, diseaseId: v })}>
                      <SelectTrigger><SelectValue placeholder="Select disease" /></SelectTrigger>
                      <SelectContent>
                        {diseases.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Template Name *</Label>
                    <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Standard Treatment" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Add Medicines</Label>
                  <div className="relative">
                    <Input value={medSearch} onChange={e => setMedSearch(e.target.value)} placeholder="Search medicine..." />
                    {filteredMeds.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-card border rounded-lg shadow-lg max-h-40 overflow-y-auto">
                        {filteredMeds.map(m => (
                          <button key={m.id} className="w-full text-left px-3 py-2 hover:bg-accent text-sm"
                            onClick={() => addMedToTemplate(m)}>
                            {m.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {form.medicines.length > 0 && (
                  <div className="space-y-2">
                    {form.medicines.map((m, i) => (
                      <div key={i} className="flex items-center gap-2 p-2 bg-muted rounded-lg text-sm">
                        <span className="flex-1 font-medium truncate">{m.medicineName}</span>
                        <Input type="number" min={1} className="w-16 h-8 text-xs" value={m.days}
                          onChange={e => updateMedField(i, 'days', parseInt(e.target.value) || 1)} />
                        <span className="text-xs text-muted-foreground">days</span>
                        <Input type="number" min={1} className="w-16 h-8 text-xs" value={m.times_per_day}
                          onChange={e => updateMedField(i, 'times_per_day', parseInt(e.target.value) || 1)} />
                        <span className="text-xs text-muted-foreground">/day</span>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeMedFromTemplate(i)}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <Button onClick={handleCreateTemplate} className="w-full">Create Template</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : templates.length === 0 ? (
        <Card className="card-shadow">
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Stethoscope className="h-12 w-12 mb-3 opacity-30" />
            <p className="font-medium">No templates yet</p>
            <p className="text-xs mt-1">Create your first disease template</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {templates.map(t => (
            <Card key={t.id} className="card-shadow card-hover overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-accent flex items-center justify-center">
                      <Stethoscope className="h-4 w-4 text-accent-foreground" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{t.diseaseName}</p>
                      <p className="text-xs text-muted-foreground font-normal">{t.name}</p>
                    </div>
                  </CardTitle>
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" className="text-xs"
                      onClick={() => navigate(`/prescriptions/new?disease=${t.disease_id}`)}>
                      Use
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive/60 hover:text-destructive"
                      onClick={() => handleDelete(t.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-2">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-[10px] uppercase tracking-wider h-8 font-semibold">Medicine</TableHead>
                      <TableHead className="text-[10px] uppercase tracking-wider h-8 font-semibold text-right">Dosage</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {t.medicines.map((m, i) => (
                      <TableRow key={i} className="hover:bg-transparent">
                        <TableCell className="py-2 text-sm">{m.medicineName}</TableCell>
                        <TableCell className="py-2 text-xs text-muted-foreground text-right">{m.days}d × {m.times_per_day}/day</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
