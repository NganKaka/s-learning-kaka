import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

/**
 * Subscribe to real-time messages for a conversation.
 */
export function useRealtimeMessages(userId: string, otherId: string, onNew: (msg: { id: string; sender_id: string; content: string; created_at: string }) => void) {
  useEffect(() => {
    const channel = supabase.channel(`messages:${[userId, otherId].sort().join('-')}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `recipient_id=eq.${userId}` }, (payload) => {
        const msg = payload.new as { id: string; sender_id: string; recipient_id: string; content: string; created_at: string };
        if (msg.sender_id === otherId) onNew(msg);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId, otherId, onNew]);
}

/**
 * Live quiz session: subscribe to session status changes.
 */
export function useLiveQuizSession(sessionId: string, onUpdate: (status: string) => void) {
  useEffect(() => {
    if (!sessionId) return;
    const channel = supabase.channel(`live-quiz:${sessionId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'live_quiz_sessions', filter: `id=eq.${sessionId}` }, (payload) => {
        onUpdate((payload.new as { status: string }).status);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [sessionId, onUpdate]);
}

/**
 * Presence: track online users in a course.
 */
export function usePresence(courseId: string, userId: string): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!courseId || !userId) return;
    const channel = supabase.channel(`presence:${courseId}`, { config: { presence: { key: userId } } });
    channel
      .on('presence', { event: 'sync' }, () => {
        setCount(Object.keys(channel.presenceState()).length);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') await channel.track({ user_id: userId, online_at: new Date().toISOString() });
      });
    return () => { supabase.removeChannel(channel); };
  }, [courseId, userId]);

  return count;
}

/**
 * Start a live quiz session (teacher).
 */
export async function startLiveSession(quizId: string, instructorId: string): Promise<string | null> {
  const { data } = await supabase.from('live_quiz_sessions').insert({ quiz_id: quizId, instructor_id: instructorId, status: 'active', started_at: new Date().toISOString() }).select('id').single();
  return (data?.id as string) ?? null;
}

export async function endLiveSession(sessionId: string): Promise<void> {
  await supabase.from('live_quiz_sessions').update({ status: 'ended', ended_at: new Date().toISOString() }).eq('id', sessionId);
}
