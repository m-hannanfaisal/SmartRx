import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { signIn, signUp } from '@/lib/store';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Activity, AlertCircle, Loader2 } from 'lucide-react';
import { FullScreenOverlay } from '@/components/ui/FullScreenOverlay';

export default function LoginPage() {
  const { token, loading, setAuth } = useAuth();
  const navigate = useNavigate();

  const [email,          setEmail]          = useState('');
  const [password,       setPassword]       = useState('');
  const [name,           setName]           = useState('');
  const [clinicName,     setClinicName]     = useState('');
  const [specialization, setSpecialization] = useState('General Physician');
  const [phone,          setPhone]          = useState('');
  const [error,          setError]          = useState('');
  const [busy,           setBusy]           = useState(false);
  const [signupSuccess,  setSignupSuccess]  = useState(false);
  const [showLoadingAnimation, setShowLoadingAnimation] = useState(false);
  const [showErrorAnimation, setShowErrorAnimation] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }
  if (token) return <Navigate to="/dashboard" replace />;

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      const { token: t, doctor } = await signIn(email, password);
      setAuth(t, doctor);
      setShowLoadingAnimation(true);
      setTimeout(() => {
        navigate('/dashboard', { replace: true });
      }, 2500);
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
      await signUp(email, password, name, clinicName, specialization, phone);
      setSignupSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Sign-up failed');
      setShowErrorAnimation(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative">
      <FullScreenOverlay 
        show={showLoadingAnimation} 
        type="loading" 
        message="Preparing Dashboard..." 
      />
      <FullScreenOverlay 
        show={showErrorAnimation} 
        type="error" 
        message={error} 
        onClose={() => setShowErrorAnimation(false)} 
      />
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="h-14 w-14 rounded-2xl medical-gradient flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Activity className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">SmartRx</h1>
          <p className="text-muted-foreground text-sm mt-1">Smart Digital Prescription System</p>
        </div>

        <Card className="card-shadow-lg border-0 shadow-xl">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-lg">Welcome</CardTitle>
            <CardDescription>Sign in or create a new account</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      className="h-11"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      className="h-11"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" disabled={busy} className="w-full h-11 shadow-sm">
                    {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Sign In
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                {signupSuccess ? (
                  <div className="text-center text-sm py-4">
                    <p className="font-medium text-success">Account created!</p>
                    <p className="text-muted-foreground mt-1">
                      Switch to the Sign In tab to log in.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleSignUp} className="space-y-3">
                    <div className="space-y-1.5">
                      <Label>Full Name</Label>
                      <Input
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="Dr. Jane Doe"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Clinic Name</Label>
                      <Input
                        value={clinicName}
                        onChange={e => setClinicName(e.target.value)}
                        placeholder="HealthFirst Clinic"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Specialization</Label>
                      <Input
                        value={specialization}
                        onChange={e => setSpecialization(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Phone Number</Label>
                      <Input
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        placeholder="03001234567"
                        maxLength={11}
                        minLength={11}
                        required
                        pattern="\d{11}"
                        title="Phone number must be exactly 11 digits"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Email</Label>
                      <Input
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Password</Label>
                      <Input
                        type="password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        minLength={6}
                        required
                      />
                    </div>
                    <Button type="submit" disabled={busy} className="w-full h-11 shadow-sm">
                      {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Create Account
                    </Button>
                  </form>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
