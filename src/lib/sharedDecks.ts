import { supabase } from './supabase';

export interface SharedDeck {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  card_ids: string[];
  is_public: boolean;
  created_at: string;
}

export async function createSharedDeck(params: { ownerId: string; title: string; description?: string; cardIds: string[] }): Promise<SharedDeck | null> {
  const { data } = await supabase.from('shared_decks').insert({ owner_id: params.ownerId, title: params.title, description: params.description ?? null, card_ids: params.cardIds }).select('*').single();
  return data as SharedDeck | null;
}

export async function getPublicDecks(): Promise<SharedDeck[]> {
  const { data } = await supabase.from('shared_decks').select('*').eq('is_public', true).order('created_at', { ascending: false }).limit(20);
  return (data ?? []) as SharedDeck[];
}

export async function getMyDecks(userId: string): Promise<SharedDeck[]> {
  const { data } = await supabase.from('shared_decks').select('*').eq('owner_id', userId).order('created_at', { ascending: false });
  return (data ?? []) as SharedDeck[];
}

export async function getDeckCards(cardIds: string[]): Promise<Array<{ id: string; front_md: string; back_md: string }>> {
  if (cardIds.length === 0) return [];
  const { data } = await supabase.from('flashcards').select('id, front_md, back_md').in('id', cardIds);
  return (data ?? []) as Array<{ id: string; front_md: string; back_md: string }>;
}
