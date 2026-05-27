import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronDown, Plus, Trash2, Save, Loader2, AlertCircle, Brain, Video, Eye, EyeOff, Sparkles, X } from 'lucide-react';
import PageShell from '../components/PageShell';
import QuizConfigEditor from '../components/QuizConfigEditor';
import CustomSelect from '../components/ui/CustomSelect';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import type { Course, Module, Lesson } from '../lib/database.types';

interface Flashcard {
  id: string;
  lesson_id: string;
  course_id: string;
  front_md: string;
  back_md: string;
  order_index: number;
}

export default function TeacherCourseEditor() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<Array<Module & { lessons: Lesson[] }>>([]);
  const [openLessonId, setOpenLessonId] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [savingCourse, setSavingCourse] = useState(false);

  useEffect(() => {
    if (!slug || !user) return;
    let cancelled = false;
    (async () => {
      const { data: c } = await supabase
        .from('courses')
        .select('*')
        .eq('slug', slug)
        .eq('instructor_id', user.id)
        .maybeSingle();
      if (cancelled) return;
      if (!c) {
        setError('not_found');
        return;
      }
      setCourse(c as Course);

      const { data: mods } = await supabase
        .from('modules')
        .select('*, lessons(*)')
        .eq('course_id', (c as Course).id)
        .order('order_index', { ascending: true });
      if (cancelled) return;
      const sorted = (mods ?? []).map((m) => ({
        ...(m as Module),
        lessons: ((m as { lessons: Lesson[] }).lessons ?? []).sort((a, b) => a.order_index - b.order_index),
      }));
      setModules(sorted);
    })();
    return () => {
      cancelled = true;
    };
  }, [slug, user?.id, refreshTick]);

  if (error === 'not_found') {
    return (
      <PageShell>
        <div className="glass-card rounded-2xl p-12 text-center">
          <p className="text-secondary/70">Không tìm thấy khoá học hoặc bạn không có quyền chỉnh sửa.</p>
          <Link to="/teacher/courses" className="inline-block mt-3 text-cyan-300 hover:text-cyan-200 underline">
            ← Quay lại
          </Link>
        </div>
      </PageShell>
    );
  }

  if (!course) {
    return (
      <PageShell>
        <div className="glass-card rounded-2xl p-12 animate-pulse min-h-[400px]" />
      </PageShell>
    );
  }

  const saveCourseField = async (patch: Partial<Course>) => {
    setSavingCourse(true);
    const { error: e } = await supabase.from('courses').update(patch).eq('id', course.id);
    setSavingCourse(false);
    if (!e) setCourse({ ...course, ...patch });
  };

  const togglePublish = () => {
    saveCourseField({ status: course.status === 'published' ? 'draft' : 'published' });
  };

  const addModule = async () => {
    const title = window.prompt('Tên chương?');
    if (!title) return;
    const order = modules.length;
    const { data } = await supabase
      .from('modules')
      .insert({ course_id: course.id, title, order_index: order })
      .select('*')
      .single();
    if (data) setModules((m) => [...m, { ...(data as Module), lessons: [] }]);
  };

  const addLesson = async (moduleId: string) => {
    const title = window.prompt('Tên bài học?');
    if (!title) return;
    const slugInput = window.prompt('Slug?', title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/đ/g, 'd')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, ''));
    if (!slugInput) return;

    const targetModule = modules.find((m) => m.id === moduleId);
    if (!targetModule) return;

    const { data, error: e } = await supabase
      .from('lessons')
      .insert({
        module_id: moduleId,
        course_id: course.id,
        slug: slugInput,
        title,
        order_index: targetModule.lessons.length,
        is_preview: false,
      })
      .select('*')
      .single();
    if (e) {
      window.alert(`Lỗi: ${e.message}`);
      return;
    }
    setRefreshTick((n) => n + 1);
  };

  return (
    <PageShell>
      <Link to="/teacher/courses" className="inline-flex items-center gap-1.5 font-tech text-[10px] uppercase tracking-[0.18em] text-secondary/60 hover:text-cyan-300 mb-4">
        <ChevronLeft size={12} /> Tất cả khoá học
      </Link>

      <div className="space-y-6">
        {/* Course meta editor */}
        <div className="glass-card rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h1 className="font-headline text-2xl font-extrabold text-on-surface">{course.title}</h1>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={togglePublish}
                disabled={savingCourse}
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 font-tech text-[10px] uppercase tracking-[0.16em] transition-colors disabled:opacity-60 ${
                  course.status === 'published'
                    ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20'
                    : 'border-white/15 bg-white/[0.04] text-secondary/70 hover:bg-white/[0.08]'
                }`}
              >
                {course.status === 'published' ? <Eye size={11} /> : <EyeOff size={11} />}
                {course.status === 'published' ? 'Đã xuất bản' : 'Nháp'}
              </button>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Tiêu đề" value={course.title} onSave={(v) => saveCourseField({ title: v })} />
            <Field label="Phụ đề" value={course.subtitle ?? ''} onSave={(v) => saveCourseField({ subtitle: v })} />
            <Field label="Slug" value={course.slug} onSave={(v) => saveCourseField({ slug: v })} />
            <Field
              label="Học phí (VND)"
              value={String(course.price_vnd)}
              onSave={(v) => saveCourseField({ price_vnd: parseInt(v, 10) || 0 })}
              type="number"
            />
            <Field label="Cover image URL" value={course.cover_image ?? ''} onSave={(v) => saveCourseField({ cover_image: v })} />
            <SelectField
              label="Trình độ"
              value={course.level}
              onSave={(v) => saveCourseField({ level: v as 'beginner' | 'intermediate' | 'advanced' })}
              options={[
                { v: 'beginner', label: 'Cơ bản' },
                { v: 'intermediate', label: 'Trung bình' },
                { v: 'advanced', label: 'Nâng cao' },
              ]}
            />
          </div>

          <Field
            label="Mô tả"
            value={course.description ?? ''}
            onSave={(v) => saveCourseField({ description: v })}
            multiline
          />
        </div>

        {/* Curriculum editor */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="font-tech text-[10px] uppercase tracking-[0.2em] text-primary">Giáo trình</p>
            <button
              type="button"
              onClick={addModule}
              className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/15 px-3 py-1.5 font-tech text-[10px] uppercase tracking-[0.16em] text-primary hover:bg-primary/25"
            >
              <Plus size={11} /> Thêm chương
            </button>
          </div>

          {modules.length === 0 && (
            <div className="glass-card rounded-2xl p-8 text-center text-secondary/65 text-sm">
              Chưa có chương nào — bấm "Thêm chương" để bắt đầu.
            </div>
          )}

          {modules.map((mod, mi) => (
            <ModulePanel
              key={mod.id}
              module={mod}
              index={mi}
              openLessonId={openLessonId}
              onToggleLesson={setOpenLessonId}
              onAddLesson={() => addLesson(mod.id)}
              onChange={() => setRefreshTick((n) => n + 1)}
              courseId={course.id}
            />
          ))}
        </div>
      </div>
    </PageShell>
  );
}

interface ModulePanelProps {
  module: Module & { lessons: Lesson[] };
  index: number;
  openLessonId: string | null;
  onToggleLesson: (id: string | null) => void;
  onAddLesson: () => void;
  onChange: () => void;
  courseId: string;
}

function ModulePanel({ module, index, openLessonId, onToggleLesson, onAddLesson, onChange, courseId }: ModulePanelProps) {
  const handleDelete = async () => {
    if (!window.confirm(`Xoá chương "${module.title}" và toàn bộ bài học bên trong?`)) return;
    await supabase.from('modules').delete().eq('id', module.id);
    onChange();
  };

  const handleRename = async () => {
    const t = window.prompt('Tên chương mới:', module.title);
    if (!t || t === module.title) return;
    await supabase.from('modules').update({ title: t }).eq('id', module.id);
    onChange();
  };

  return (
    <div className="glass-card rounded-2xl p-5 space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <span className="font-tech text-[10px] uppercase tracking-[0.18em] text-primary tabular-nums">
            {String(index + 1).padStart(2, '0')}
          </span>
          <span className="font-headline font-bold text-on-surface">{module.title}</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleRename} className="font-tech text-[10px] uppercase tracking-[0.14em] text-secondary/60 hover:text-cyan-200">
            Đổi tên
          </button>
          <button onClick={handleDelete} className="text-red-400/70 hover:text-red-300">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <ul className="space-y-2">
        {module.lessons.map((lesson, li) => (
          <LessonRow
            key={lesson.id}
            lesson={lesson}
            index={li}
            isOpen={openLessonId === lesson.id}
            onToggle={() => onToggleLesson(openLessonId === lesson.id ? null : lesson.id)}
            onChange={onChange}
            courseId={courseId}
          />
        ))}
      </ul>

      <button
        type="button"
        onClick={onAddLesson}
        className="inline-flex items-center gap-1.5 rounded-full border border-cyan-300/30 bg-cyan-400/10 px-3 py-1.5 font-tech text-[10px] uppercase tracking-[0.16em] text-cyan-200 hover:bg-cyan-400/20"
      >
        <Plus size={11} /> Thêm bài học
      </button>
    </div>
  );
}

interface LessonRowProps {
  lesson: Lesson;
  index: number;
  isOpen: boolean;
  onToggle: () => void;
  onChange: () => void;
  courseId: string;
}

function LessonRow({ lesson, index, isOpen, onToggle, onChange, courseId }: LessonRowProps) {
  const [quizModalOpen, setQuizModalOpen] = useState(false);
  const [hasQuiz, setHasQuiz] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.from('quizzes').select('id').eq('lesson_id', lesson.id).maybeSingle().then(({ data }) => {
      setHasQuiz(!!data);
    });
  }, [lesson.id, quizModalOpen]);

  return (
    <li className="rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-white/[0.04] transition-colors text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="font-tech text-[10px] uppercase tracking-[0.14em] text-secondary/55 tabular-nums shrink-0">
            {String(index + 1).padStart(2, '0')}
          </span>
          <span className="text-sm text-on-surface truncate">{lesson.title}</span>
          {lesson.is_preview && (
            <span className="font-tech text-[9px] uppercase tracking-[0.16em] text-cyan-300/85 shrink-0">Xem thử</span>
          )}
          {lesson.bunny_video_id ? (
            <Video size={11} className="text-emerald-300 shrink-0" />
          ) : (
            <Video size={11} className="text-secondary/40 shrink-0" />
          )}
        </div>
        <ChevronDown size={14} className={`text-secondary/45 transition-transform shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="px-4 pb-4 space-y-4 border-t border-white/10 pt-4">
          <LessonMetaEditor lesson={lesson} onChange={onChange} />
          <FlashcardsEditor lessonId={lesson.id} courseId={courseId} />

          {/* Quiz button */}
          <button
            type="button"
            onClick={() => setQuizModalOpen(true)}
            className={`w-full inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-3 font-tech text-[10px] uppercase tracking-[0.16em] transition-colors ${
              hasQuiz
                ? 'border-primary/30 bg-primary/10 text-primary hover:bg-primary/20'
                : 'border-dashed border-cyan-300/30 bg-cyan-400/[0.04] text-cyan-200 hover:border-cyan-300/60 hover:bg-cyan-400/[0.08]'
            }`}
          >
            <Sparkles size={12} />
            {hasQuiz ? 'Chỉnh sửa Quiz' : 'Thêm Quiz'}
          </button>
        </div>
      )}

      {/* Quiz fullscreen modal */}
      <AnimatePresence>
        {quizModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto"
          >
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/70 backdrop-blur-sm"
              onClick={() => setQuizModalOpen(false)}
            />
            {/* Modal content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="relative z-10 w-full max-w-3xl my-8 mx-4 rounded-2xl border border-white/10 bg-[#0a0f1e] p-6 md:p-8 shadow-2xl"
            >
              {/* Close button */}
              <button
                type="button"
                onClick={() => setQuizModalOpen(false)}
                className="absolute top-4 right-4 rounded-full border border-white/15 bg-white/[0.05] p-2 text-secondary/60 hover:text-on-surface hover:bg-white/[0.1] transition-colors"
                aria-label="Đóng"
              >
                <X size={16} />
              </button>

              <p className="font-headline text-lg font-bold text-on-surface mb-5">
                Quiz — {lesson.title}
              </p>

              <QuizConfigEditor lessonId={lesson.id} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
}

