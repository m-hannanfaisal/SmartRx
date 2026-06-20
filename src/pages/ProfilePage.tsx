import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { apiFetch } from '@/lib/api';
import type { Doctor } from '@/lib/types';
import { toast } from 'sonner';
import { Loader2, Save, User } from 'lucide-react';

export default function ProfilePage() {
  const { doctor, refreshDoctor } = useAuth();
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name:           doctor?.name           ?? '',
    clinic_name:    doctor?.clinic_name    ?? '',
    specialization: doctor?.specialization ?? '',
    phone:          doctor?.phone          ?? '',
  });

  const handleChange = (field: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm(prev => ({ ...prev, [field]: e.target.value }));

  const handleSave = async () => {
    if (!form.name || !form.clinic_name || !form.specialization) {
      toast.error('Name, clinic name, and specialization are required');
      return;
    }
    setSaving(true);
    try {
      await apiFetch<{ doctor: Doctor }>('/api/auth/profile', {
        method: 'PUT',
        json: form,
      });
      await refreshDoctor();
      toast.success('Profile updated successfully!');
    } catch (e: any) {
      toast.error(e.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <User className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Doctor Profile</h1>
          <p className="text-muted-foreground text-sm">Update your clinic and personal information</p>
        </div>
      </div>

      <Card className="card-shadow">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Personal Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Full Name *</Label>
              <Input
                value={form.name}
                onChange={handleChange('name')}
                placeholder="Dr. John Smith"
                className="h-11"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input
                value={form.phone}
                onChange={handleChange('phone')}
                placeholder="+92 300 0000000"
                className="h-11"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input
              value={doctor?.email ?? ''}
              disabled
              className="h-11 bg-muted/50 text-muted-foreground cursor-not-allowed"
            />
            <p className="text-[11px] text-muted-foreground">Email cannot be changed.</p>
          </div>
        </CardContent>
      </Card>

      <Card className="card-shadow">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Clinic Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Clinic Name *</Label>
              <Input
                value={form.clinic_name}
                onChange={handleChange('clinic_name')}
                placeholder="My Health Clinic"
                className="h-11"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Specialization *</Label>
              <Input
                value={form.specialization}
                onChange={handleChange('specialization')}
                placeholder="General Physician"
                className="h-11"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="gap-2 shadow-sm">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Changes
        </Button>
      </div>
    </div>
  );
}
