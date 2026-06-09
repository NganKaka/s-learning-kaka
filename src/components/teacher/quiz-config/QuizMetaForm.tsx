import { Loader2 } from 'lucide-react';
import CustomSelect from '../../ui/CustomSelect';
import type { Quiz, QuizGradingMode } from '../../../lib/quiz';
import ConfigField from './ConfigField';

/**
 * Quiz-level settings form: title, time limit, max attempts, grading mode, pass threshold.
 * Calls onSave with a partial Quiz patch on each field blur/change.
 */
export interface QuizMetaFormProps {
  quiz: Quiz;
  saving: boolean;
  onSave: (patch: Partial<Quiz>) => void;
}

export default function QuizMetaForm({ quiz, saving, onSave }: QuizMetaFormProps) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
      <ConfigField label="Tiêu đề">
        <input
          type="text"
          defaultValue={quiz.title ?? ''}
          onBlur={(e) => onSave({ title: e.target.value || null })}
          className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-on-surface focus:border-cyan-300/40 focus:outline-none"
        />
      </ConfigField>

      <div className="grid sm:grid-cols-2 gap-3 items-end">
        <ConfigField label="Thời gian (phút)">
          <input
            type="number"
            min={0}
            defaultValue={quiz.time_limit_seconds ? Math.round(quiz.time_limit_seconds / 60) : ''}
            onBlur={(e) => {
              const raw = e.target.value.trim();
              const minutes = raw === '' ? null : Math.max(0, Number(raw));
              onSave({
                time_limit_seconds: minutes && minutes > 0 ? minutes * 60 : null,
              });
            }}
            placeholder="Không giới hạn"
            className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-on-surface focus:border-cyan-300/40 focus:outline-none"
          />
        </ConfigField>

        <ConfigField label="Số lượt làm tối đa">
          <input
            type="number"
            min={1}
            defaultValue={quiz.max_attempts}
            onBlur={(e) => onSave({ max_attempts: Math.max(1, Number(e.target.value) || 1) })}
            className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-on-surface focus:border-cyan-300/40 focus:outline-none"
          />
        </ConfigField>

        <ConfigField label="Cách tính điểm cuối">
          <CustomSelect
            value={quiz.grading_mode}
            onChange={(v) => onSave({ grading_mode: v as QuizGradingMode })}
            options={[
              { value: 'max', label: 'Điểm cao nhất giữa các lượt' },
              { value: 'mean', label: 'Điểm trung bình các lượt' },
            ]}
          />
        </ConfigField>

        <ConfigField label="Ngưỡng đậu (%)">
          <input
            type="number"
            min={0}
            max={100}
            defaultValue={quiz.pass_threshold ?? ''}
            onBlur={(e) => {
              const raw = e.target.value.trim();
              const value = raw === '' ? null : Math.max(0, Math.min(100, Number(raw)));
              onSave({ pass_threshold: value });
            }}
            placeholder="Không đặt"
            className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-on-surface focus:border-cyan-300/40 focus:outline-none"
          />
        </ConfigField>
      </div>

      {saving && (
        <p className="font-tech text-[10px] uppercase tracking-[0.16em] text-cyan-300 inline-flex items-center gap-1.5">
          <Loader2 size={10} className="animate-spin" /> Đang lưu…
        </p>
      )}
    </div>
  );
}
