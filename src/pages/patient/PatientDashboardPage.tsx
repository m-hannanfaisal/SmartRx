import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { usePatientAuth } from '@/hooks/usePatientAuth';
import { getPatientDashboard } from '@/lib/patientApi';
import {
  FileText, MessageCircle, Pill, Calendar,
  Loader2, ArrowRight, HeartPulse, Activity,
  Stethoscope, Clock, AlertCircle, Users,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

interface DoctorRelation {
  patient_id: string;
  doctor_id: string;
  doctor_name: string;
  clinic_name: string;
  specialization: string;
}

interface DashboardData {
  totalPrescriptions: number;
  unreadMessages: number;
  totalMedicines: number;
  totalVisits: number;
  doctorCount: number;
  doctors: DoctorRelation[];
  latestPrescription: {
    id: string;
    date: string;
    diagnosis: string;
    status: string;
    next_visit_date: string | null;
    doctor_name?: string;
    clinic_name?: string;
  } | null;
  patient: {
    id: string;
    display_id: string;
    name: string;
    phone: string;
    age: number;
    gender: string;
    address: string;
    allergies: string;
    visit_count: number;
    last_visit_date: string | null;
    doctor_name: string;
    clinic_name: string;
    specialization: string;
  };
}

export default function PatientDashboardPage() {
  const { patient, setDoctors } = usePatientAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const result = await getPatientDashboard();
        const d = result as DashboardData;
        setData(d);
        // Sync doctors into auth context
        if (d.doctors) {
          setDoctors(d.doctors);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <p className="text-lg font-semibold text-destructive">{error}</p>
      </div>
    );
  }

  const d = data!;
  const greeting = getGreeting();

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Welcome header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-teal-500 via-teal-600 to-emerald-600 rounded-3xl p-8 md:p-10 text-white shadow-2xl shadow-teal-500/20">
        <div className="absolute top-0 right-0 opacity-10">
          <HeartPulse className="w-64 h-64 -mt-16 -mr-16" />
        </div>
        <div className="relative z-10">
          <p className="text-teal-100 text-sm font-semibold mb-1">{greeting}</p>
          <h1 className="text-3xl md:text-4xl font-extrabold mb-2">{d.patient.name}</h1>
          <p className="text-teal-100/80 text-sm">
            {d.patient.phone} • {d.patient.age} yrs • {d.patient.gender}
          </p>
          {d.doctorCount > 1 ? (
            <div className="flex items-center gap-2 mt-4 text-sm text-teal-100">
              <Users className="h-4 w-4" />
              <span>{d.doctorCount} doctors connected</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 mt-4 text-sm text-teal-100">
              <Stethoscope className="h-4 w-4" />
              <span>Dr. {d.patient.doctor_name} — {d.patient.clinic_name}</span>
            </div>
          )}
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatsCard
          icon={FileText}
          label="Total Prescriptions"
          value={d.totalPrescriptions}
          color="from-blue-500 to-indigo-600"
          shadowColor="shadow-blue-500/20"
          link="/patient/prescriptions"
        />
        <StatsCard
          icon={Pill}
          label="Medicines Prescribed"
          value={d.totalMedicines}
          color="from-purple-500 to-violet-600"
          shadowColor="shadow-purple-500/20"
        />
        <StatsCard
          icon={MessageCircle}
          label="Unread Messages"
          value={d.unreadMessages}
          color="from-amber-500 to-orange-600"
          shadowColor="shadow-amber-500/20"
          link="/patient/chat"
          highlight={d.unreadMessages > 0}
        />
        <StatsCard
          icon={Calendar}
          label="Total Visits"
          value={d.totalVisits || d.patient.visit_count}
          color="from-emerald-500 to-green-600"
          shadowColor="shadow-emerald-500/20"
        />
      </div>

      {/* Doctors list (only show when multiple) */}
      {d.doctors && d.doctors.length > 1 && (
        <Card className="border-0 shadow-lg shadow-slate-200/50 bg-white overflow-hidden">
          <div className="px-6 pt-6 pb-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Users className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Your Doctors</h2>
              <p className="text-xs text-slate-400">{d.doctors.length} doctors connected to your account</p>
            </div>
          </div>
          <CardContent className="pb-6">
            <div className="grid sm:grid-cols-2 gap-3">
              {d.doctors.map((doc, i) => (
                <div key={doc.doctor_id} className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-slate-100 transition-colors">
                  <div className={`h-11 w-11 rounded-xl bg-gradient-to-br ${
                    ['from-teal-500 to-emerald-600', 'from-blue-500 to-indigo-600', 'from-purple-500 to-violet-600', 'from-rose-500 to-pink-600'][i % 4]
                  } flex items-center justify-center shadow-md`}>
                    <Stethoscope className="h-5 w-5 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-900 truncate">Dr. {doc.doctor_name}</p>
                    <p className="text-xs text-slate-500 truncate">{doc.clinic_name}</p>
                    <p className="text-[11px] text-slate-400">{doc.specialization}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Two column layout */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Latest Prescription */}
        <Card className="border-0 shadow-lg shadow-slate-200/50 bg-white overflow-hidden">
          <div className="px-6 pt-6 pb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                <FileText className="h-5 w-5 text-white" />
              </div>
              <h2 className="text-lg font-bold text-slate-900">Latest Prescription</h2>
            </div>
            <Button variant="ghost" size="sm" asChild className="text-teal-600 hover:text-teal-700">
              <Link to="/patient/prescriptions">View All <ArrowRight className="ml-1 h-4 w-4" /></Link>
            </Button>
          </div>
          <CardContent className="pb-6">
            {d.latestPrescription ? (
              <Link to={`/patient/prescriptions/${d.latestPrescription.id}`} className="block">
                <div className="bg-slate-50 rounded-2xl p-5 hover:bg-slate-100 transition-colors border border-slate-100 group">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-base font-semibold text-slate-900 group-hover:text-teal-600 transition-colors">
                        {d.latestPrescription.diagnosis || 'General Consultation'}
                      </p>
                      <p className="text-sm text-slate-500 mt-1">
                        {format(new Date(d.latestPrescription.date), 'MMMM dd, yyyy')}
                      </p>
                      {d.latestPrescription.doctor_name && (
                        <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                          <Stethoscope className="h-3 w-3" />
                          Dr. {d.latestPrescription.doctor_name}
                          {d.latestPrescription.clinic_name && ` — ${d.latestPrescription.clinic_name}`}
                        </p>
                      )}
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                      d.latestPrescription.status === 'issued'
                        ? 'bg-emerald-100 text-emerald-700'
                        : d.latestPrescription.status === 'dispensed'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}>
                      {d.latestPrescription.status}
                    </span>
                  </div>
                  {d.latestPrescription.next_visit_date && (
                    <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 rounded-lg px-3 py-2 mt-3">
                      <Clock className="h-4 w-4" />
                      <span>Next visit: {format(new Date(d.latestPrescription.next_visit_date), 'MMM dd, yyyy')}</span>
                    </div>
                  )}
                </div>
              </Link>
            ) : (
              <div className="text-center py-8 text-slate-400">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No prescriptions yet</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions + Profile */}
        <Card className="border-0 shadow-lg shadow-slate-200/50 bg-white overflow-hidden">
          <div className="px-6 pt-6 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-teal-500/20">
                <Activity className="h-5 w-5 text-white" />
              </div>
              <h2 className="text-lg font-bold text-slate-900">Quick Actions</h2>
            </div>
          </div>
          <CardContent className="space-y-3 pb-6">
            <QuickAction
              icon={FileText}
              title="View Prescriptions"
              desc={`See prescriptions from ${d.doctorCount > 1 ? 'all your doctors' : 'your doctor'}`}
              link="/patient/prescriptions"
              color="bg-blue-50 text-blue-600"
            />
            <QuickAction
              icon={MessageCircle}
              title={d.doctorCount > 1 ? "Chat with Doctors" : "Chat with Doctor"}
              desc={d.doctorCount > 1 ? `Message any of your ${d.doctorCount} doctors` : "Send a message to your doctor"}
              link="/patient/chat"
              color="bg-amber-50 text-amber-600"
              badge={d.unreadMessages > 0 ? d.unreadMessages : undefined}
            />

            {/* Health info */}
            {d.patient.allergies && (
              <div className="bg-red-50 rounded-2xl p-4 border border-red-100 mt-4">
                <p className="text-xs font-bold text-red-400 uppercase tracking-wider mb-1">Known Allergies</p>
                <p className="text-sm font-semibold text-red-700">{d.patient.allergies}</p>
              </div>
            )}

            {d.patient.last_visit_date && (
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 mt-2">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Last Visit</p>
                <p className="text-sm font-semibold text-slate-700">
                  {format(new Date(d.patient.last_visit_date), 'MMMM dd, yyyy')}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatsCard({
  icon: Icon, label, value, color, shadowColor, link, highlight
}: {
  icon: any; label: string; value: number; color: string; shadowColor: string;
  link?: string; highlight?: boolean;
}) {
  const content = (
    <div className={`relative overflow-hidden rounded-2xl p-5 bg-white border border-slate-100 shadow-lg ${shadowColor} transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${highlight ? 'ring-2 ring-amber-400 ring-offset-2' : ''}`}>
      <div className={`h-11 w-11 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shadow-lg mb-4`}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <p className="text-3xl font-extrabold text-slate-900">{value}</p>
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mt-1">{label}</p>
    </div>
  );
  return link ? <Link to={link}>{content}</Link> : content;
}

function QuickAction({
  icon: Icon, title, desc, link, color, badge
}: {
  icon: any; title: string; desc: string; link: string; color: string; badge?: number;
}) {
  return (
    <Link to={link} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-slate-50 transition-all group border border-transparent hover:border-slate-100">
      <div className={`h-11 w-11 rounded-xl flex items-center justify-center ${color}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-900 group-hover:text-teal-600 transition-colors">{title}</p>
        <p className="text-xs text-slate-400">{desc}</p>
      </div>
      {badge != null && (
        <span className="px-2.5 py-1 bg-red-500 text-white text-xs font-bold rounded-full animate-pulse">{badge}</span>
      )}
      <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-teal-500 transition-colors" />
    </Link>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
}
