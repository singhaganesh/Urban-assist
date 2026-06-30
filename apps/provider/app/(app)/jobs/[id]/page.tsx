'use client';
import * as React from 'react';
import { Card, Badge, Button, Field, RatingInput, EmptyState, Input } from '@urban-assist/ui';
import { pence, ukDateTime, getBookingOtp } from '@urban-assist/lib';
import { getSupabaseBrowser as supabase } from '@urban-assist/db/browser';
import { Phone, MessageSquare, MapPin, Play, CheckCircle2, Clock, Camera, Star } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';

export default function JobDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const [loading, setLoading] = React.useState(true);
  const [booking, setBooking] = React.useState<any>(null);
  const [payment, setPayment] = React.useState<any>(null);
  const [messages, setMessages] = React.useState<any[]>([]);
  const [draft, setDraft] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [elapsed, setElapsed] = React.useState(0);

  // Completion states
  const [notes, setNotes] = React.useState('');
  const [file, setFile] = React.useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = React.useState<string | null>(null);

  // Review states
  const [rating, setRating] = React.useState(0);
  const [reviewComment, setReviewComment] = React.useState('');
  const [reviewed, setReviewed] = React.useState(false);

  // OTP states
  const [enteredOtp, setEnteredOtp] = React.useState('');
  const [otpError, setOtpError] = React.useState<string | null>(null);

  React.useEffect(() => {
    async function loadData() {
      try {
        const sb = supabase();
        const { data: b, error: bErr } = await sb
          .from('bookings')
          .select('*, category:service_categories(name,slug), address:addresses(*), customer:profiles!bookings_customer_id_fkey(id,full_name,phone,avatar_url)')
          .eq('id', id)
          .single();

        if (bErr || !b) {
          router.replace('/');
          return;
        }

        const { data: p } = await sb
          .from('payments')
          .select('*')
          .eq('booking_id', id)
          .single();

        setBooking(b);
        setPayment(p);

        // Fetch messages
        const { data: msgData } = await sb
          .from('messages')
          .select('*')
          .eq('booking_id', id)
          .order('created_at');
        setMessages(msgData ?? []);

        // Check if already reviewed customer
        const { data: reviewData } = await sb
          .from('reviews')
          .select('id')
          .eq('booking_id', id)
          .eq('direction', 'provider_to_customer')
          .maybeSingle();

        if (reviewData) setReviewed(true);
      } catch (err) {
        console.error('Failed to load job data', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id, router]);

  // Realtime subscription
  React.useEffect(() => {
    if (!booking) return;
    const sb = supabase();
    const ch = sb
      .channel(`job-${booking.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'bookings', filter: `id=eq.${booking.id}` },
        (p) => setBooking((cur: any) => ({ ...cur, ...p.new })),
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `booking_id=eq.${booking.id}` },
        (p) => setMessages((m) => [...m, p.new]),
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'payments', filter: `booking_id=eq.${booking.id}` },
        (p) => setPayment((cur: any) => ({ ...cur, ...p.new })),
      )
      .subscribe();

    return () => {
      sb.removeChannel(ch);
    };
  }, [booking]);

  // Timer for job in-progress state
  React.useEffect(() => {
    if (booking?.status !== 'in_progress' || !booking.started_at) return;
    const start = new Date(booking.started_at).getTime();
    const t = setInterval(() => {
      setElapsed(Math.max(0, Math.floor((Date.now() - start) / 1000)));
    }, 1000);
    return () => clearInterval(t);
  }, [booking?.status, booking?.started_at]);

  async function updateStatus(nextStatus: 'on_the_way' | 'arrived' | 'in_progress' | 'completed' | 'cancelled') {
    setBusy(true);
    try {
      const res = await fetch(`/api/jobs/${id}/status`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) throw new Error('Status update failed');
      const data = await res.json();
      setBooking((cur: any) => ({ ...cur, ...data }));
    } catch (e: any) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function confirmCash() {
    setBusy(true);
    try {
      const res = await fetch('/api/cash-confirm', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ booking_id: id }),
      });
      if (!res.ok) throw new Error('Failed to confirm cash collection');
      setPayment((cur: any) => ({ ...cur, status: 'succeeded' }));
    } catch (e: any) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function uploadCompletion(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setUploadProgress('Uploading completion report…');
    try {
      const sb = supabase();
      const { data: { user } } = await sb.auth.getUser();
      if (!user) throw new Error('Not logged in');

      let storagePath = null;
      if (file) {
        const path = `${user.id}/completions/${booking.id}-${Date.now()}-${file.name}`;
        const { error: upErr } = await sb.storage.from('completion').upload(path, file, {
          upsert: false,
          contentType: file.type,
        });
        if (upErr) throw upErr;
        storagePath = path;
      }

      // Update completion report notes and file path
      const { error: updateErr } = await sb
        .from('bookings')
        .update({
          completion_report: JSON.stringify({
            notes: notes.trim(),
            storage_path: storagePath,
          }),
        })
        .eq('id', booking.id);

      if (updateErr) throw updateErr;

      // Transition to completed status
      await updateStatus('completed');
      setUploadProgress(null);
    } catch (err: any) {
      alert(err.message);
      setUploadProgress(null);
    } finally {
      setBusy(false);
    }
  }

  async function submitCustomerReview() {
    setBusy(true);
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ booking_id: id, rating, comment: reviewComment || null }),
      });
      if (!res.ok) throw new Error('Could not submit review');
      setReviewed(true);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function sendChatMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim()) return;
    const body = draft;
    setDraft('');
    await fetch('/api/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ booking_id: id, content: body }),
    });
  }

  if (loading) {
    return (
      <div className="space-y-4 py-8 animate-pulse">
        <div className="h-8 w-48 bg-hairline rounded" />
        <div className="h-48 bg-hairline rounded-xl" />
      </div>
    );
  }

  const formatTimer = (s: number) => {
    const hrs = Math.floor(s / 3600);
    const mins = Math.floor((s % 3600) / 60);
    const secs = s % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const hasPhotos = booking.completion_report ? JSON.parse(booking.completion_report).storage_path : null;

  return (
    <div className="space-y-4 py-2">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl">{booking.category?.name}</h1>
          <p className="font-mono-utility text-muted">#{booking.short_code}</p>
        </div>
        <Badge tone={booking.status === 'completed' ? 'success' : 'accent'}>
          {booking.status.replace(/_/g, ' ')}
        </Badge>
      </header>

      {/* Navigation & Address Card */}
      <Card className="space-y-3">
        <div className="text-xs font-mono-utility text-muted flex items-center gap-1">
          <MapPin className="h-3.5 w-3.5" /> Customer Location
        </div>
        <div>
          <div className="font-medium text-sm sm:text-base">
            {booking.customer?.full_name}
          </div>
          <p className="text-sm text-muted mt-1">
            {[booking.address?.line1, booking.address?.line2, booking.address?.city, booking.address?.postcode]
              .filter(Boolean)
              .join(', ')}
          </p>
        </div>
        {booking.status !== 'completed' && booking.status !== 'cancelled' && (
          <Button
            variant="outline"
            className="w-full text-xs"
            onClick={() =>
              window.open(
                `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
                  [booking.address?.line1, booking.address?.city, booking.address?.postcode].filter(Boolean).join(', ')
                )}`,
                '_blank'
              )
            }
          >
            Navigate (Google Maps)
          </Button>
        )}
      </Card>

      {/* Timer / Status Progression Actions */}
      {booking.status !== 'completed' && booking.status !== 'cancelled' && (
        <Card className="space-y-3">
          <div className="text-xs font-mono-utility text-muted">Job Control</div>
          
          {booking.status === 'in_progress' && (
            <div className="flex flex-col items-center justify-center py-4 bg-accent/5 rounded-xl border border-accent/15">
              <span className="font-mono-utility text-xs text-muted flex items-center gap-1">
                <Clock className="h-3 w-3 animate-pulse text-accent" /> In Progress Timer
              </span>
              <span className="font-display text-3xl font-bold mt-1 text-ink">{formatTimer(elapsed)}</span>
            </div>
          )}

          <div className="flex gap-2">
            {booking.status === 'assigned' && (
              <Button size="block" disabled={busy} onClick={() => updateStatus('on_the_way')}>
                Start En Route
              </Button>
            )}
            {booking.status === 'on_the_way' && (
              <Button size="block" disabled={busy} onClick={() => updateStatus('arrived')}>
                Mark Arrived
              </Button>
            )}
            {booking.status === 'arrived' && (
              <div className="w-full space-y-3">
                <Field label="Enter 4-Digit Customer Verification Code">
                  <Input
                    type="text"
                    maxLength={4}
                    placeholder="e.g. 1234"
                    value={enteredOtp}
                    onChange={(e) => {
                      setEnteredOtp(e.target.value.replace(/\D/g, ''));
                      setOtpError(null);
                    }}
                    className="text-center font-display text-lg tracking-widest"
                  />
                </Field>
                {otpError && <p className="text-xs text-danger">{otpError}</p>}
                <Button
                  size="block"
                  disabled={busy || enteredOtp.length !== 4}
                  onClick={() => {
                    const correctOtp = getBookingOtp(booking.id);
                    if (enteredOtp === correctOtp) {
                      updateStatus('in_progress');
                    } else {
                      setOtpError('Incorrect verification code. Please ask the customer for the code displayed on their screen.');
                    }
                  }}
                >
                  <Play className="mr-1.5 h-4 w-4" /> Verify and Start Job
                </Button>
              </div>
            )}
          </div>

          {/* Complete Job report uploader */}
          {booking.status === 'in_progress' && (
            <form onSubmit={uploadCompletion} className="space-y-3 border-t border-hairline pt-3 mt-2">
              <Field label="Job completion notes">
                <textarea
                  rows={2}
                  className="w-full rounded-xl border border-hairline bg-white px-3 py-2 text-sm focus:border-ink focus:outline-none"
                  placeholder="Summarize the work done, e.g. fixed leaks, checked pipes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  required
                />
              </Field>
              <Field label="Completion photo (optional)">
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                    className="hidden"
                    id="completion-file"
                  />
                  <label
                    htmlFor="completion-file"
                    className="tap cursor-pointer inline-flex items-center gap-1.5 rounded-xl border border-hairline bg-white px-4 py-2 text-xs font-medium hover:bg-bg transition"
                  >
                    <Camera className="h-4 w-4 text-muted" /> {file ? 'Change Photo' : 'Add Photo'}
                  </label>
                  {file && <span className="text-xs text-muted truncate max-w-xs">{file.name}</span>}
                </div>
              </Field>
              {uploadProgress && <p className="text-xs text-accent">{uploadProgress}</p>}
              <Button size="block" type="submit" disabled={busy}>
                <CheckCircle2 className="mr-1.5 h-4 w-4" /> Complete and Submit Job
              </Button>
            </form>
          )}
        </Card>
      )}

      {/* Payment details and actions */}
      <Card className="space-y-2">
        <div className="text-xs font-mono-utility text-muted">Payment Summary</div>
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium">Customer Pays:</span>
          <span className="font-display text-lg font-bold">{pence(booking.total_pence)}</span>
        </div>
        <div className="text-xs text-muted">
          Method: {booking.payment_method === 'card' ? 'Card' : 'Cash'} ·{' '}
          <span className={payment?.status === 'succeeded' ? 'text-success' : 'text-accent'}>
            {payment?.status ?? 'pending'}
          </span>
        </div>
        {booking.payment_method === 'cash' && booking.status === 'completed' && payment?.status !== 'succeeded' && (
          <Button onClick={confirmCash} disabled={busy} className="w-full mt-2 text-xs">
            Confirm Cash Collected
          </Button>
        )}
      </Card>

      {/* Completion Report (for Completed bookings) */}
      {booking.status === 'completed' && booking.completion_report && (
        <Card className="space-y-2">
          <div className="text-xs font-mono-utility text-muted">Completion Report</div>
          <p className="text-sm text-ink">{JSON.parse(booking.completion_report).notes}</p>
          {hasPhotos && (
            <div className="mt-2 rounded-xl overflow-hidden max-w-xs border border-hairline">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`${supabase().storage.from('completion').getPublicUrl(JSON.parse(booking.completion_report).storage_path).data.publicUrl}`}
                alt="Job completion visual"
                className="w-full object-cover"
              />
            </div>
          )}
        </Card>
      )}

      {/* Chat Component */}
      <Card className="space-y-3">
        <div className="text-xs font-mono-utility text-muted flex items-center gap-1">
          <MessageSquare className="h-3.5 w-3.5" /> Chat with Customer
        </div>
        <ul className="max-h-60 space-y-1.5 overflow-y-auto text-sm bg-bg/30 p-2 rounded-xl border border-hairline">
          {messages.length === 0 && (
            <li className="text-muted text-center py-4 text-xs">
              No messages. Send a message to start communicating en route.
            </li>
          )}
          {messages.map((m) => {
            const isSelf = m.sender_id === booking.provider_id;
            return (
              <li
                key={m.id}
                className={`flex flex-col max-w-[80%] rounded-xl px-3 py-2 ${
                  isSelf ? 'bg-ink text-bg ml-auto' : 'bg-bg text-ink mr-auto'
                }`}
              >
                <span>{m.content}</span>
                <span className="text-[8px] text-muted self-end mt-0.5">
                  {new Date(m.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </li>
            );
          })}
        </ul>
        {booking.status !== 'completed' && booking.status !== 'cancelled' && (
          <form onSubmit={sendChatMessage} className="flex gap-2">
            <input
              className="tap flex-1 rounded-xl border border-hairline bg-white px-3 py-2 text-sm focus:border-ink focus:outline-none"
              placeholder="Message customer..."
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
            />
            <Button type="submit" disabled={!draft.trim()}>
              Send
            </Button>
          </form>
        )}
      </Card>

      {/* Two-way Rating: Rate the Customer */}
      {booking.status === 'completed' && !reviewed && (
        <Card className="space-y-3">
          <div className="text-xs font-mono-utility text-muted flex items-center gap-1">
            <Star className="h-3.5 w-3.5 text-accent" /> Rate customer
          </div>
          <p className="text-xs text-muted">Help other providers by rating your customer.</p>
          <RatingInput value={rating} onChange={setRating} />
          <Field label="Comment (optional)">
            <textarea
              rows={2}
              className="w-full rounded-xl border border-hairline bg-white px-3 py-2 text-sm focus:border-ink focus:outline-none"
              placeholder="Describe your experience working with this customer..."
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
            />
          </Field>
          <Button onClick={submitCustomerReview} disabled={rating === 0 || busy} size="block">
            Submit Rating
          </Button>
        </Card>
      )}

      {booking.status === 'completed' && reviewed && (
        <EmptyState title="Customer reviewed" description="You have submitted your rating for this customer." />
      )}
    </div>
  );
}
