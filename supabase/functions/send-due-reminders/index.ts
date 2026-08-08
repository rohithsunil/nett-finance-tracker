// @ts-nocheck
import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')!;
const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')!;
const vapidSubject = Deno.env.get('VAPID_SUBJECT') || 'mailto:rohith.instantpay@gmail.com';
const supabase = createClient(supabaseUrl, serviceRoleKey);

webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

function isoDate(daysFromNow: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + daysFromNow);
  return date.toISOString().slice(0, 10);
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const today = isoDate(0);
  const horizon = isoDate(7);
  const { data: commitments, error: commitmentError } = await supabase
    .from('commitments')
    .select('id,user_id,name,amount,currency,due_date')
    .eq('status', 'open')
    .eq('importance', 'mandatory')
    .gte('due_date', today)
    .lte('due_date', horizon);
  if (commitmentError) return Response.json({ error: commitmentError.message }, { status: 500 });

  const byUser = new Map<string, { name: string; amount: number; currency: string; dueDate: string }>();
  for (const item of commitments || []) {
    if (!byUser.has(item.user_id)) byUser.set(item.user_id, { name: item.name, amount: Number(item.amount), currency: item.currency, dueDate: item.due_date });
  }

  let sent = 0;
  let removed = 0;
  for (const [userId, reminder] of byUser) {
    const { data: preferences } = await supabase.from('notification_preferences').select('due_dates').eq('user_id', userId).maybeSingle();
    if (preferences?.due_dates === false) continue;
    const { data: subscriptions } = await supabase.from('notification_subscriptions').select('id,subscription').eq('user_id', userId);
    for (const subscription of subscriptions || []) {
      try {
        await webpush.sendNotification(subscription.subscription, JSON.stringify({ title: 'Nett · coming up', body: `${reminder.name} is due ${reminder.dueDate}. ${reminder.currency} ${reminder.amount.toLocaleString()} is already in your picture.`, tag: `commitment-${reminder.name}`, url: '/?tab=plan' }));
        sent += 1;
      } catch (error) {
        const statusCode = (error as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) { await supabase.from('notification_subscriptions').delete().eq('id', subscription.id); removed += 1; }
      }
    }
  }
  return Response.json({ ok: true, users: byUser.size, sent, removed });
});
