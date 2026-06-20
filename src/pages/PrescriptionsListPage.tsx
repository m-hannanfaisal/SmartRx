import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, FileText, Download, Copy, Loader2 } from 'lucide-react';
import { getPrescriptions, getPatients } from '@/lib/store';
import { useAuth } from '@/hooks/useAuth';
import { generatePrescriptionPDF } from '@/lib/pdf';
import type { Patient, Prescription } from '@/lib/types';

export default function PrescriptionsListPage() {
  const navigate = useNavigate();
  const { doctor } = useAuth();
  const [query, setQuery] = useState('');
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getPrescriptions(), getPatients()])
      .then(([rx, p]) => { setPrescriptions(rx); setPatients(p); })
      .finally(() => setLoading(false));
  }, []);

  const filtered = query
    ? prescriptions.filter(rx => {
        const p = patients.find(pt => pt.id === rx.patient_id);
        const q = query.toLowerCase();
        return rx.id.toLowerCase().includes(q) ||
          p?.name.toLowerCase().includes(q) ||
          p?.display_id.toLowerCase().includes(q);
      })
    : prescriptions;

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Prescriptions</h1>
          <p className="text-muted-foreground text-sm mt-1">{prescriptions.length} prescription records</p>
        </div>
        <Button size="sm" className="shadow-sm" onClick={() => navigate('/prescriptions/new')}>
          <Plus className="h-4 w-4 mr-1.5" /> New Prescription
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="pl-10 h-11 bg-muted/50 border-0 focus-visible:ring-1" placeholder="Search prescriptions..." value={query} onChange={e => setQuery(e.target.value)} />
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <Card className="card-shadow">
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <FileText className="h-12 w-12 mb-3 opacity-30" />
            <p className="font-medium">No prescriptions found</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="card-shadow overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="font-semibold text-xs uppercase tracking-wider">Patient</TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider">Rx ID</TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider">Date</TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider">Medicines</TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(rx => {
                const patient = patients.find(p => p.id === rx.patient_id);
                return (
                  <TableRow key={rx.id} className="table-row-hover">
                    <TableCell>
                      <button className="text-left hover:text-primary transition-colors"
                        onClick={() => patient && navigate(`/patients/${patient.id}`)}>
                        <p className="font-medium text-sm">{patient?.name || 'Unknown'}</p>
                        <p className="text-xs text-muted-foreground">{patient?.display_id}</p>
                      </button>
                    </TableCell>
                    <TableCell><span className="text-xs font-mono text-muted-foreground">{rx.id.slice(0, 8)}</span></TableCell>
                    <TableCell><span className="text-sm">{rx.date}</span></TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 max-w-[300px]">
                        {rx.items.map(i => (
                          <span key={i.id} className="badge-primary">{i.medicineName}</span>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 justify-end">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          title="Duplicate"
                          onClick={() => navigate(`/prescriptions/new?duplicate=${rx.id}&patientId=${rx.patient_id}`)}>
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          title="Download PDF"
                          onClick={() => { if (patient && doctor) generatePrescriptionPDF(rx, patient, doctor); }}>
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
