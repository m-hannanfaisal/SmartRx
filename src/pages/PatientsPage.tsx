import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Plus, Users, ArrowRight, Loader2 } from 'lucide-react';
import { getPatients, addPatient, searchPatients } from '@/lib/store';
import type { Patient } from '@/lib/types';
import { toast } from 'sonner';
import { FullScreenOverlay } from '@/components/ui/FullScreenOverlay';

export default function PatientsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(searchParams.get('action') === 'add');
  const [form, setForm] = useState({ name: '', phone: '', age: '', gender: '' as string, address: '', allergies: '' });
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);

  const reload = async () => {
    setLoading(true);
    const data = query ? await searchPatients(query) : await getPatients();
    const sorted = [...data].sort((a, b) => {
      const numA = parseInt(a.display_id.replace(/\D/g, ''), 10) || 0;
      const numB = parseInt(b.display_id.replace(/\D/g, ''), 10) || 0;
      return numB - numA;
    });
    setPatients(sorted);
    setLoading(false);
  };

  useEffect(() => { reload(); }, [query]);

  const handleAdd = async () => {
    if (!form.name || !form.phone || !form.age || !form.gender) {
      toast.error('Please fill all required fields'); return;
    }
    try {
      await addPatient({
        name: form.name,
        phone: form.phone,
        age: parseInt(form.age),
        gender: form.gender as 'Male' | 'Female' | 'Other',
        address: form.address,
        allergies: form.allergies,
      });
      setForm({ name: '', phone: '', age: '', gender: '', address: '', allergies: '' });
      setOpen(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
      reload();
    } catch (e: any) {
      toast.error(e.message || 'Failed to add patient');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl relative">
      <FullScreenOverlay show={showSuccess} type="success" message="Patient added successfully" />
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 animate-fade-up">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Patients</h1>
          <p className="text-muted-foreground text-sm mt-1">{patients.length} patient records</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="shadow-sm"><Plus className="h-4 w-4 mr-1.5" /> Add Patient</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add New Patient</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Full Name *</Label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Patient name" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Phone *</Label>
                  <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="Phone number" />
                </div>
                <div className="space-y-2">
                  <Label>Age *</Label>
                  <Input type="number" value={form.age} onChange={e => setForm({ ...form, age: e.target.value })} placeholder="Age" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Gender *</Label>
                <Select value={form.gender} onValueChange={v => setForm({ ...form, gender: v })}>
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
                <Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Address (optional)" />
                <Label>Known Allergies</Label>
                <Input value={form.allergies} onChange={e => setForm({ ...form, allergies: e.target.value })} placeholder="e.g. Penicillin, Sulfa drugs (optional)" />
              </div>
              <Button onClick={handleAdd} className="w-full">Add Patient</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative animate-fade-up" style={{ animationDelay: '100ms' }}>
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="pl-10 h-11 bg-muted/50 border-0 focus-visible:ring-1"
          placeholder="Search by ID, name, or phone..."
          value={query} onChange={e => setQuery(e.target.value)} />
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : patients.length === 0 ? (
        <Card className="card-shadow animate-fade-up" style={{ animationDelay: '200ms' }}>
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Users className="h-12 w-12 mb-3 opacity-30" />
            <p className="font-medium">No patients found</p>
            <p className="text-xs mt-1">Try adjusting your search or add a new patient</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="card-shadow overflow-hidden animate-fade-up" style={{ animationDelay: '200ms' }}>
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="font-semibold text-xs uppercase tracking-wider">Patient</TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider">ID</TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider">Phone</TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider">Age / Gender</TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider">Registered</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {patients.map(p => (
                <TableRow key={p.id} className="cursor-pointer table-row-hover" onClick={() => navigate(`/patients/${p.id}`)}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-accent flex items-center justify-center text-xs font-bold text-accent-foreground">
                        {p.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{p.name}</p>
                        {p.address && <p className="text-xs text-muted-foreground truncate max-w-[200px]">{p.address}</p>}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell><span className="text-xs font-mono text-muted-foreground">{p.display_id}</span></TableCell>
                  <TableCell><span className="text-sm">{p.phone}</span></TableCell>
                  <TableCell><span className="badge-primary">{p.age}y, {p.gender}</span></TableCell>
                  <TableCell><span className="text-xs text-muted-foreground">{p.created_at?.split('T')[0]}</span></TableCell>
                  <TableCell><ArrowRight className="h-4 w-4 text-muted-foreground/50" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
