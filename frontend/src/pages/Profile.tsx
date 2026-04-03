import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { userApi } from '../api/user.api';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Button } from '../components/ui/Button';
import { useAuth } from '../hooks/useAuth';

const profileSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  profilePhoto: z.string().url().optional().or(z.literal(''))
});

const verifyIdSchema = z.object({
  governmentIdType: z.enum(['aadhaar', 'pan', 'passport', 'dl']),
  governmentIdNumber: z.string().min(6)
});

export default function Profile() {
  const queryClient = useQueryClient();
  const { updateUser } = useAuth();

  const meQuery = useQuery({ queryKey: ['me'], queryFn: () => userApi.me().then((r) => r.data.data) });

  const profileForm = useForm<any>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: '', email: '', profilePhoto: '' }
  });

  const verifyForm = useForm<any>({
    resolver: zodResolver(verifyIdSchema),
    defaultValues: { governmentIdType: 'aadhaar', governmentIdNumber: '' }
  });

  useEffect(() => {
    if (meQuery.data) {
      profileForm.reset({
        name: meQuery.data.name || '',
        email: meQuery.data.email || '',
        profilePhoto: meQuery.data.profilePhoto || ''
      });
    }
  }, [meQuery.data]);

  const updateMutation = useMutation({
    mutationFn: (payload: any) => userApi.updateMe(payload),
    onSuccess: (response) => {
      toast.success('Profile updated');
      updateUser(response.data.data);
      queryClient.invalidateQueries({ queryKey: ['me'] });
    }
  });

  const verifyMutation = useMutation({
    mutationFn: (payload: any) => userApi.verifyId(payload),
    onSuccess: () => {
      toast.success('Government ID verified');
      queryClient.invalidateQueries({ queryKey: ['me'] });
      verifyForm.reset();
    }
  });

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="space-y-3">
        <h1 className="text-xl font-bold">Profile</h1>
        <form className="space-y-3" onSubmit={profileForm.handleSubmit((values) => updateMutation.mutate(values))}>
          <Input label="Name" {...profileForm.register('name')} error={profileForm.formState.errors.name?.message as string} />
          <Input label="Email" type="email" {...profileForm.register('email')} error={profileForm.formState.errors.email?.message as string} />
          <Input label="Profile Photo URL" {...profileForm.register('profilePhoto')} error={profileForm.formState.errors.profilePhoto?.message as string} />
          <Button type="submit">Save Profile</Button>
        </form>
      </Card>

      <Card className="space-y-3">
        <h2 className="text-xl font-bold">Verify Government ID</h2>
        <form className="space-y-3" onSubmit={verifyForm.handleSubmit((values) => verifyMutation.mutate(values))}>
          <Select label="ID Type" {...verifyForm.register('governmentIdType')}>
            <option value="aadhaar">Aadhaar</option>
            <option value="pan">PAN</option>
            <option value="passport">Passport</option>
            <option value="dl">Driving License</option>
          </Select>
          <Input label="ID Number" {...verifyForm.register('governmentIdNumber')} error={verifyForm.formState.errors.governmentIdNumber?.message as string} />
          <Button type="submit">Verify ID</Button>
        </form>
      </Card>
    </div>
  );
}
