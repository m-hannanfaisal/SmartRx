import { Outlet, Navigate, useLocation, useNavigate, Link } from 'react-router-dom';
import { usePatientAuth } from '@/hooks/usePatientAuth';
import {
  HeartPulse, LayoutDashboard, FileText, MessageCircle,
  LogOut, Loader2, Menu, X, ChevronRight,
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

const menuItems = [
  { title: 'Dashboard',     url: '/patient/dashboard',     icon: LayoutDashboard },
  { title: 'Prescriptions', url: '/patient/prescriptions', icon: FileText },
  { title: 'Chat',          url: '/patient/chat',          icon: MessageCircle },
];

export function PatientDashboardLayout() {
  const { token, patient, doctors, loading, clearPatientAuth } = usePatientAuth();
  const location  = useLocation();
  const navigate  = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-teal-50/30">
        <Loader2 className="h-6 w-6 animate-spin text-teal-500" />
      </div>
    );
  }

  if (!token) return <Navigate to="/patient/login" replace />;

  const handleLogout = () => {
    clearPatientAuth();
    navigate('/patient/login');
  };

  const isActive = (url: string) => location.pathname === url || location.pathname.startsWith(url + '/');

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:sticky top-0 left-0 z-40 h-screen w-72
          bg-white border-r border-slate-200 flex flex-col
          transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Logo / Brand */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-teal-500/20">
              <HeartPulse className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-sm text-slate-900 tracking-tight">Patient Portal</span>
              <p className="text-[10px] text-slate-400 leading-none mt-0.5">SmartRx</p>
            </div>
          </div>
          <button
            className="lg:hidden p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5 text-slate-400" />
          </button>
        </div>

        {/* Patient info card */}
        <div className="px-4 py-4">
          <div className="bg-gradient-to-br from-teal-50 to-emerald-50 rounded-2xl p-4 border border-teal-100/50">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-white text-xs font-bold shadow-md">
                {(patient?.name || 'P').split(' ').map(n => n[0]).join('').slice(0, 2)}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">{patient?.name || 'Patient'}</p>
                <p className="text-xs text-teal-600 font-medium">ID: {patient?.display_id}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-2 space-y-1">
          {menuItems.map((item) => (
            <Link
              key={item.url}
              to={item.url}
              onClick={() => setSidebarOpen(false)}
              className={`
                flex items-center gap-3 px-4 py-2.5 rounded-xl text-[13px] font-medium
                transition-all duration-200 group
                ${isActive(item.url)
                  ? 'bg-gradient-to-r from-teal-500 to-emerald-500 text-white shadow-lg shadow-teal-500/20'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }
              `}
            >
              <item.icon className={`h-4 w-4 ${isActive(item.url) ? 'text-white' : 'text-slate-400 group-hover:text-teal-500'} transition-colors`} />
              {item.title}
              {isActive(item.url) && <ChevronRight className="ml-auto h-4 w-4 text-white/60" />}
            </Link>
          ))}
        </nav>

        {/* Doctor info */}
        <div className="px-4 py-3 border-t border-slate-100">
          <div className="text-xs text-slate-400 mb-1">Your Doctors</div>
          {doctors && doctors.length > 1 ? (
            <p className="text-sm font-semibold text-slate-700 truncate">{doctors.length} Doctors Connected</p>
          ) : (
            <>
              <p className="text-sm font-semibold text-slate-700 truncate">{patient?.doctor_name}</p>
              <p className="text-xs text-slate-500 truncate">{patient?.clinic_name}</p>
            </>
          )}
        </div>

        {/* Logout */}
        <div className="p-3 border-t border-slate-100">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-[13px] font-medium text-slate-500 hover:bg-red-50 hover:text-red-600 transition-all w-full"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-16 flex items-center justify-between border-b bg-white/80 backdrop-blur-md px-4 md:px-6 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="hidden sm:block">
              <p className="text-sm font-semibold text-slate-900">
                {doctors && doctors.length > 1 ? 'SmartRx Portal' : patient?.clinic_name}
              </p>
              <p className="text-[11px] text-slate-400">
                {doctors && doctors.length > 1 ? 'Multi-Doctor Access' : patient?.specialization}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold leading-tight text-slate-900">{patient?.name}</p>
              <p className="text-[11px] text-slate-400">{patient?.display_id}</p>
            </div>
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-white text-xs font-bold shadow-md">
              {(patient?.name || 'P').split(' ').map(n => n[0]).join('').slice(0, 2)}
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
