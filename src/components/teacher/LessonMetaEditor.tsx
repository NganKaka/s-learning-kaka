/**
 * Lesson metadata editor component.
 */
import { useState } from 'react';
import { AlertCircle, Loader2, Save, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Lesson } from '../../lib/database.types';
import { FieldRaw } from './fields';

interface LessonMetaEditorProps {
  lesson: Lesson;
  onChange: () => void;
}

export function LessonMetaEditor({ lesson, onChange }: LessonMetaEditorProps) {
  const [title, setTitle] = useState(lesson.title);
  const [slug, setSlug] = useState(lesson.slug);
  const [bunny, setBunny] = useState(lesson.bunny_video_id ?? '');
  const [duration, setDuration] = useState(String(lesson.duration_seconds));
  const [description, setDescription] = useState(lesson.description ?? '');
  const [isPreview, setIsPreview] = useState(lesson.is_preview);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const save = async () => {
    setSaving(true);
    setErr(null);
    const { error } = await supabase
      .from('lessons')
      .update({
        title,
        slug,
        bunny_video_id: bunny || null,
        duration_seconds: parseInt(duration, 10) || 0,
        description: description || null,
        is_preview: isPreview,
      })
      .eq('id', lesson.id);
    setSaving(false);
    if (error) setErr(error.message);
    else onChange();
  };

  const remove = async () => {
    if (!window.confirm(`Xoá bài "${lesson.title}"?`)) return;
    await supabase.from('lessons').delete().eq('id', lesson.id);
    onChange();
  };

  return (
    <div className="space-y-3">
      <p className="font-tech text-[10px] uppercase tracking-[0.18em] text-primary">Bài học</p>
      <div className="grid sm:grid-cols-2 gap-3">
        <FieldRaw label="Tiêu đề" value={title} onChange={setTitle} />
        <FieldRaw label="Slug" value={slug} onChange={setSlug} />
        <FieldRaw label="Bunny video ID" value={bunny} onChange={setBunny} placeholder="abc123-..." />
        <FieldRaw label="Thời lượng (giây)" value={duration} onChange={setDuration} type="number" />
      </div>
      <FieldRaw label="Mô tả" value={description} onChange={setDescription} multiline />

      <label className="inline-flex items-center gap-2 font-tech text-[10px] uppercase tracking-[0.16em] text-secondary/65 cursor-pointer">
        <input
          type="checkbox"
          checked={isPreview}
          onChange={(e) => setIsPreview(e.target.checked)}
          className="accent-primary"
        />
        Cho xem thử (preview)
      </label>

      {err && (
        <div className="flex items-start gap-2 rounded-lg border border-red-400/30 bg-red-500/5 p-2.5 text-xs text-red-300">
          <AlertCircle size={13} className="mt-0.5 shrink-0" /> {err}
        </div>
      )}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/15 px-4 py-2 text-xs font-tech uppercase tracking-[0.16em] text-primary hover:bg-primary/25 disabled:opacity-60"
        >
          {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
          Lưu bài học
        </button>
        <button
          type="button"
          onClick={remove}
          className="inline-flex items-center gap-2 rounded-full border border-red-400/30 bg-red-500/5 px-3 py-2 text-xs font-tech uppercase tracking-[0.16em] text-red-300 hover:bg-red-500/10"
        >
          <Trash2 size={12} /> Xoá
        </button>
      </div>
    </div>
  );
}
