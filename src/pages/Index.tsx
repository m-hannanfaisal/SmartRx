import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  Activity, ArrowRight, ShieldCheck, Database, 
  Users, Sparkles, FileText, Pill, Shield, LayoutTemplate,
  Stethoscope, CheckCircle2, HeartPulse, ClipboardCheck, 
  Clock, Zap, Microscope, BookOpen, UserCircle
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { HeartbeatAnimation } from '@/components/ui/FullScreenOverlay';

export default function Index() {
  const { doctor } = useAuth();
  
  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-background font-sans selection:bg-primary/20 overflow-x-hidden">
      {/* Navigation */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md transition-all duration-300">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 group cursor-pointer" onClick={() => window.scrollTo({top: 0, behavior: 'smooth'})}>
            <div className="bg-primary text-primary-foreground p-1.5 rounded-lg group-hover:scale-110 transition-transform animate-heart-beat">
              <Activity className="h-5 w-5" />
            </div>
            <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent" style={{ WebkitBackgroundClip: 'text' }}>SmartRx</span>
          </div>
          
          <nav className="hidden md:flex gap-8 text-sm font-semibold text-muted-foreground">
            {['features', 'workflow', 'tech', 'impact'].map((item) => (
              <button 
                key={item}
                onClick={() => scrollToSection(item)} 
                className="hover:text-primary capitalize transition-colors relative group"
              >
                {item}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all group-hover:w-full" />
              </button>
            ))}
          </nav>
          
          <div className="flex items-center gap-4">
            <Link
              to="/patient/login"
              className="text-sm font-semibold text-teal-600 hover:text-teal-700 transition-colors hidden sm:flex items-center gap-1.5"
            >
              <UserCircle className="h-4 w-4" />
              Patient Portal
            </Link>
            {doctor ? (
              <Button asChild className="rounded-full">
                <Link to="/dashboard">Dashboard</Link>
              </Button>
            ) : (
              <>
                <Link to="/login" className="text-sm font-semibold hover:text-primary transition-colors hidden sm:block">
                  Doctor Sign in
                </Link>
                <Button asChild className="rounded-full shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all active:scale-95">
                  <Link to="/login">
                    Get Started <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="relative pt-20 pb-32 lg:pt-32 lg:pb-48">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-blue-100/50 via-transparent to-transparent -z-10" />
          <div className="absolute top-1/4 -left-20 w-96 h-96 bg-primary/5 rounded-full blur-3xl -z-10 animate-pulse" />
          
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div className="text-left animate-fade-up">
                <div className="inline-flex items-center rounded-full border border-primary/20 px-4 py-1.5 text-xs font-bold mb-8 bg-primary/5 text-primary backdrop-blur-sm">
                  <Sparkles className="h-3.5 w-3.5 mr-2 animate-pulse" />
                  NEXT GEN MEDICAL PLATFORM
                </div>
                
                <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight mb-8 leading-[1.05] text-slate-900">
                  Prescriptions, <br/>
                  <span className="text-primary inline-block">
                    reimagined
                  </span><br/> 
                  for modern clinics.
                </h1>
                
                <p className="text-xl text-slate-600 mb-10 leading-relaxed max-w-xl">
                  SmartRx transforms patient encounters with AI-driven suggestions, instant PDF generation, and secure history tracking. Built for physicians who value precision and speed.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-5">
                  <Button size="lg" asChild className="rounded-full h-14 px-10 text-lg shadow-xl shadow-primary/25 hover:-translate-y-1 transition-all">
                    <Link to="/login">
                      Launch SmartRx
                    </Link>
                  </Button>
                  <Button size="lg" variant="outline" onClick={() => scrollToSection('features')} className="rounded-full h-14 px-10 text-lg hover:bg-secondary/50 transition-all border-2">
                    Learn More
                  </Button>
                </div>

                <div className="mt-12 flex items-center gap-6">
                  <div className="flex -space-x-3">
                    {[1,2,3,4].map(i => (
                      <div key={i} className="w-10 h-10 rounded-full border-2 border-background bg-slate-200 flex items-center justify-center text-[10px] font-bold">
                        DR
                      </div>
                    ))}
                  </div>
                  <p className="text-sm text-slate-500 font-medium">
                    <span className="text-slate-900 font-bold">500+</span> Doctors trust SmartRx daily
                  </p>
                </div>
              </div>
              
              <div className="relative animate-fade-up [animation-delay:200ms]">
                <div className="absolute inset-0 bg-primary/10 rounded-full blur-3xl animate-pulse" />
                <div className="relative bg-white border border-slate-200 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] rounded-3xl p-8 transform lg:rotate-3 hover:rotate-0 transition-transform duration-700 ease-out">
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center text-white shadow-lg animate-heart-beat overflow-hidden p-2">
                        <HeartbeatAnimation className="w-full h-full text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900">New Prescription</h3>
                        <p className="text-xs text-slate-500">ID: #RX-29402</p>
                      </div>
                    </div>
                    <div className="h-2 w-24 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-primary w-2/3 animate-pulse" />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Patient Vitals</span>
                        <HeartPulse className="h-4 w-4 text-rose-500 animate-heart-beat" />
                      </div>
                      <div className="h-12 flex items-end gap-1 px-2">
                        {[40, 70, 45, 90, 65, 80, 50, 85, 60, 75, 40, 95].map((h, i) => (
                          <div key={i} className="flex-1 bg-primary/20 rounded-t-sm transition-all hover:bg-primary" style={{height: `${h}%`}} />
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3">
                      {[
                        { n: 'Amoxicillin', d: '500mg • 2x daily', c: 'bg-blue-50' },
                        { n: 'Paracetamol', d: '1g • As needed', c: 'bg-emerald-50' }
                      ].map((m, i) => (
                        <div key={i} className={`flex items-center gap-4 p-4 rounded-2xl border border-transparent hover:border-slate-200 transition-all ${m.c}`}>
                          <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center">
                            <Pill className="h-5 w-5 text-slate-600" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900">{m.n}</p>
                            <p className="text-xs text-slate-500 font-medium">{m.d}</p>
                          </div>
                          <CheckCircle2 className="ml-auto h-5 w-5 text-emerald-500" />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-8 pt-6 border-t flex items-center justify-between">
                    <div className="flex gap-2">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                        <ClipboardCheck className="h-4 w-4 text-slate-500" />
                      </div>
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                        <Database className="h-4 w-4 text-slate-500" />
                      </div>
                    </div>
                    <Button size="sm" className="rounded-xl shadow-lg shadow-primary/20">
                      Issue Prescription
                    </Button>
                  </div>
                </div>

                {/* Floating Elements */}
                <div className="absolute -top-6 -right-6 bg-white shadow-xl rounded-2xl p-4 border border-slate-100 animate-bounce transition-all duration-[3000ms]">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
                      <Zap className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Save Time</p>
                      <p className="text-xs font-bold text-slate-900">95% Faster Rx</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-32 bg-slate-50/50">
          <div className="container mx-auto px-4">
            <div className="text-center max-w-3xl mx-auto mb-20 animate-fade-up">
              <h2 className="text-base font-bold text-primary tracking-widest uppercase mb-4">Core Capabilities</h2>
              <h3 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-6 tracking-tight">Everything a small clinic needs</h3>
              <p className="text-lg text-slate-600 font-medium">SmartRx is more than just a form. It's a comprehensive clinical workflow engine built for high-performance medical teams.</p>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {[
                { icon: Users, title: 'Patient Hub', desc: 'Secure patient record management with intelligent search and history tracking.', color: 'bg-blue-500' },
                { icon: Sparkles, title: 'Smart Suggest', desc: 'Advanced analytics that recommend medicines based on common clinical pairings.', color: 'bg-purple-500' },
                { icon: LayoutTemplate, title: 'Rapid Templates', desc: 'Pre-configure entire prescriptions for common conditions like Flu or Malaria.', color: 'bg-orange-500' },
                { icon: Pill, title: 'Seeded Catalog', desc: 'Comprehensive medicine database with 200+ entries pre-loaded for use.', color: 'bg-emerald-500' },
                { icon: Shield, title: 'Data Isolation', desc: 'Multi-tenant architecture with Row-Level Security ensures absolute data privacy.', color: 'bg-rose-500' },
                { icon: Database, title: '3NF Database', desc: 'Optimized PostgreSQL architecture for zero data redundancy and maximum speed.', color: 'bg-indigo-500' },
              ].map((f, i) => (
                <div key={i} className="group bg-white border border-slate-200 rounded-3xl p-8 hover:shadow-[0_20px_40px_-12px_rgba(0,0,0,0.08)] hover:-translate-y-2 transition-all duration-300 animate-fade-up" style={{animationDelay: `${i * 100}ms`}}>
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${f.color} text-white shadow-lg mb-6 group-hover:scale-110 transition-transform`}>
                    <f.icon className="h-7 w-7" />
                  </div>
                  <h4 className="text-xl font-bold text-slate-900 mb-3">{f.title}</h4>
                  <p className="text-slate-500 leading-relaxed font-medium">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Workflow Section */}
        <section id="workflow" className="py-32 overflow-hidden">
          <div className="container mx-auto px-4">
            <div className="flex flex-col lg:flex-row items-center gap-20">
              <div className="lg:w-1/2 animate-fade-up">
                <h2 className="text-base font-bold text-primary tracking-widest uppercase mb-4">Patient Journey</h2>
                <h3 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-8 leading-tight">Patient to prescription in under 30 seconds</h3>
                <div className="space-y-10">
                  {[
                    { n: '1', t: 'Select or Add Patient', d: 'Quick search or single-click entry with auto-generated medical IDs.', i: Users },
                    { n: '2', t: 'Select Diagnosis', d: 'Apply disease templates to instantly populate standard medicine sets.', i: Microscope },
                    { n: '3', t: 'Add Medicines', d: 'Use smart suggestions to add remaining medicines with correct dosages.', i: Pill },
                    { n: '4', t: 'Print & Complete', d: 'Generate a branded, professional PDF prescription in one click.', i: FileText },
                  ].map((s, i) => (
                    <div key={i} className="flex gap-6 relative">
                      {i < 3 && <div className="absolute top-12 left-6 bottom-0 w-0.5 bg-slate-100" />}
                      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center shrink-0 z-10 group-hover:bg-primary transition-colors">
                        <s.i className="h-5 w-5 text-slate-900" />
                      </div>
                      <div>
                        <h5 className="font-bold text-slate-900 mb-1">{s.t}</h5>
                        <p className="text-slate-500 font-medium text-sm">{s.d}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="lg:w-1/2 relative animate-fade-up [animation-delay:300ms]">
                <div className="bg-slate-900 rounded-[2.5rem] p-12 text-white relative shadow-2xl overflow-hidden">
                  <div className="absolute top-0 right-0 p-8 opacity-10">
                    <Activity className="w-64 h-64" />
                  </div>
                  <div className="relative z-10">
                    <div className="w-24 h-24 bg-primary rounded-3xl flex items-center justify-center mb-8 shadow-xl animate-heart-beat overflow-hidden p-3">
                      <HeartbeatAnimation className="w-full h-full text-white" />
                    </div>
                    <p className="text-primary font-bold tracking-widest uppercase text-sm mb-4">Clinical Efficiency</p>
                    <h4 className="text-3xl font-bold mb-6">Designed for real medical environments.</h4>
                    <p className="text-slate-400 text-lg leading-relaxed mb-8">
                      We spent hours observing clinical workflows to build an interface that minimizes clicks and maximizes patient care time.
                    </p>
                    <div className="grid grid-cols-2 gap-8 border-t border-slate-800 pt-8">
                      <div>
                        <p className="text-3xl font-bold text-white mb-1">95%</p>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Time Reduction</p>
                      </div>
                      <div>
                        <p className="text-3xl font-bold text-white mb-1">Zero</p>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Data Errors</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section id="impact" className="py-24 bg-primary selection:bg-white/20">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-12 max-w-5xl mx-auto">
              {[
                { v: '10k+', l: 'Prescriptions Issued', i: FileText },
                { v: '500+', l: 'Clinic Partners', i: Users },
                { v: '200+', l: 'Medicine Catalog', i: Pill },
                { v: '24/7', l: 'Database Uptime', i: Clock },
              ].map((s, i) => (
                <div key={i} className="text-center text-white animate-fade-up" style={{animationDelay: `${i * 100}ms`}}>
                  <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center mx-auto mb-6">
                    <s.i className="h-6 w-6" />
                  </div>
                  <div className="text-4xl font-extrabold mb-2">{s.v}</div>
                  <div className="text-sm font-bold text-primary-foreground/70 uppercase tracking-widest">{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Patient Portal CTA */}
        <section className="py-24 bg-gradient-to-br from-teal-500 via-teal-600 to-emerald-600 relative overflow-hidden">
          <div className="absolute top-0 right-0 opacity-10">
            <HeartPulse className="w-96 h-96 text-white -mt-20 -mr-20" />
          </div>
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
              <div className="text-white">
                <div className="inline-flex items-center rounded-full border border-white/20 px-4 py-1.5 text-xs font-bold mb-6 bg-white/10 backdrop-blur-sm">
                  <UserCircle className="h-3.5 w-3.5 mr-2" />
                  PATIENT PORTAL
                </div>
                <h2 className="text-4xl md:text-5xl font-extrabold mb-6 tracking-tight leading-tight">Your health data,<br/>always accessible</h2>
                <p className="text-teal-100/90 text-lg mb-8 leading-relaxed">
                  Access your prescriptions, chat with your doctor, and track your medical history — all from your phone.
                </p>
                <Button size="lg" asChild className="rounded-full h-14 px-10 text-lg bg-white text-teal-700 hover:bg-teal-50 shadow-xl shadow-black/10 transition-all hover:-translate-y-1">
                  <Link to="/patient/login">
                    <UserCircle className="mr-2 h-5 w-5" /> Open Patient Portal
                  </Link>
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: FileText, title: 'Prescriptions', desc: 'View all your prescription history' },
                  { icon: Pill, title: 'Medicines', desc: 'Track your prescribed medicines' },
                  { icon: Stethoscope, title: 'Doctor Chat', desc: 'Message your doctor directly' },
                  { icon: Shield, title: 'Secure Access', desc: 'Phone number based login' },
                ].map((f, i) => (
                  <div key={i} className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-2xl p-5 hover:bg-white/15 transition-all">
                    <f.icon className="h-6 w-6 text-white mb-3" />
                    <p className="text-white font-bold text-sm mb-1">{f.title}</p>
                    <p className="text-teal-100/70 text-xs">{f.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Call to Action */}
        <section className="py-32 relative overflow-hidden">
          <div className="absolute inset-0 bg-slate-50 -z-10" />
          <div className="container mx-auto px-4 text-center max-w-3xl animate-fade-up">
            <h2 className="text-4xl md:text-6xl font-extrabold text-slate-900 mb-8 tracking-tight">Ready to modernize <br/> your clinical practice?</h2>
            <p className="text-xl text-slate-600 mb-12 leading-relaxed">
              Join the hundreds of physicians who have already upgraded to SmartRx. No credit card required to explore.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-6">
              <Button size="lg" asChild className="rounded-full h-16 px-12 text-xl shadow-2xl shadow-primary/30 hover:scale-105 transition-all">
                <Link to="/login">Get Started for Free</Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="rounded-full h-16 px-12 text-xl bg-white hover:bg-slate-50 transition-all border-2">
                <Link to="/patient/login">Patient Portal</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-white border-t py-20">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-start gap-12 mb-16">
            <div className="max-w-sm">
              <div className="flex items-center gap-2 mb-6">
                <div className="bg-primary text-white p-1.5 rounded-lg">
                  <Activity className="h-5 w-5" />
                </div>
                <span className="font-bold text-2xl">SmartRx</span>
              </div>
              <p className="text-slate-500 font-medium leading-relaxed">
                Empowering healthcare professionals with next-generation digital tools for better patient outcomes.
              </p>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-12">
              <div>
                <h5 className="font-bold text-slate-900 mb-6">Product</h5>
                <ul className="space-y-4 text-slate-500 font-medium">
                  <li><Link to="#" className="hover:text-primary transition-colors">Features</Link></li>
                  <li><Link to="/patient/login" className="hover:text-teal-600 transition-colors">Patient Portal</Link></li>
                  <li><Link to="#" className="hover:text-primary transition-colors">Updates</Link></li>
                </ul>
              </div>
              <div>
                <h5 className="font-bold text-slate-900 mb-6">Company</h5>
                <ul className="space-y-4 text-slate-500 font-medium">
                  <li><Link to="#" className="hover:text-primary transition-colors">About</Link></li>
                  <li><Link to="#" className="hover:text-primary transition-colors">Contact</Link></li>
                  <li><Link to="#" className="hover:text-primary transition-colors">Legal</Link></li>
                </ul>
              </div>
            </div>
          </div>
          
          <div className="pt-8 border-t flex flex-col sm:flex-row justify-between items-center gap-4 text-sm font-medium text-slate-400">
            <p>© 2026 SmartRx Platform. All rights reserved.</p>
            <div className="flex gap-8">
              <Link to="#" className="hover:text-primary transition-colors">Privacy Policy</Link>
              <Link to="#" className="hover:text-primary transition-colors">Terms of Service</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
