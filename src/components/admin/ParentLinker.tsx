/**
 * Parent linker component - links parents to student enrollments.
 */
import { useEffect, useState } from 'react';
import { Link2, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import CustomSelect from '../ui/CustomSelect';

interface ProfileOption {
  id: string;
  display_name: string | null;
  is_parent: boolean;
}

interface EnrollmentOption {
  id: string;
  user_id: string;
  course_id: string;
  course_title: string;
}

interface LinkRecord {
  id: string;
  parent_name: string | null;
  student_name: string | null;
  course_title: string;
}

interface ParentLinkerProps {
  // Props if needed in the future
}

export function ParentLinker() {
  const [parents, setParents] = useState<ProfileOption[]>([]);
  const [students, setStudents] = useState<ProfileOption[]>([]);
  const [enrollments, setEnrollments] = useState<EnrollmentOption[]>([]);
  const [selectedParent, setSelectedParent] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedEnrollment, setSelectedEnrollment] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [links, setLinks] = useState<LinkRecord[]>([]);

  useEffect(() => {
    void (async () => {
      const [{ data: profiles }, { data: enrs }, { data: courses }, { data: existingLinks }] =
        await Promise.all([
          supabase.from('profiles').select('id, display_name, is_parent'),
          supabase.from('enrollments').select('id, user_id, course_id').eq('status', 'active'),
          supabase.from('courses').select('id, title'),
          supabase.from('parent_links').select('id, parent_id, enrollment_id, tracking_code'),
        ]);

      const allProfiles = (profiles ?? []) as ProfileOption[];
      setParents(allProfiles.filter((p) => p.is_parent));
      setStudents(allProfiles);

      const courseMap = new Map((courses ?? []).map((c) => [c.id, c.title as string]));
      const enrichedEnrollments = (enrs ?? []).map((e) => ({
        id: e.id as string,
        user_id: e.user_id as string,
        course_id: e.course_id as string,
        course_title: courseMap.get(e.course_id as string) ?? 'Khoá học',
      }));
      setEnrollments(enrichedEnrollments);

      const profileMap = new Map(allProfiles.map((p) => [p.id, p.display_name]));
      const existingLinksEnriched = (existingLinks ?? []).map((l) => {
        const enr = enrichedEnrollments.find((e) => e.id === l.enrollment_id);
        return {
          id: l.id as string,
          parent_name: profileMap.get(l.parent_id as string) ?? null,
          student_name: enr ? profileMap.get(enr.user_id) ?? null : null,
          course_title: enr?.course_title ?? '—',
        };
      });
      setLinks(existingLinksEnriched);
      setLoading(false);
    })();
  }, []);

  const handleLink = async () => {
    if (!selectedParent || !selectedEnrollment) return;
    setSaving(true);
    setMessage(null);
    const enr = enrollments.find((e) => e.id === selectedEnrollment);
    const code = `ADM-${Date.now().toString(36).toUpperCase()}`;

    const { error } = await supabase.from('parent_links').insert({
      parent_id: selectedParent,
      enrollment_id: selectedEnrollment,
      tracking_code: code,
    });

    if (error) {
      setMessage(error.message.includes('unique') ? 'Enrollment này đã được gán.' : error.message);
    } else {
      setMessage('Đã gán thành công!');
      const parentName = parents.find((p) => p.id === selectedParent)?.display_name ?? null;
      const studentName = students.find((s) => s.id === enr?.user_id)?.display_name ?? null;
      setLinks((prev) => [
        ...prev,
        { id: code, parent_name: parentName, student_name: studentName, course_title: enr?.course_title ?? '—' },
      ]);
      setSelectedParent('');
      setSelectedEnrollment('');
    }
    setSaving(false);
  };

  const courseOptions = [...new Map(enrollments.map((e) => [e.course_id, e.course_title])).entries()].map(
    ([id, title]) => ({ value: id, label: title })
  );

  const studentOptions = selectedCourse
    ? enrollments
        .filter((e) => e.course_id === selectedCourse)
        .map((e) => {
          const name = students.find((s) => s.id === e.user_id)?.display_name ?? e.user_id.slice(0, 8);
          return { id: e.id, label: name };
        })
    : [];

  if (loading)
    return (
      <div className="flex justify-center py-8">
        <Loader2 size={20} className="animate-spin text-primary" />
      </div>
    );

  return (
    <div className="glass-card rounded-2xl p-5 space-y-5">
      <p className="font-tech text-[10px] uppercase tracking-[0.18em] text-secondary/55">
        Gán phụ huynh theo dõi học viên (không cần mã)
      </p>

      <div className="grid sm:grid-cols-3 gap-3">
        <div className="space-y-1">
          <label className="font-tech text-[10px] uppercase tracking-[0.18em] text-secondary/55">
            Phụ huynh
          </label>
          <CustomSelect
            value={selectedParent}
            onChange={(v) => setSelectedParent(v)}
            options={[
              { value: '', label: 'Chọn phụ huynh…' },
              ...parents.map((p) => ({
                value: p.id,
                label: p.display_name ?? p.id.slice(0, 8),
              })),
            ]}
          />
        </div>
        <div className="space-y-1">
          <label className="font-tech text-[10px] uppercase tracking-[0.18em] text-secondary/55">
            Khoá học
          </label>
          <CustomSelect
            value={selectedCourse}
            onChange={(v) => {
              setSelectedCourse(v);
              setSelectedEnrollment('');
            }}
            options={[{ value: '', label: 'Chọn khoá học…' }, ...courseOptions]}
          />
        </div>
        <div className="space-y-1">
          <label className="font-tech text-[10px] uppercase tracking-[0.18em] text-secondary/55">
            Học viên
          </label>
          <CustomSelect
            value={selectedEnrollment}
            onChange={(v) => setSelectedEnrollment(v)}
            disabled={!selectedCourse}
            options={[
              { value: '', label: selectedCourse ? 'Chọn học viên…' : 'Chọn khoá học trước' },
              ...studentOptions.map((s) => ({ value: s.id, label: s.label })),
            ]}
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleLink}
          disabled={saving || !selectedParent || !selectedEnrollment}
          className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/15 px-4 py-2 text-xs font-tech uppercase tracking-[0.16em] text-primary hover:bg-primary/25 disabled:opacity-50"
        >
          {saving ? <Loader2 size={12} className="animate-spin" /> : <Link2 size={12} />}
          Gán
        </button>
        {message && (
          <p className={`text-xs ${message.includes('thành công') ? 'text-emerald-300' : 'text-red-300'}`}>
            {message}
          </p>
        )}
      </div>

      {links.length > 0 && (
        <div className="space-y-2">
          <p className="font-tech text-[10px] uppercase tracking-[0.18em] text-secondary/55">
            Đã gán ({links.length})
          </p>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {links.map((l) => (
              <div
                key={l.id}
                className="flex items-center justify-between rounded-lg border border-white/8 bg-white/[0.02] px-3 py-2 text-sm"
              >
                <span className="text-on-surface">
                  {l.parent_name ?? 'PH'} → {l.student_name ?? 'HV'}
                </span>
                <span className="font-tech text-[9px] text-secondary/45">{l.course_title}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <TrackingCodeTable enrollments={enrollments} students={students} links={links} />
    </div>
  );
}

function TrackingCodeTable({
  enrollments,
  students,
  links,
}: {
  enrollments: EnrollmentOption[];
  students: ProfileOption[];
  links: LinkRecord[];
}) {
  return (
    <div className="space-y-2">
      <p className="font-tech text-[10px] uppercase tracking-[0.18em] text-secondary/55">Mã theo dõi</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-left">
              <th className="pb-2 font-tech text-[10px] uppercase tracking-[0.14em] text-secondary/55">
                Học viên
              </th>
              <th className="pb-2 font-tech text-[10px] uppercase tracking-[0.14em] text-secondary/55">
                Khoá học
              </th>
              <th className="pb-2 font-tech text-[10px] uppercase tracking-[0.14em] text-secondary/55">
                Mã
              </th>
              <th className="pb-2 font-tech text-[10px] uppercase tracking-[0.14em] text-secondary/55">
                Trạng thái
              </th>
            </tr>
          </thead>
          <tbody>
            {enrollments.map((e) => {
              const studentName = students.find((s) => s.id === e.user_id)?.display_name ?? e.user_id.slice(0, 8);
              const linked = links.some((l) => l.course_title === e.course_title && l.student_name === studentName);
              return (
                <TrackingCodeRow
                  key={e.id}
                  enrollmentId={e.id}
                  studentName={studentName}
                  courseTitle={e.course_title}
                  linked={linked}
                />
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TrackingCodeRow({
  enrollmentId,
  studentName,
  courseTitle,
  linked,
}: {
  enrollmentId: string;
  studentName: string;
  courseTitle: string;
  linked: boolean;
}) {
  const [code, setCode] = useState<string | null>(null);
  const [loadingCode, setLoadingCode] = useState(true);

  useEffect(() => {
    supabase
      .from('enrollments')
      .select('tracking_code')
      .eq('id', enrollmentId)
      .single()
      .then(({ data }) => {
        setCode((data?.tracking_code as string | null) ?? null);
        setLoadingCode(false);
      });
  }, [enrollmentId]);

  const generateCode = async () => {
    const newCode = `TRK-${Date.now().toString(36).toUpperCase().slice(-6)}`;
    await supabase.from('enrollments').update({ tracking_code: newCode }).eq('id', enrollmentId);
    setCode(newCode);
  };

  return (
    <tr className="border-b border-white/5">
      <td className="py-2 text-on-surface">{studentName}</td>
      <td className="py-2 text-secondary/70">{courseTitle}</td>
      <td className="py-2">
        {loadingCode ? (
          <span className="text-secondary/40">…</span>
        ) : code ? (
          <code className="rounded bg-white/[0.06] px-1.5 py-0.5 font-tech text-[10px] text-cyan-200">
            {code}
          </code>
        ) : (
          <button
            type="button"
            onClick={generateCode}
            className="font-tech text-[10px] uppercase text-primary hover:text-cyan-200"
          >
            Tạo mã
          </button>
        )}
      </td>
      <td className="py-2">
        {linked ? (
          <span className="font-tech text-[9px] uppercase text-emerald-300">Đã liên kết</span>
        ) : code ? (
          <span className="font-tech text-[9px] uppercase text-amber-300">Chưa liên kết</span>
        ) : (
          <span className="font-tech text-[9px] uppercase text-secondary/40">Chưa có mã</span>
        )}
      </td>
    </tr>
  );
}
