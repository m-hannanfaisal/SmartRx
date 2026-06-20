import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Plus, Pill, Loader2 } from 'lucide-react';
import { getMedicines, addMedicine, searchMedicines } from '@/lib/store';
import type { Medicine } from '@/lib/types';
import { toast } from 'sonner';
import { FullScreenOverlay } from '@/components/ui/FullScreenOverlay';

export default function MedicinesPage() {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', category: '' });
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);

  const reload = async () => {
    setLoading(true);
    const data = query ? await searchMedicines(query) : await getMedicines();
    setMedicines(data);
    setLoading(false);
  };

  useEffect(() => { reload(); }, [query]);

  const handleAdd = async () => {
    if (!form.name || !form.category) { toast.error('Fill all fields'); return; }
    try {
      await addMedicine(form.name, form.category);
      setForm({ name: '', category: '' });
      setOpen(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
      reload();
    } catch (e: any) {
      toast.error(e.message || 'Failed');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl relative">
      <FullScreenOverlay show={showSuccess} type="success" message="Medicine added successfully" />
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 animate-fade-up">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Medicines Database</h1>
          <p className="text-muted-foreground text-sm mt-1">{medicines.length} medicines in catalog</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="shadow-sm"><Plus className="h-4 w-4 mr-1.5" /> Add Medicine</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add New Medicine</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Medicine Name</Label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Amoxicillin 250mg" />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} placeholder="e.g. Antibiotic" />
              </div>
              <Button onClick={handleAdd} className="w-full">Add Medicine</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative animate-fade-up" style={{ animationDelay: '100ms' }}>
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="pl-10 h-11 bg-muted/50 border-0 focus-visible:ring-1" placeholder="Search medicines..." value={query} onChange={e => setQuery(e.target.value)} />
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : medicines.length === 0 ? (
        <Card className="card-shadow animate-fade-up" style={{ animationDelay: '200ms' }}>
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Pill className="h-12 w-12 mb-3 opacity-30" />
            <p className="font-medium">No medicines found</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="card-shadow overflow-hidden animate-fade-up" style={{ animationDelay: '200ms' }}>
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="font-semibold text-xs uppercase tracking-wider">#</TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider">Medicine Name</TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider">Category</TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider text-right">Usage Count</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {medicines.map((m, i) => (
                <TableRow key={m.id} className="table-row-hover">
                  <TableCell><span className="text-xs text-muted-foreground font-mono">{i + 1}</span></TableCell>
                  <TableCell><span className="font-medium text-sm">{m.name}</span></TableCell>
                  <TableCell><span className="badge-primary">{m.category}</span></TableCell>
                  <TableCell className="text-right">
                    <span className="text-sm font-semibold text-primary">{m.usage_count}</span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
