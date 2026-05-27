import { supabase } from './supabase';

const XP_QUIZ_SUBMIT = 20;
const XP_FLASHCARD_SESSION = 10;
const XP_DRILL_COMPLETE = 15;
const XP_STREAK_BONUS = 5; // per day of streak

export type XpSource = 'quiz_submit' | 'flashcard_review' | 'drill_complete' | 'streak_bonus';

/**
 * Award XP and update streak. Call after quiz submission, flashcard review, or drill completion.
 */
export async function awardXp(params: {
  userId: string;
  source: XpSource;
  referenceId?: string;
}): Promise<{ xp: number; streak: number }> {
  const xpMap: Record<XpSource, number> = {
    quiz_submit: XP_QUIZ_SUBMIT,
    flashcard_review: XP_FLASHCARD_SESSION,
    drill_complete: XP_DRILL_COMPLETE,
    streak_bonus: XP_STREAK_BONUS,
  };

  const xp = xpMap[params.source];

  // Insert XP event
  await supabase.from('xp_events').insert({
    user_id: params.userId,
    source: params.source,
    xp,
    reference_id: params.referenceId ?? null,
  });

  // Update streak
  const today = new Date().toISOString().slice(0, 10);
  const { data: profile } = await supabase
    .from('profiles')
    .select('streak_current, streak_last_date, xp_total')
    .eq('id', params.userId)
    .single();

  let newStreak = 1;
  let bonusXp = 0;

  if (profile) {
    const lastDate = profile.streak_last_date;
    if (lastDate === today) {
      // Already active today, no streak change
      newStreak = profile.streak_current;
    } else {
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      if (lastDate === yesterday) {
        newStreak = profile.streak_current + 1;
        bonusXp = XP_STREAK_BONUS * newStreak;
      }
      // else streak resets to 1
    }

    const totalXp = (profile.xp_total ?? 0) + xp + bonusXp;
    await supabase
      .from('profiles')
      .update({ xp_total: totalXp, streak_current: newStreak, streak_last_date: today })
      .eq('id', params.userId);

    // Award streak bonus as separate event
    if (bonusXp > 0) {
      await supabase.from('xp_events').insert({
        user_id: params.userId,
        source: 'streak_bonus',
        xp: bonusXp,
      });
    }

    return { xp: xp + bonusXp, streak: newStreak };
  }

  return { xp, streak: 1 };
}

export async function getXpStats(userId: string): Promise<{
  total: number;
  streak: number;
  todayXp: number;
}> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('xp_total, streak_current, streak_last_date')
    .eq('id', userId)
    .single();

  const today = new Date().toISOString().slice(0, 10);
  const { data: todayEvents } = await supabase
    .from('xp_events')
    .select('xp')
    .eq('user_id', userId)
    .gte('created_at', `${today}T00:00:00`);

  const todayXp = (todayEvents ?? []).reduce((s, e) => s + (e.xp ?? 0), 0);

  return {
    total: profile?.xp_total ?? 0,
    streak: profile?.streak_last_date === today ? (profile?.streak_current ?? 0) : 0,
    todayXp,
  };
}
