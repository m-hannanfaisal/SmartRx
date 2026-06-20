import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getPatientPrescriptionsList } from '@/lib/patientApi';
import {
  FileText, Loader2, Calendar, Stethoscope,
  ChevronRight, Search, AlertCircle, Pill,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';

interface PrescriptionListItem {
  id: string;
  date: string;
  diagnosis: string | null;
  status: string;
  lab_tests: string | null;
  next_visit_date: string | null;
  created_at: string;
  doctor_name: string;
  clinic_name: string;
}

export default function PatientPrescriptionsPage() {
  const [prescriptions, setPrescriptions] = useState<PrescriptionListItem[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [search, setSearch]     = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const result = await getPatientPrescriptionsList();
        setPrescriptions(result as PrescriptionListItem[]);
      } catch (err: any) {
        setError(err.message || 'Failed to load prescriptions');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = prescriptions.filter(rx => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (
      (rx.diagnosis && rx.diagnosis.toLowerCase().includes(s)) ||
      rx.date.includes(s) ||
      rx.status.toLowerCase().includes(s)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">My Prescriptions</h1>
          <p className="text-sm text-slate-500 mt-1">
            {prescriptions.length} prescription{prescriptions.length !== 1 ? 's' : ''} found
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by diagnosis, date..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10 h-11 rounded-xl border-slate-200"
          />
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Prescriptions list */}
      {filtered.length === 0 ? (
        <div className="text-center py-20">
          <FileText className="h-16 w-16 mx-auto text-slate-200 mb-4" />
          <p className="text-lg font-semibold text-slate-400">No prescriptions found</p>
          <p className="text-sm text-slate-400 mt-1">
            {search ? 'Try a different search term' : 'Your prescriptions will appear here after your visit'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((rx, index) => (
            <Link
              key={rx.id}
              to={`/patient/prescriptions/${rx.id}`}
              className="block group"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-lg hover:border-teal-200 hover:-translate-y-0.5 transition-all duration-200">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 min-w-0">
                    <div className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 shadow-md ${
                      rx.status === 'issued'
                        ? 'bg-gradient-to-br from-emerald-500 to-green-600'
                        : rx.status === 'dispensed'
                        ? 'bg-gradient-to-br from-blue-500 to-indigo-600'
                        : 'bg-gradient-to-br from-amber-500 to-orange-600'
                    }`}>
                      <FileText className="h-5 w-5 text-white" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-base font-semibold text-slate-900 group-hover:text-teal-600 transition-colors truncate">
                        {rx.diagnosis || 'General Consultation'}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5">
                        <span className="flex items-center gap-1.5 text-xs text-slate-500">
                          <Calendar className="h-3.5 w-3.5" />
                          {format(new Date(rx.date), 'MMM dd, yyyy')}
                        </span>
                        <span className="flex items-center gap-1.5 text-xs text-slate-500">
                          <Stethoscope className="h-3.5 w-3.5" />
                          Dr. {rx.doctor_name}
                        </span>
                        {rx.lab_tests && (
                          <span className="flex items-center gap-1.5 text-xs text-purple-600">
                            <Pill className="h-3.5 w-3.5" />
                            Lab tests ordered
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                      rx.status === 'issued'
                        ? 'bg-emerald-100 text-emerald-700'
                        : rx.status === 'dispensed'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}>
                      {rx.status}
                    </span>
                    <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-teal-500 transition-colors" />
                  </div>
                </div>

                {rx.next_visit_date && (
                  <div className="mt-3 flex items-center gap-2 text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    Next visit: {format(new Date(rx.next_visit_date), 'MMM dd, yyyy')}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