function LessonMetaEditor({ lesson, onChange }: { lesson: Lesson; onChange: () => void }) {
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
        <input type="checkbox" checked={isPreview} onChange={(e) => setIsPreview(e.target.checked)} className="accent-primary" />
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

function FlashcardsEditor({ lessonId, courseId }: { lessonId: string; courseId: string }) {
  const [cards, setCards] = useState<Flashcard[] | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('flashcards')
        .select('*')
        .eq('lesson_id', lessonId)
        .order('order_index', { ascending: true });
      if (!cancelled) setCards((data ?? []) as Flashcard[]);
    })();
    return () => {
      cancelled = true;
    };
  }, [lessonId, tick]);

  const addCard = async () => {
    const front = window.prompt('Mặt trước:');
    if (!front) return;
    const back = window.prompt('Mặt sau:');
    if (!back) return;
    const order = (cards ?? []).length;
    await supabase.from('flashcards').insert({
      lesson_id: lessonId,
      course_id: courseId,
      front_md: front,
      back_md: back,
      order_index: order,
    });
    setTick((n) => n + 1);
  };

  const editCard = async (card: Flashcard) => {
    const front = window.prompt('Mặt trước:', card.front_md);
    if (front === null) return;
    const back = window.prompt('Mặt sau:', card.back_md);
    if (back === null) return;
    await supabase.from('flashcards').update({ front_md: front, back_md: back }).eq('id', card.id);
    setTick((n) => n + 1);
  };

  const deleteCard = async (id: string) => {
    if (!window.confirm('Xoá thẻ này?')) return;
    await supabase.from('flashcards').delete().eq('id', id);
    setTick((n) => n + 1);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="inline-flex items-center gap-2 font-tech text-[10px] uppercase tracking-[0.18em] text-cyan-200">
          <Brain size={11} /> Flashcards <span className="text-secondary/45">({cards?.length ?? 0})</span>
        </p>
        <button
          type="button"
          onClick={addCard}
          className="inline-flex items-center gap-1.5 rounded-full border border-cyan-300/30 bg-cyan-400/10 px-3 py-1 font-tech text-[10px] uppercase tracking-[0.16em] text-cyan-200 hover:bg-cyan-400/20"
        >
          <Plus size={10} /> Thêm thẻ
        </button>
      </div>
      <ul className="space-y-2">
        {cards?.map((c) => (
          <li key={c.id} className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 flex items-start justify-between gap-3">
            <div className="min-w-0 text-sm">
              <p className="text-on-surface truncate">{c.front_md}</p>
              <p className="text-xs text-secondary/55 truncate">{c.back_md}</p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={() => editCard(c)} className="text-cyan-300/70 hover:text-cyan-200 text-xs font-tech uppercase tracking-[0.14em]">
                Sửa
              </button>
              <button onClick={() => deleteCard(c.id)} className="text-red-400/70 hover:text-red-300">
                <Trash2 size={12} />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function FieldRaw({
  label,
  value,
  onChange,
  multiline,
  placeholder,
  type,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  placeholder?: string;
  type?: 'text' | 'number';
}) {
  return (
    <div className="space-y-1">
      <label className="font-tech text-[10px] uppercase tracking-[0.18em] text-secondary/55">{label}</label>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          placeholder={placeholder}
          className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-on-surface focus:border-cyan-300/40 focus:outline-none resize-y"
        />
      ) : (
        <input
          type={type ?? 'text'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-on-surface focus:border-cyan-300/40 focus:outline-none"
        />
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onSave,
  multiline,
  type,
}: {
  label: string;
  value: string;
  onSave: (v: string) => void | Promise<void>;
  multiline?: boolean;
  type?: 'text' | 'number';
}) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  const dirty = draft !== value;
  return (
    <div className="space-y-1">
      <label className="font-tech text-[10px] uppercase tracking-[0.18em] text-secondary/55">{label}</label>
      {multiline ? (
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => dirty && onSave(draft)}
          rows={4}
          className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-on-surface focus:border-cyan-300/40 focus:outline-none resize-y"
        />
      ) : (
        <input
          type={type ?? 'text'}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => dirty && onSave(draft)}
          className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-on-surface focus:border-cyan-300/40 focus:outline-none"
        />
      )}
    </div>
  );
}

function SelectField<T extends string>({
  label,
  value,
  onSave,
  options,
}: {
  label: string;
  value: T;
  onSave: (v: T) => void | Promise<void>;
  options: Array<{ v: T; label: string }>;
}) {
  return (
    <div className="space-y-1">
      <label className="font-tech text-[10px] uppercase tracking-[0.18em] text-secondary/55">{label}</label>
      <CustomSelect
        value={value}
        onChange={(v) => onSave(v as T)}
        options={options.map((o) => ({ value: o.v, label: o.label }))}
      />
    </div>
  );
}
