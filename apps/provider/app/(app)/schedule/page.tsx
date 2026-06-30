'use client';
import * as React from 'react';
import { Card, Button, Badge, Field, Input, EmptyState } from '@urban-assist/ui';
import { getSupabaseBrowser as supabase } from '@urban-assist/db/browser';
import { ukDate, ukDateTime } from '@urban-assist/lib';
import { Calendar, Clock, Coffee, ShieldAlert, Plus, Trash2 } from 'lucide-react';

const WEEKDAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

interface AvailabilitySlot {
  id: string;
  weekday: number;
  start_time: string;
  end_time: string;
}

interface TimeOff {
  id: string;
  start_date: string;
  end_date: string;
}

interface UpcomingJob {
  id: string;
  short_code: string;
  scheduled_at: string;
  status: string;
  price_pence: number;
  total_pence: number;
  category: { name: string };
  address: { line1: string; postcode: string };
}

export default function SchedulePage() {
  const [tab, setTab] = React.useState<'jobs' | 'hours' | 'timeoff'>('jobs');
  const [loading, setLoading] = React.useState(true);
  const [userId, setUserId] = React.useState<string | null>(null);

  // Data states
  const [jobs, setJobs] = React.useState<UpcomingJob[]>([]);
  const [slots, setSlots] = React.useState<AvailabilitySlot[]>([]);
  const [timeOffList, setTimeOffList] = React.useState<TimeOff[]>([]);

  // Form states for Availability
  const [newWeekday, setNewWeekday] = React.useState('1'); // Monday default
  const [newStart, setNewStart] = React.useState('09:00');
  const [newEnd, setNewEnd] = React.useState('17:00');
  const [slotsError, setSlotsError] = React.useState<string | null>(null);

  // Form states for Time Off
  const [newStartOff, setNewStartOff] = React.useState('');
  const [newEndOff, setNewEndOff] = React.useState('');
  const [timeOffError, setTimeOffError] = React.useState<string | null>(null);

  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    async function loadData() {
      try {
        const sb = supabase();
        const { data: { user } } = await sb.auth.getUser();
        if (!user) return;
        setUserId(user.id);

        // Fetch jobs (today and future)
        const todayStr = new Date();
        todayStr.setHours(0, 0, 0, 0);

        const { data: jobsData } = await sb
          .from('bookings')
          .select('id, short_code, scheduled_at, status, price_pence, total_pence, category:service_categories(name), address:addresses(line1,postcode)')
          .eq('provider_id', user.id)
          .gte('scheduled_at', todayStr.toISOString())
          .in('status', ['assigned', 'on_the_way', 'arrived', 'in_progress'])
          .order('scheduled_at');

        // Fetch availability slots
        const { data: slotsData } = await sb
          .from('availability_slots')
          .select('*')
          .eq('provider_id', user.id)
          .order('weekday')
          .order('start_time');

        // Fetch time off
        const { data: timeOffData } = await sb
          .from('time_off')
          .select('*')
          .eq('provider_id', user.id)
          .gte('end_date', todayStr.toISOString().split('T')[0])
          .order('start_date');

        setJobs(jobsData as any ?? []);
        setSlots(slotsData ?? []);
        setTimeOffList(timeOffData ?? []);
      } catch (err) {
        console.error('Failed to load schedule data', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  async function addSlot(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    setSlotsError(null);
    setSubmitting(true);

    try {
      const weekdayInt = parseInt(newWeekday);
      if (newStart >= newEnd) {
        throw new Error('Start time must be before end time');
      }

      // Check overlap
      const overlap = slots.some(
        (s) =>
          s.weekday === weekdayInt &&
          ((newStart >= s.start_time && newStart < s.end_time) ||
            (newEnd > s.start_time && newEnd <= s.end_time) ||
            (newStart <= s.start_time && newEnd >= s.end_time))
      );

      if (overlap) {
        throw new Error('This time slot overlaps with an existing slot');
      }

      const sb = supabase();
      const { data, error } = await sb
        .from('availability_slots')
        .insert({
          provider_id: userId,
          weekday: weekdayInt,
          start_time: newStart + ':00',
          end_time: newEnd + ':00',
        })
        .select()
        .single();

      if (error) throw error;
      setSlots([...slots, data].sort((a, b) => a.weekday - b.weekday || a.start_time.localeCompare(b.start_time)));
    } catch (err: any) {
      setSlotsError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteSlot(id: string) {
    try {
      const sb = supabase();
      const { error } = await sb.from('availability_slots').delete().eq('id', id);
      if (error) throw error;
      setSlots(slots.filter((s) => s.id !== id));
    } catch (err: any) {
      alert(err.message);
    }
  }

  async function addTimeOff(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    setTimeOffError(null);
    setSubmitting(true);

    try {
      if (!newStartOff || !newEndOff) {
        throw new Error('Select both start and end dates');
      }
      if (newStartOff > newEndOff) {
        throw new Error('Start date must be on or before end date');
      }

      const sb = supabase();
      const { data, error } = await sb
        .from('time_off')
        .insert({
          provider_id: userId,
          start_date: newStartOff,
          end_date: newEndOff,
        })
        .select()
        .single();

      if (error) throw error;
      setTimeOffList([...timeOffList, data].sort((a, b) => a.start_date.localeCompare(b.start_date)));
      setNewStartOff('');
      setNewEndOff('');
    } catch (err: any) {
      setTimeOffError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteTimeOff(id: string) {
    try {
      const sb = supabase();
      const { error } = await sb.from('time_off').delete().eq('id', id);
      if (error) throw error;
      setTimeOffList(timeOffList.filter((t) => t.id !== id));
    } catch (err: any) {
      alert(err.message);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 py-8 animate-pulse">
        <div className="h-8 w-48 bg-hairline rounded" />
        <div className="h-12 bg-hairline rounded-xl" />
        <div className="h-64 bg-hairline rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-5 py-2">
      <header>
        <p className="font-mono-utility text-muted">Management</p>
        <h1 className="font-display text-xl">Schedule</h1>
      </header>

      {/* Tabs selector */}
      <div className="flex gap-2 rounded-xl bg-bg p-1 border border-hairline">
        <button
          onClick={() => setTab('jobs')}
          className={`flex-1 rounded-lg py-2.5 text-xs font-mono-utility font-medium transition flex items-center justify-center gap-1.5 ${
            tab === 'jobs' ? 'bg-white text-ink shadow-sm' : 'text-muted hover:text-ink'
          }`}
        >
          <Calendar className="h-3.5 w-3.5" /> Agenda ({jobs.length})
        </button>
        <button
          onClick={() => setTab('hours')}
          className={`flex-1 rounded-lg py-2.5 text-xs font-mono-utility font-medium transition flex items-center justify-center gap-1.5 ${
            tab === 'hours' ? 'bg-white text-ink shadow-sm' : 'text-muted hover:text-ink'
          }`}
        >
          <Clock className="h-3.5 w-3.5" /> Working Hours
        </button>
        <button
          onClick={() => setTab('timeoff')}
          className={`flex-1 rounded-lg py-2.5 text-xs font-mono-utility font-medium transition flex items-center justify-center gap-1.5 ${
            tab === 'timeoff' ? 'bg-white text-ink shadow-sm' : 'text-muted hover:text-ink'
          }`}
        >
          <Coffee className="h-3.5 w-3.5" /> Time Off
        </button>
      </div>

      {/* Agenda/Upcoming Jobs */}
      {tab === 'jobs' && (
        <section className="space-y-3">
          {!jobs.length ? (
            <EmptyState
              title="No upcoming jobs"
              description="Your upcoming assigned bookings will be listed here. Go online on the dashboard to accept new offers."
            />
          ) : (
            <ul className="space-y-2.5">
              {jobs.map((j) => (
                <li key={j.id}>
                  <Card
                    onClick={() => window.location.href = `/jobs/${j.id}`}
                    className="flex items-center justify-between gap-4 cursor-pointer hover:border-ink transition"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm sm:text-base">
                          {j.category?.name}
                        </span>
                        <Badge tone="accent">
                          {j.status.replace(/_/g, ' ')}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted mt-1">
                        {ukDateTime(j.scheduled_at)} · {[j.address?.line1, j.address?.postcode].filter(Boolean).join(', ')}
                      </p>
                      <p className="font-mono-utility text-muted mt-0.5">#{j.short_code}</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={(e) => {
                      e.stopPropagation();
                      window.location.href = `/jobs/${j.id}`;
                    }}>
                      Open
                    </Button>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* Working Hours/Availability */}
      {tab === 'hours' && (
        <section className="space-y-4">
          <Card className="space-y-3">
            <h3 className="font-display text-sm font-semibold">Weekly Availability</h3>
            <p className="text-xs text-muted">
              Add the days and hours you are available to fulfill bookings. Our matching engine uses these slots to rank candidates.
            </p>
            {slots.length > 0 ? (
              <ul className="space-y-2 divide-y divide-hairline">
                {slots.map((s) => (
                  <li key={s.id} className="flex items-center justify-between pt-2 first:pt-0">
                    <div className="flex items-center gap-3">
                      <Badge tone="ink" className="min-w-20 text-center justify-center">
                        {WEEKDAYS[s.weekday]}
                      </Badge>
                      <span className="text-sm font-medium">
                        {s.start_time.slice(0, 5)} - {s.end_time.slice(0, 5)}
                      </span>
                    </div>
                    <button
                      onClick={() => deleteSlot(s.id)}
                      className="tap p-1 text-danger hover:brightness-95"
                      aria-label="Delete slot"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">No availability hours set up yet.</p>
            )}
          </Card>

          <Card>
            <form onSubmit={addSlot} className="space-y-3">
              <h4 className="font-display text-xs font-semibold">Add a regular working slot</h4>
              <div className="grid grid-cols-3 gap-2">
                <Field label="Weekday">
                  <select
                    value={newWeekday}
                    onChange={(e) => setNewWeekday(e.target.value)}
                    className="tap w-full rounded-xl border border-hairline bg-white px-3 py-2 text-sm focus:border-ink focus:outline-none"
                  >
                    {WEEKDAYS.map((w, idx) => (
                      <option key={w} value={idx}>
                        {w}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Start time">
                  <Input
                    type="time"
                    required
                    value={newStart}
                    onChange={(e) => setNewStart(e.target.value)}
                  />
                </Field>
                <Field label="End time">
                  <Input
                    type="time"
                    required
                    value={newEnd}
                    onChange={(e) => setNewEnd(e.target.value)}
                  />
                </Field>
              </div>
              {slotsError && <p className="text-xs text-danger">{slotsError}</p>}
              <Button type="submit" disabled={submitting} className="w-full flex items-center justify-center gap-1">
                <Plus className="h-4 w-4" /> Add Slot
              </Button>
            </form>
          </Card>
        </section>
      )}

      {/* Time Off */}
      {tab === 'timeoff' && (
        <section className="space-y-4">
          <Card className="space-y-3">
            <h3 className="font-display text-sm font-semibold flex items-center gap-2">
              <Coffee className="h-4 w-4 text-muted" /> Scheduled Time Off
            </h3>
            <p className="text-xs text-muted">
              Add dates when you want to block out work. The matching engine will not send you offers during these dates.
            </p>
            {timeOffList.length > 0 ? (
              <ul className="space-y-2 divide-y divide-hairline">
                {timeOffList.map((t) => (
                  <li key={t.id} className="flex items-center justify-between pt-2 first:pt-0">
                    <span className="text-sm font-medium">
                      {ukDate(t.start_date)}
                      {t.start_date !== t.end_date && ` to ${ukDate(t.end_date)}`}
                    </span>
                    <button
                      onClick={() => deleteTimeOff(t.id)}
                      className="tap p-1 text-danger hover:brightness-95"
                      aria-label="Delete time off"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">No scheduled time off.</p>
            )}
          </Card>

          <Card>
            <form onSubmit={addTimeOff} className="space-y-3">
              <h4 className="font-display text-xs font-semibold">Block out calendar dates</h4>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Start date">
                  <Input
                    type="date"
                    required
                    value={newStartOff}
                    onChange={(e) => setNewStartOff(e.target.value)}
                  />
                </Field>
                <Field label="End date">
                  <Input
                    type="date"
                    required
                    value={newEndOff}
                    onChange={(e) => setNewEndOff(e.target.value)}
                  />
                </Field>
              </div>
              {timeOffError && <p className="text-xs text-danger">{timeOffError}</p>}
              <Button type="submit" disabled={submitting} className="w-full flex items-center justify-center gap-1">
                <Plus className="h-4 w-4" /> Block Out Dates
              </Button>
            </form>
          </Card>
        </section>
      )}
    </div>
  );
}

