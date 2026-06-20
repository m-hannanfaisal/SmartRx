import { useState } from 'react';
import { Navigate, useNavigate, Link } from 'react-router-dom';
import { usePatientAuth } from '@/hooks/usePatientAuth';
import { patientSignIn, patientSignUp } from '@/lib/patientApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Activity, Loader2, Phone, Lock, ArrowLeft, User, HeartPulse, Shield } from 'lucide-react';
import { FullScreenOverlay } from '@/components/ui/FullScreenOverlay';

export default function PatientLoginPage() {
  const { token, loading, setPatientAuth } = usePatientAuth();
  const navigate = useNavigate();

  const [phone,    setPhone]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [busy,     setBusy]     = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [showLoadingAnimation, setShowLoadingAnimation] = useState(false);
  const [showErrorAnimation, setShowErrorAnimation]     = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }
  if (token) return <Navigate to="/patient/dashboard" replace />;

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      const { token: t, patient, doctors } = await patientSignIn(phone, password);
      setPatientAuth(t, patient, doctors || []);
      setShowLoadingAnimation(true);
      setTimeout(() => {
        navigate('/patient/dashboard', { replace: true });
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Sign-in failed');
      setShowErrorAnimation(true);
      setBusy(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      await patientSignUp(phone, password);
      setSignupSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Registration failed');
      setShowErrorAnimation(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-teal-50/40 p-4 relative">
      <FullScreenOverlay 
        show={showLoadingAnimation} 
        type="loading" 
        message="Loading Your Portal..." 
      />
      <FullScreenOverlay 
        show={showErrorAnimation} 
        type="error" 
        message={error} 
        onClose={() => setShowErrorAnimation(false)} 
      />

      {/* Decorative background elements */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-teal-200/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-200/20 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />

      <div className="w-full max-w-md relative z-10">
        {/* Back to home */}
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6 group"
        >
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
          Back to Home
        </Link>

        {/* Logo and branding */}
        <div className="text-center mb-8">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center mx-auto mb-4 shadow-xl shadow-teal-500/25 animate-heart-beat">
            <HeartPulse className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent" style={{ WebkitBackgroundClip: 'text' }}>
            Patient Portal
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Access your prescriptions & chat with your doctor</p>
        </div>

        <Card className="border-0 shadow-2xl shadow-slate-200/50 bg-white/80 backdrop-blur-xl">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-lg flex items-center justify-center gap-2">
              <Shield className="h-5 w-5 text-teal-500" />
              Secure Access
            </CardTitle>
            <CardDescription>Sign in with your phone number</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4 bg-slate-100/80">
                <TabsTrigger value="signin" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-teal-500 data-[state=active]:to-emerald-500 data-[state=active]:text-white">Sign In</TabsTrigger>
                <TabsTrigger value="signup" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-teal-500 data-[state=active]:to-emerald-500 data-[state=active]:text-white">Register</TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="patient-phone" className="text-sm font-semibold">Phone Number</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="patient-phone"
                        type="tel"
                        className="h-12 pl-10 rounded-xl border-slate-200 focus:border-teal-500 focus:ring-teal-500/20"
                        placeholder="03001234567"
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="patient-password" className="text-sm font-semibold">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="patient-password"
                        type="password"
                        className="h-12 pl-10 rounded-xl border-slate-200 focus:border-teal-500 focus:ring-teal-500/20"
                        placeholder="Enter your password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  {error && !showErrorAnimation && (
                    <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{error}</p>
                  )}

                  <Button
                    type="submit"
                    disabled={busy}
                    className="w-full h-12 rounded-xl shadow-lg shadow-teal-500/25 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white font-semibold text-base transition-all hover:-translate-y-0.5"
                  >
                    {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Sign In
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                {signupSuccess ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <User className="h-8 w-8 text-emerald-600" />
                    </div>
                    <p className="font-semibold text-emerald-700 text-lg">Account Created!</p>
                    <p className="text-muted-foreground mt-2 text-sm">
                      Switch to the Sign In tab to log in with your phone number.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleSignUp} className="space-y-4">
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700">
                      <strong>Note:</strong> You can only register if your doctor has already added your phone number to the system.
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Phone Number</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="tel"
                          className="h-12 pl-10 rounded-xl border-slate-200"
                          placeholder="03001234567"
                          value={phone}
                          onChange={e => setPhone(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Create Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="password"
                          className="h-12 pl-10 rounded-xl border-slate-200"
                          placeholder="Min 4 characters"
                          value={password}
                          onChange={e => setPassword(e.target.value)}
                          minLength={4}
                          required
                        />
                      </div>
                    </div>

                    {error && !showErrorAnimation && (
                      <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{error}</p>
                    )}

                    <Button
                      type="submit"
                      disabled={busy}
                      className="w-full h-12 rounded-xl shadow-lg shadow-teal-500/25 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white font-semibold text-base"
                    >
                      {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Create Account
                    </Button>
                  </form>
                )}
              </TabsContent>
            </Tabs>

            {/* Divider */}
            <div className="mt-6 pt-4 border-t text-center">
              <p className="text-xs text-muted-foreground">
                Are you a doctor?{' '}
                <Link to="/login" className="text-primary font-semibold hover:underline">
                  Doctor Login →
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
