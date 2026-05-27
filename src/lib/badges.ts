import { supabase } from './supabase';

export interface Badge {
  id: string;
  user_id: string;
  badge_key: string;
  label: string;
  description: string | null;
  icon: string | null;
  earned_at: string;
}

export const BADGE_DEFINITIONS: Record<string, { label: string; description: string; icon: string }> = {
  first_perfect_quiz: { label: 'Điểm tuyệt đối', description: 'Đạt 100% lần đầu trong một quiz', icon: '🏆' },
  streak_7: { label: 'Kiên trì 7 ngày', description: 'Duy trì streak 7 ngày liên tiếp', icon: '🔥' },
  streak_30: { label: 'Chiến binh 30 ngày', description: 'Duy trì streak 30 ngày liên tiếp', icon: '⚡' },
  module_complete: { label: 'Hoàn thành chương', description: 'Hoàn thành tất cả bài trong một chương', icon: '📚' },
  flashcards_100: { label: '100 thẻ', description: 'Ôn tập 100 flashcards', icon: '🧠' },
  flashcards_500: { label: '500 thẻ', description: 'Ôn tập 500 flashcards', icon: '💎' },
  first_quiz: { label: 'Bài kiểm tra đầu tiên', description: 'Hoàn thành quiz đầu tiên', icon: '✨' },
  speed_demon: { label: 'Nhanh như chớp', description: 'Hoàn thành drill dưới 2 phút', icon: '⚡' },
  no_mistakes: { label: 'Sổ sạch', description: 'Giải quyết hết tất cả lỗi sai', icon: '✅' },
  goal_met: { label: 'Đạt mục tiêu', description: 'Hoàn thành mục tiêu tuần', icon: '🎯' },
};

export async function getUserBadges(userId: string): Promise<Badge[]> {
  const { data } = await supabase
    .from('badges')
    .select('*')
    .eq('user_id', userId)
    .order('earned_at', { ascending: false });
  return (data ?? []) as Badge[];
}

export async function awardBadge(userId: string, badgeKey: string): Promise<boolean> {
  const def = BADGE_DEFINITIONS[badgeKey];
  if (!def) return false;
  const { error } = await supabase.from('badges').upsert({
    user_id: userId,
    badge_key: badgeKey,
    label: def.label,
    description: def.description,
    icon: def.icon,
  }, { onConflict: 'user_id,badge_key' });
  return !error;
}

export async function checkAndAwardBadges(userId: string, context: {
  quizScore?: number;
  streak?: number;
  flashcardsReviewed?: number;
  drillTimeSeconds?: number;
  goalMet?: boolean;
  allMistakesResolved?: boolean;
}): Promise<string[]> {
  const awarded: string[] = [];
  if (context.quizScore === 100) {
    if (await awardBadge(userId, 'first_perfect_quiz')) awarded.push('first_perfect_quiz');
  }
  if (context.streak && context.streak >= 7) {
    if (await awardBadge(userId, 'streak_7')) awarded.push('streak_7');
  }
  if (context.streak && context.streak >= 30) {
    if (await awardBadge(userId, 'streak_30')) awarded.push('streak_30');
  }
  if (context.flashcardsReviewed && context.flashcardsReviewed >= 100) {
    if (await awardBadge(userId, 'flashcards_100')) awarded.push('flashcards_100');
  }
  if (context.flashcardsReviewed && context.flashcardsReviewed >= 500) {
    if (await awardBadge(userId, 'flashcards_500')) awarded.push('flashcards_500');
  }
  if (context.drillTimeSeconds && context.drillTimeSeconds < 120) {
    if (await awardBadge(userId, 'speed_demon')) awarded.push('speed_demon');
  }
  if (context.goalMet) {
    if (await awardBadge(userId, 'goal_met')) awarded.push('goal_met');
  }
  if (context.allMistakesResolved) {
    if (await awardBadge(userId, 'no_mistakes')) awarded.push('no_mistakes');
  }
  return awarded;
}
