import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  AlertCircle,
  Award,
  BadgeCheck,
  Building2,
  CheckCircle2,
  CreditCard,
  FileCheck2,
  Fingerprint,
  Info,
  Lock,
  Luggage,
  MapPin,
  Plane,
  QrCode,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Train,
  Truck,
  UserCheck,
  Zap
} from 'lucide-react';
import clsx from 'clsx';
import { userApi } from '../api/user.api';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';

const AVAILABLE_MODES = [
  { id: 'train', label: 'Vande Bharat / IR Train', icon: Train, badge: 'High-Speed Rail' },
  { id: 'flight', label: 'Domestic Flight', icon: Plane, badge: 'Fastest Transit' },
  { id: 'car', label: 'Personal Car / Taxi', icon: Truck, badge: 'Door-to-Door' },
  { id: 'bus', label: 'Intercity AC Bus', icon: Building2, badge: 'Trunk Road' }
];

const AVAILABLE_CATEGORIES = [
  { id: 'documents', label: 'Legal & Office Documents', icon: '📄' },
  { id: 'electronics', label: 'Laptops, Phones & Gadgets', icon: '💻' },
  { id: 'clothing', label: 'Apparel & Personal Goods', icon: '👕' },
  { id: 'medicine', label: 'Urgent Non-Prescription Items', icon: '💊' },
  { id: 'gifts', label: 'Packaged Gifts & Samples', icon: '🎁' }
];

