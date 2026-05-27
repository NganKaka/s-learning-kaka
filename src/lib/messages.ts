import { supabase } from './supabase';

export interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
  sender_name?: string;
}

export interface Conversation {
  userId: string;
  displayName: string | null;
  avatarUrl: string | null;
  lastMessage: string;
  lastAt: string;
  unread: number;
}

export async function getConversations(userId: string): Promise<Conversation[]> {
  const { data } = await supabase.from('messages').select('*').or(`sender_id.eq.${userId},recipient_id.eq.${userId}`).order('created_at', { ascending: false });
  if (!data) return [];

  // Group by other user
  const convMap = new Map<string, { messages: typeof data }>();
  for (const m of data) {
    const otherId = m.sender_id === userId ? m.recipient_id : m.sender_id;
    if (!convMap.has(otherId as string)) convMap.set(otherId as string, { messages: [] });
    convMap.get(otherId as string)!.messages.push(m);
  }

  const otherIds = [...convMap.keys()];
  const { data: profiles } = await supabase.from('profiles').select('id, display_name, avatar_url').in('id', otherIds);
  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

  return otherIds.map((id) => {
    const msgs = convMap.get(id)!.messages;
    const last = msgs[0];
    const unread = msgs.filter((m) => m.recipient_id === userId && !m.is_read).length;
    const p = profileMap.get(id);
    return { userId: id, displayName: p?.display_name ?? null, avatarUrl: p?.avatar_url ?? null, lastMessage: last.content as string, lastAt: last.created_at as string, unread };
  }).sort((a, b) => b.lastAt.localeCompare(a.lastAt));
}

export async function getMessages(userId: string, otherId: string): Promise<Message[]> {
  const { data } = await supabase.from('messages').select('*')
    .or(`and(sender_id.eq.${userId},recipient_id.eq.${otherId}),and(sender_id.eq.${otherId},recipient_id.eq.${userId})`)
    .order('created_at', { ascending: true });
  return (data ?? []) as Message[];
}

export async function sendMessage(senderId: string, recipientId: string, content: string): Promise<Message | null> {
  const { data } = await supabase.from('messages').insert({ sender_id: senderId, recipient_id: recipientId, content }).select('*').single();
  return data as Message | null;
}

export async function markRead(userId: string, senderId: string): Promise<void> {
  await supabase.from('messages').update({ is_read: true }).eq('recipient_id', userId).eq('sender_id', senderId).eq('is_read', false);
}
