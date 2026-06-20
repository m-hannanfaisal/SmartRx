import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getPatientPrescriptionDetail } from '@/lib/patientApi';
import {
  ArrowLeft, FileText, Loader2, Calendar, Stethoscope,
  Pill, Clock, AlertCircle, ClipboardList, FlaskConical,
  User, Building, Phone,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

interface PrescriptionDetail {
  id: string;
  patient_id: string;
  doctor_id: string;
  date: string;
  diagnosis: string | null;
  status: string;
  lab_tests: string | null;
  next_visit_date: string | null;
  created_at: string;
  doctor_name: string;
  clinic_name: string;
  doctor_specialization: string;
  doctor_phone: string | null;
  items: {
    id: string;
    medicine_id: string;
    medicineName: string;
    category: string;
    description: string | null;
    strength: string | null;
    days: number;
    times_per_day: number;
    notes: string | null;
  }[];
}

export default function PatientPrescriptionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [rx, setRx]         = useState<PrescriptionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      try {
        const result = await getPatientPrescriptionDetail(id);
        setRx(result as PrescriptionDetail);
      } catch (err: any) {
        setError(err.message || 'Failed to load prescription');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
      </div>
    );
  }

  if (error || !rx) {
    return (
      <div className="max-w-3xl mx-auto py-20 text-center">
        <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
        <p className="text-lg font-semibold text-destructive">{error || 'Prescription not found'}</p>
        <Button variant="outline" asChild className="mt-4">
          <Link to="/patient/prescriptions"><ArrowLeft className="mr-2 h-4 w-4" /> Back</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Back button */}
      <Link
        to="/patient/prescriptions"
        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-teal-600 transition-colors group"
      >
        <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
        Back to Prescriptions
      </Link>

      {/* Header card */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 rounded-3xl p-8 text-white shadow-2xl">
        <div className="absolute top-0 right-0 opacity-5">
          <FileText className="w-48 h-48 -mt-8 -mr-8" />
        </div>
        <div className="relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="h-12 w-12 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center">
                  <FileText className="h-6 w-6 text-teal-400" />
                </div>
                <div>
                  <h1 className="text-xl font-extrabold">
                    {rx.diagnosis || 'General Consultation'}
                  </h1>
                  <p className="text-slate-400 text-sm">Prescription Details</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-sm text-slate-300">
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-teal-400" />
                  {format(new Date(rx.date), 'MMMM dd, yyyy')}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-teal-400" />
                  {format(new Date(rx.created_at), 'hh:mm a')}
                </span>
              </div>
            </div>
            <span className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider self-start ${
              rx.status === 'issued'
                ? 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30'
                : rx.status === 'dispensed'
                ? 'bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/30'
                : 'bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/30'
            }`}>
              {rx.status}
            </span>
          </div>
        </div>
      </div>

      {/* Doctor info */}
      <Card className="border-0 shadow-lg shadow-slate-200/50 bg-white overflow-hidden">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-md">
              <Stethoscope className="h-5 w-5 text-white" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">Doctor Information</h2>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 bg-slate-50 rounded-xl p-3">
              <User className="h-4 w-4 text-teal-500" />
              <div>
                <p className="text-[11px] text-slate-400 font-medium">Doctor</p>
                <p className="text-sm font-semibold text-slate-900">Dr. {rx.doctor_name}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-slate-50 rounded-xl p-3">
              <Building className="h-4 w-4 text-teal-500" />
              <div>
                <p className="text-[11px] text-slate-400 font-medium">Clinic</p>
                <p className="text-sm font-semibold text-slate-900">{rx.clinic_name}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-slate-50 rounded-xl p-3">
              <Stethoscope className="h-4 w-4 text-teal-500" />
              <div>
                <p className="text-[11px] text-slate-400 font-medium">Specialization</p>
                <p className="text-sm font-semibold text-slate-900">{rx.doctor_specialization}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Medicines */}
      <Card className="border-0 shadow-lg shadow-slate-200/50 bg-white overflow-hidden">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center shadow-md">
              <Pill className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Prescribed Medicines</h2>
              <p className="text-xs text-slate-400">{rx.items.length} medicine{rx.items.length !== 1 ? 's' : ''}</p>
            </div>
          </div>

          <div className="space-y-3">
            {rx.items.map((item, index) => (
              <div
                key={item.id}
                className="bg-slate-50 border border-slate-100 rounded-2xl p-5 hover:bg-slate-100/70 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="h-9 w-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-sm font-bold text-slate-400 shrink-0 shadow-sm">
                      {index + 1}
                    </div>
                    <div>
                      <p className="text-base font-bold text-slate-900">{item.medicineName}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-1.5">
                        {item.strength && (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-md text-xs font-semibold">{item.strength}</span>
                        )}
                        <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-md text-xs font-semibold">{item.category}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="bg-white rounded-lg p-2.5 border border-slate-100">
                    <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Duration</p>
                    <p className="text-sm font-bold text-slate-900 mt-0.5">{item.days} days</p>
                  </div>
                  <div className="bg-white rounded-lg p-2.5 border border-slate-100">
                    <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Frequency</p>
                    <p className="text-sm font-bold text-slate-900 mt-0.5">{item.times_per_day}x / day</p>
                  </div>
                  {item.description && (
                    <div className="bg-white rounded-lg p-2.5 border border-slate-100 col-span-2 sm:col-span-1">
                      <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Instructions</p>
                      <p className="text-sm font-medium text-slate-700 mt-0.5">{item.description}</p>
                    </div>
                  )}
                </div>

                {item.notes && (
                  <div className="mt-3 bg-amber-50 border border-amber-100 rounded-lg p-3">
                    <p className="text-xs text-amber-700">
                      <strong>Note:</strong> {item.notes}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Lab tests & Next visit */}
      {(rx.lab_tests || rx.next_visit_date) && (
        <div className="grid sm:grid-cols-2 gap-4">
          {rx.lab_tests && (
            <Card className="border-0 shadow-lg shadow-slate-200/50 bg-white overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center shadow-md">
                    <FlaskConical className="h-4 w-4 text-white" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900">Lab Tests</h3>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed bg-rose-50 border border-rose-100 rounded-xl p-4">{rx.lab_tests}</p>
              </CardContent>
            </Card>
          )}

          {rx.next_visit_date && (
            <Card className="border-0 shadow-lg shadow-slate-200/50 bg-white overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-md">
                    <Calendar className="h-4 w-4 text-white" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900">Next Visit</h3>
                </div>
                <p className="text-2xl font-extrabold text-slate-900">
                  {format(new Date(rx.next_visit_date), 'MMMM dd, yyyy')}
                </p>
                <p className="text-sm text-slate-500 mt-1">
                  Please visit {rx.clinic_name} on this date
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