export default function CarrierSetup() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'aadhaar' | 'payout' | 'preferences' | 'id_card'>('aadhaar');

  // Aadhaar Form State
  const [aadhaarInput, setAadhaarInput] = useState('');
  const [aadhaarOtp, setAadhaarOtp] = useState('');
  const [otpStep, setOtpStep] = useState(false);

  // Payout Form State
  const [payoutMethod, setPayoutMethod] = useState<'upi' | 'bank'>('upi');
  const [upiId, setUpiId] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [holderName, setHolderName] = useState('');

  // Preferences Form State
  const [selectedModes, setSelectedModes] = useState<string[]>(['train', 'car']);
  const [maxWeight, setMaxWeight] = useState<number>(10);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([
    'documents',
    'electronics',
    'clothing'
  ]);
  const [bio, setBio] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');

  const { data: status, isLoading } = useQuery({
    queryKey: ['carrier-setup-status'],
    queryFn: async () => {
      const res = await userApi.getCarrierSetupStatus();
      const payload = res.data.data;
      if (payload.payout?.upiId) setUpiId(payload.payout.upiId);
      if (payload.preferences) {
        if (payload.preferences.preferredModes) setSelectedModes(payload.preferences.preferredModes);
        if (payload.preferences.maxCapacityKg) setMaxWeight(payload.preferences.maxCapacityKg);
        if (payload.preferences.allowedCategories) setSelectedCategories(payload.preferences.allowedCategories);
        if (payload.preferences.bio) setBio(payload.preferences.bio);
        if (payload.preferences.emergencyContact) setEmergencyContact(payload.preferences.emergencyContact);
      }
      return payload;
    }
  });

  const aadhaarMutation = useMutation({
    mutationFn: (payload: { aadhaarNumber: string; otp?: string }) =>
      userApi.verifyCarrierAadhaar(payload),
    onSuccess: (res: any) => {
      toast.success(res.data.message || 'Aadhaar Verified via DigiLocker!');
      setOtpStep(false);
      setAadhaarInput('');
      setAadhaarOtp('');
      queryClient.invalidateQueries({ queryKey: ['carrier-setup-status'] });
      setActiveTab('payout');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Verification failed. Check Aadhaar details.');
    }
  });

  const payoutMutation = useMutation({
    mutationFn: (payload: any) => userApi.saveCarrierPayout(payload),
    onSuccess: (res: any) => {
      toast.success(res.data.message || 'Payout method verified with Penny Drop test!');
      queryClient.invalidateQueries({ queryKey: ['carrier-setup-status'] });
      setActiveTab('preferences');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to verify payout method.');
    }
  });

  const prefMutation = useMutation({
    mutationFn: (payload: any) => userApi.saveCarrierPreferences(payload),
    onSuccess: (res: any) => {
      toast.success(res.data.message || 'Preferences updated!');
      queryClient.invalidateQueries({ queryKey: ['carrier-setup-status'] });
      setActiveTab('id_card');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update preferences.');
    }
  });

  const handleAadhaarSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpStep) {
      if (aadhaarInput.replace(/\s+/g, '').length !== 12) {
        toast.error('Please enter a valid 12-digit Aadhaar number');
        return;
      }
      setOtpStep(true);
      toast.success('DigiLocker OTP sent to registered mobile');
    } else {
      if (!aadhaarOtp || aadhaarOtp.length < 4) {
        toast.error('Please enter the 6-digit OTP');
        return;
      }
      aadhaarMutation.mutate({ aadhaarNumber: aadhaarInput, otp: aadhaarOtp });
    }
  };

  const handlePayoutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (payoutMethod === 'upi') {
      if (!upiId || !upiId.includes('@')) {
        toast.error('Please enter a valid UPI ID (e.g. name@okhdfcbank)');
        return;
      }
      payoutMutation.mutate({ method: 'upi', upiId });
    } else {
      if (!accountNumber || !ifsc) {
        toast.error('Account number and IFSC code are required');
        return;
      }
      payoutMutation.mutate({ method: 'bank', accountNumber, ifsc, holderName });
    }
  };

  const handlePrefSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    prefMutation.mutate({
      preferredModes: selectedModes,
      maxCapacityKg: maxWeight,
      allowedCategories: selectedCategories,
      instantBooking: true,
      bio,
      emergencyContact
    });
  };

  const toggleMode = (modeId: string) => {
    setSelectedModes((prev) =>
      prev.includes(modeId) ? prev.filter((m) => m !== modeId) : [...prev, modeId]
    );
  };

  const toggleCategory = (catId: string) => {
    setSelectedCategories((prev) =>
      prev.includes(catId) ? prev.filter((c) => c !== catId) : [...prev, catId]
    );
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-zinc-950 border-t-transparent" />
          <p className="text-sm font-medium text-zinc-600">Loading verification center...</p>
        </div>
      </div>
    );
  }

  const completion = status?.completionPercentage || 25;
  const isAadhaarDone = status?.aadhaar?.verified;
  const isPayoutDone = status?.payout?.configured;

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6">
      {/* ── TOP HEADER WITH PROGRESS METER ── */}
      <div className="overflow-hidden rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-xs">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-zinc-950 text-white shadow-2xs">
                <ShieldCheck className="h-4 w-4" />
              </span>
              <h1 className="text-xl font-extrabold tracking-tight text-zinc-950 sm:text-2xl">
                Carrier Onboarding & KYC Center
              </h1>
            </div>
            <p className="text-xs text-zinc-600 sm:text-sm">
              Complete your verification to unlock higher parcel carrying limits, instant ₹1 UPI payouts, and the Verified Indian Carrier badge.
            </p>
          </div>

          <div className="flex items-center gap-4 rounded-2xl border border-zinc-100 bg-zinc-50/80 p-4">
            <div className="text-right">
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Trust Level</p>
              <p className="text-sm font-extrabold text-zinc-950">
                {status?.kycTier === 'tier_3_pro'
                  ? '🌟 Pro Carrier (Unlocked)'
                  : status?.kycTier === 'tier_2_verified'
                  ? '🛡️ Verified Traveler'
                  : '🌱 Level 1 Basic'}
              </p>
              <p className="text-[11px] font-medium text-emerald-600">
                ₹{status?.tripLimitRupees?.toLocaleString('en-IN') || '1,000'} per trip limit
              </p>
            </div>

            <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-zinc-950 text-white shadow-md">
              <span className="text-sm font-black">{completion}%</span>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-6 space-y-2">
          <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 via-teal-500 to-zinc-900 transition-all duration-500"
              style={{ width: `${completion}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] font-medium text-zinc-500">
            <span>Basic Profile ({status?.phone ? '✓ Phone Linked' : 'Pending'})</span>
            <span>Government ID ({isAadhaarDone ? '✓ Verified' : 'Aadhaar Required'})</span>
            <span>Instant Payouts ({isPayoutDone ? '✓ UPI Active' : 'Setup Required'})</span>
          </div>
        </div>
      </div>

      {/* ── INTERACTIVE TABS ── */}
      <div className="flex gap-2 overflow-x-auto border-b border-zinc-200 pb-1">
        <button
          onClick={() => setActiveTab('aadhaar')}
          className={clsx(
            'flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all',
            activeTab === 'aadhaar'
              ? 'bg-zinc-950 text-white shadow-xs'
              : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950'
          )}
        >
          <Fingerprint className="h-4 w-4" />
          1. DigiLocker Aadhaar {isAadhaarDone && '✓'}
        </button>

        <button
          onClick={() => setActiveTab('payout')}
          className={clsx(
            'flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all',
            activeTab === 'payout'
              ? 'bg-zinc-950 text-white shadow-xs'
              : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950'
          )}
        >
          <CreditCard className="h-4 w-4" />
          2. Instant UPI / Bank {isPayoutDone && '✓'}
        </button>

        <button
          onClick={() => setActiveTab('preferences')}
          className={clsx(
            'flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all',
            activeTab === 'preferences'
              ? 'bg-zinc-950 text-white shadow-xs'
              : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950'
          )}
        >
          <Luggage className="h-4 w-4" />
          3. Travel Preferences
        </button>

        <button
          onClick={() => setActiveTab('id_card')}
          className={clsx(
            'flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all',
            activeTab === 'id_card'
              ? 'bg-zinc-950 text-white shadow-xs'
              : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950'
          )}
        >
          <BadgeCheck className="h-4 w-4" />
          4. Carrier ID Pass
        </button>
      </div>

      {/* ── TAB 1: AADHAAR VERIFICATION ── */}
      {activeTab === 'aadhaar' && (
        <Card className="space-y-6 p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-zinc-950">Aadhaar & DigiLocker Government ID</h2>
              <p className="text-xs text-zinc-600">
                We verify your identity via Government of India DigiLocker to protect senders and unlock higher carrying limits.
              </p>
            </div>
            {isAadhaarDone ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-bold text-emerald-700">
                <CheckCircle2 className="h-3.5 w-3.5" /> Verified ID
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-xs font-bold text-amber-700">
                <AlertCircle className="h-3.5 w-3.5" /> Pending Verification
              </span>
            )}
          </div>

          {isAadhaarDone ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-6 space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                    Government ID Verified
                  </p>
                  <p className="text-base font-extrabold text-zinc-950">
                    Aadhaar: <span className="font-mono">{status.aadhaar.masked}</span>
                  </p>
                </div>
              </div>
              <p className="text-xs text-emerald-900">
                Your DigiLocker ID is active. You are cleared to accept intercity parcels across trains, flights, and road routes.
              </p>
              <div className="pt-2">
                <Button size="sm" variant="ghost" onClick={() => setActiveTab('payout')}>
                  Proceed to Payout Setup →
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleAadhaarSubmit} className="space-y-4 max-w-lg">
              <div className="space-y-2">
                <label className="block text-xs font-bold text-zinc-700">
                  12-Digit Aadhaar Number
                </label>
                <div className="relative">
                  <input
                    type="text"
                    maxLength={14}
                    value={aadhaarInput}
                    onChange={(e) => {
                      const v = e.target.value.replace(/\D/g, '').slice(0, 12);
                      const formatted = v.replace(/(\d{4})(?=\d)/g, '$1 ');
                      setAadhaarInput(formatted);
                    }}
                    placeholder="5421 8932 4921"
                    disabled={otpStep}
                    className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-mono tracking-wider text-zinc-950 focus:border-zinc-950 focus:outline-none"
                  />
                  <Fingerprint className="absolute right-3.5 top-3 h-4 w-4 text-zinc-400" />
                </div>
                <p className="text-[11px] text-zinc-500">
                  🔒 We never store full Aadhaar numbers. Stored with AES-256 encrypted last-4 digest only.
                </p>
              </div>

              {otpStep && (
                <div className="space-y-2 rounded-2xl border border-blue-200 bg-blue-50/60 p-4 animate-in fade-in">
                  <label className="block text-xs font-bold text-blue-900">
                    Enter DigiLocker OTP sent to Aadhaar-linked Mobile
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={aadhaarOtp}
                    onChange={(e) => setAadhaarOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    className="w-full rounded-xl border border-blue-300 bg-white px-4 py-2.5 text-sm font-mono tracking-widest text-zinc-950 focus:border-blue-600 focus:outline-none"
                  />
                  <p className="text-[11px] text-blue-700">
                    Simulated mode: Enter any 6 digits (e.g. <span className="font-mono font-bold">123456</span>) to verify instantly.
                  </p>
                </div>
              )}

              <div className="flex gap-2">
                <Button type="submit" disabled={aadhaarMutation.isPending}>
                  {aadhaarMutation.isPending
                    ? 'Verifying...'
                    : otpStep
                    ? 'Verify OTP & Complete ID Check'
                    : 'Get DigiLocker OTP'}
                </Button>
                {otpStep && (
                  <Button variant="ghost" type="button" onClick={() => setOtpStep(false)}>
                    Change Number
                  </Button>
                )}
              </div>
            </form>
          )}
        </Card>
      )}

      {/* ── TAB 2: INSTANT PAYOUT METHOD ── */}
      {activeTab === 'payout' && (
        <Card className="space-y-6 p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-zinc-950">Instant Payout Account (UPI / Bank)</h2>
              <p className="text-xs text-zinc-600">
                Where should your delivery earnings and safety deposits be credited upon OTP verification?
              </p>
            </div>
            {isPayoutDone && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-bold text-emerald-700">
                <Zap className="h-3.5 w-3.5" /> Instant Payout Active
              </span>
            )}
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setPayoutMethod('upi')}
              className={clsx(
                'flex flex-1 items-center justify-center gap-2 rounded-2xl border p-4 text-xs font-bold transition-all',
                payoutMethod === 'upi'
                  ? 'border-zinc-950 bg-zinc-950 text-white shadow-xs'
                  : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300'
              )}
            >
              <QrCode className="h-4 w-4" /> UPI ID (Instant sub-10s credit)
            </button>
            <button
              type="button"
              onClick={() => setPayoutMethod('bank')}
              className={clsx(
                'flex flex-1 items-center justify-center gap-2 rounded-2xl border p-4 text-xs font-bold transition-all',
                payoutMethod === 'bank'
                  ? 'border-zinc-950 bg-zinc-950 text-white shadow-xs'
                  : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300'
              )}
            >
              <Building2 className="h-4 w-4" /> Bank Account (IMPS / NEFT)
            </button>
          </div>

          <form onSubmit={handlePayoutSubmit} className="space-y-4 max-w-lg">
            {payoutMethod === 'upi' ? (
              <div className="space-y-2">
                <label className="block text-xs font-bold text-zinc-700">
                  Virtual Payment Address (VPA / UPI ID)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    placeholder="arjun@okhdfcbank or 9876543210@paytm"
                    className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-950 focus:border-zinc-950 focus:outline-none"
                  />
                  <Zap className="absolute right-3.5 top-3 h-4 w-4 text-emerald-500" />
                </div>
                <p className="text-[11px] text-zinc-500">
                  Supported: Google Pay, PhonePe, Paytm, BHIM, and all Indian Bank VPAs.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-700">Account Holder Name</label>
                  <input
                    type="text"
                    value={holderName}
                    onChange={(e) => setHolderName(e.target.value)}
                    placeholder="As printed on bank passbook"
                    className="mt-1 w-full rounded-xl border border-zinc-300 px-4 py-2.5 text-sm text-zinc-950 focus:border-zinc-950 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-700">Bank Account Number</label>
                  <input
                    type="text"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    placeholder="91201004928192"
                    className="mt-1 w-full rounded-xl border border-zinc-300 px-4 py-2.5 text-sm font-mono text-zinc-950 focus:border-zinc-950 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-700">IFSC Code</label>
                  <input
                    type="text"
                    value={ifsc}
                    onChange={(e) => setIfsc(e.target.value.toUpperCase())}
                    placeholder="HDFC0001234"
                    className="mt-1 w-full rounded-xl border border-zinc-300 px-4 py-2.5 text-sm font-mono uppercase text-zinc-950 focus:border-zinc-950 focus:outline-none"
                  />
                </div>
              </div>
            )}

            <div className="rounded-xl bg-zinc-50 p-3 text-[11px] text-zinc-600 border border-zinc-200">
              ⚡ <strong>₹1 Penny-Drop Verification:</strong> We validate your account instantly. Zero deductions.
            </div>

            <Button type="submit" disabled={payoutMutation.isPending}>
              {payoutMutation.isPending ? 'Verifying Account...' : 'Save & Verify Payout Destination'}
            </Button>
          </form>
        </Card>
      )}

      {/* ── TAB 3: TRAVEL PREFERENCES ── */}
      {activeTab === 'preferences' && (
        <Card className="space-y-6 p-6">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-zinc-950">Carrier Route & Luggage Defaults</h2>
            <p className="text-xs text-zinc-600">
              Configure your preferred transport methods and parcel weight limits to receive tailored match requests.
            </p>
          </div>

          <form onSubmit={handlePrefSubmit} className="space-y-6">
            {/* Modes */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-zinc-700">
                Preferred Travel Modes
              </label>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {AVAILABLE_MODES.map((mode) => {
                  const Icon = mode.icon;
                  const isSelected = selectedModes.includes(mode.id);
                  return (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => toggleMode(mode.id)}
                      className={clsx(
                        'flex items-center justify-between rounded-2xl border p-4 text-left transition-all',
                        isSelected
                          ? 'border-zinc-950 bg-zinc-950 text-white shadow-xs'
                          : 'border-zinc-200 bg-white text-zinc-800 hover:border-zinc-300'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={clsx('flex h-8 w-8 items-center justify-center rounded-xl', isSelected ? 'bg-zinc-800' : 'bg-zinc-100')}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold">{mode.label}</p>
                          <p className={clsx('text-[10px]', isSelected ? 'text-zinc-400' : 'text-zinc-500')}>
                            {mode.badge}
                          </p>
                        </div>
                      </div>
                      <div className={clsx('h-4 w-4 rounded-full border flex items-center justify-center', isSelected ? 'bg-white text-zinc-950' : 'border-zinc-300')}>
                        {isSelected && '✓'}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Capacity Slider */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold text-zinc-700">
                <span>Maximum Parcel Capacity per Trip</span>
                <span className="text-emerald-700 font-extrabold">{maxWeight} kg</span>
              </div>
              <input
                type="range"
                min={1}
                max={25}
                value={maxWeight}
                onChange={(e) => setMaxWeight(Number(e.target.value))}
                className="w-full accent-zinc-950"
              />
              <div className="flex justify-between text-[10px] text-zinc-400 font-mono">
                <span>1 kg (Light bag)</span>
                <span>10 kg (Standard Cabin)</span>
                <span>25 kg (Full Trunk)</span>
              </div>
            </div>

            {/* Allowed Categories */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-zinc-700">
                Allowed Package Categories
              </label>
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_CATEGORIES.map((cat) => {
                  const isSelected = selectedCategories.includes(cat.id);
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => toggleCategory(cat.id)}
                      className={clsx(
                        'flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-bold transition-all',
                        isSelected
                          ? 'border-zinc-950 bg-zinc-950 text-white'
                          : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50'
                      )}
                    >
                      <span>{cat.icon}</span>
                      <span>{cat.label}</span>
                      {isSelected && <span className="ml-1 text-emerald-400">✓</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bio & Emergency Contact */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold text-zinc-700">Carrier Bio / Travel Notes</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="e.g. Regular commuter on Vande Bharat Bengaluru-Chennai every Friday. Prompt handoff."
                  rows={2}
                  className="mt-1 w-full rounded-xl border border-zinc-300 p-3 text-xs text-zinc-950 focus:border-zinc-950 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-700">Emergency Phone Number</label>
                <input
                  type="text"
                  value={emergencyContact}
                  onChange={(e) => setEmergencyContact(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="mt-1 w-full rounded-xl border border-zinc-300 px-3.5 py-2.5 text-xs text-zinc-950 focus:border-zinc-950 focus:outline-none"
                />
              </div>
            </div>

            <Button type="submit" disabled={prefMutation.isPending}>
              {prefMutation.isPending ? 'Saving...' : 'Save Travel Preferences'}
            </Button>
          </form>
        </Card>
      )}

      {/* ── TAB 4: VERIFIED CARRIER ID CARD PASS ── */}
      {activeTab === 'id_card' && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Physical ID Pass Visual */}
          <div className="relative overflow-hidden rounded-3xl border border-zinc-900 bg-gradient-to-br from-zinc-950 via-zinc-900 to-slate-950 p-6 text-white shadow-2xl">
            <div className="absolute top-0 right-0 h-40 w-40 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-400 text-zinc-950 font-black text-xs">
                  HD
                </span>
                <span className="text-sm font-extrabold tracking-wider uppercase text-zinc-300">
                  HopDrop Carrier ID Pass
                </span>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-950/80 border border-emerald-500/40 px-2.5 py-0.5 text-[10px] font-bold text-emerald-300">
                <ShieldCheck className="h-3 w-3 text-emerald-400" />
                {isAadhaarDone ? 'GOVT VERIFIED' : 'UNVERIFIED'}
              </span>
            </div>

            <div className="my-6 flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-800 border border-zinc-700 text-2xl font-bold text-zinc-300">
                {status?.name ? status.name[0].toUpperCase() : 'C'}
              </div>
              <div>
                <h3 className="text-lg font-black text-white">{status?.name || 'Carrier Traveler'}</h3>
                <p className="text-xs font-mono text-zinc-400">{status?.phone || '+91 98XXX XXXXX'}</p>
                <div className="mt-1 flex items-center gap-2">
                  <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[9px] font-bold text-zinc-300">
                    ★ {status?.rating?.average?.toFixed(1) || '5.0'} Rating
                  </span>
                  <span className="text-[10px] text-emerald-400 font-bold">
                    {status?.aadhaar?.masked || 'ID Pending'}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 border-t border-zinc-800 pt-4 text-xs">
              <div>
                <p className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold">Payout Destination</p>
                <p className="font-mono text-emerald-400 font-bold text-[11px] truncate">
                  {status?.payout?.upiId || (status?.payout?.bank ? `A/C ${status.payout.bank.accountNumberMasked}` : 'Not Configured')}
                </p>
              </div>
              <div>
                <p className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold">Escrow Guarantee</p>
                <p className="text-[11px] font-bold text-zinc-200">RBI ₹10 Serial Tamper Seal</p>
              </div>
            </div>
          </div>

          {/* Verification summary stats */}
          <div className="space-y-4">
            <Card className="space-y-3 p-6">
              <h3 className="text-sm font-bold text-zinc-950">Active Carrier Privileges</h3>
              <ul className="space-y-2.5 text-xs text-zinc-600">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className={clsx('h-4 w-4', isAadhaarDone ? 'text-emerald-600' : 'text-zinc-300')} />
                  <span>Intercity Railway & Flight Corridor Matching</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className={clsx('h-4 w-4', isPayoutDone ? 'text-emerald-600' : 'text-zinc-300')} />
                  <span>Instant UPI Handoff Settlement upon OTP Verification</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>Zero Commission on First 3 Weekly Deliveries (De-escalation Curve)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>₹10,000 Transit Protection & Arbitrated Dispute Support</span>
                </li>
              </ul>
            </Card>

            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-center">
              <p className="text-xs text-zinc-600 mb-2">Ready to post an intercity travel route?</p>
              <a href="/carrier/post-trip">
                <Button className="w-full">Post an Intercity Trip Now →</Button>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
