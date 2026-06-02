/**
 * Module panel component - displays a single module with its lessons.
 */
import { ChevronDown, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { Module, Lesson } from '../../lib/database.types';
import { LessonRow } from './LessonRow';

interface ModulePanelProps {
  module: Module & { lessons: Lesson[] };
  index: number;
  openLessonId: string | null;
  onToggleLesson: (id: string | null) => void;
  onAddLesson: () => void;
  onChange: () => void;
  courseId: string;
}

export function ModulePanel({
  module,
  index,
  openLessonId,
  onToggleLesson,
  onAddLesson,
  onChange,
  courseId,
}: ModulePanelProps) {
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
          <button
            type="button"
            onClick={handleRename}
            className="font-tech text-[10px] uppercase tracking-[0.14em] text-secondary/60 hover:text-cyan-200"
          >
            Đổi tên
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="text-red-400/70 hover:text-red-300"
          >
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
