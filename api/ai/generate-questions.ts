import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * AI question generator. Teacher sends lesson content, gets MCQ questions back.
 * Uses OpenAI API (or compatible).
 */
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!OPENAI_API_KEY) return res.status(503).json({ error: 'AI not configured' });

  const { content, count = 5, language = 'vi' } = req.body ?? {};
  if (!content || typeof content !== 'string') return res.status(400).json({ error: 'Missing content' });

  const prompt = `Dựa trên nội dung bài học sau, tạo ${count} câu hỏi trắc nghiệm (MCQ) bằng tiếng ${language === 'vi' ? 'Việt' : 'Anh'}.

Mỗi câu hỏi có 4 đáp án, chỉ 1 đáp án đúng.

Trả về JSON array với format:
[{"prompt": "câu hỏi", "choices": ["A", "B", "C", "D"], "correct": 0, "explanation": "giải thích ngắn"}]

Nội dung bài học:
${content.slice(0, 4000)}`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(500).json({ error: `OpenAI error: ${err}` });
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content ?? '';
    // Extract JSON from response
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return res.status(500).json({ error: 'Failed to parse AI response' });

    const questions = JSON.parse(jsonMatch[0]);
    return res.status(200).json({ questions });
  } catch (e: any) {
    return res.status(500).json({ error: e.message ?? 'Unknown error' });
  }
}
