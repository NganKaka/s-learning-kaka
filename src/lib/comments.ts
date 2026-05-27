import { supabase } from './supabase';

export interface Comment {
  id: string;
  lesson_id: string;
  user_id: string;
  parent_id: string | null;
  content: string;
  created_at: string;
  display_name?: string;
  avatar_url?: string;
  replies?: Comment[];
}

export async function getComments(lessonId: string): Promise<Comment[]> {
  const { data } = await supabase.from('comments').select('*').eq('lesson_id', lessonId).order('created_at', { ascending: true });
  if (!data) return [];
  const userIds = [...new Set(data.map((c) => c.user_id as string))];
  const { data: profiles } = await supabase.from('profiles').select('id, display_name, avatar_url').in('id', userIds);
  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
  const comments: Comment[] = data.map((c) => {
    const p = profileMap.get(c.user_id as string);
    return { ...c, display_name: p?.display_name ?? null, avatar_url: p?.avatar_url ?? null, replies: [] } as Comment;
  });
  // Thread replies
  const roots: Comment[] = [];
  const map = new Map(comments.map((c) => [c.id, c]));
  for (const c of comments) {
    if (c.parent_id && map.has(c.parent_id)) {
      map.get(c.parent_id)!.replies!.push(c);
    } else {
      roots.push(c);
    }
  }
  return roots;
}

export async function addComment(lessonId: string, userId: string, content: string, parentId?: string): Promise<Comment | null> {
  const { data } = await supabase.from('comments').insert({ lesson_id: lessonId, user_id: userId, content, parent_id: parentId ?? null }).select('*').single();
  return data as Comment | null;
}

export async function deleteComment(id: string): Promise<void> {
  await supabase.from('comments').delete().eq('id', id);
}
