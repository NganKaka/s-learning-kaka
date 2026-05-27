import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import PageShell from '../components/PageShell';
import { verifyCertificate, type Certificate } from '../lib/certificates';

export default function VerifyCertificate() {
  const { code } = useParams<{ code: string }>();
  const [cert, setCert] = useState<Certificate | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!code) { setLoading(false); setNotFound(true); return; }
    verifyCertificate(code).then((c) => {
      if (c) setCert(c); else setNotFound(true);
      setLoading(false);
    });
  }, [code]);

  if (loading) return <PageShell><div className="flex justify-center py-20"><Loader2 size={24} className="animate-spin text-primary" /></div></PageShell>;

  if (notFound) {
    return (
      <PageShell>
        <div className="max-w-md mx-auto glass-card rounded-2xl p-8 text-center space-y-3">
          <XCircle size={32} className="mx-auto text-red-400" />
          <p className="font-headline text-lg font-bold text-on-surface">Chứng chỉ không hợp lệ</p>
          <p className="text-sm text-secondary/70">Mã xác minh không tồn tại hoặc đã bị thu hồi.</p>
        </div>
      </PageShell>
    );
  }

  const meta = cert?.metadata;
  return (
    <PageShell>
      <div className="max-w-md mx-auto glass-card rounded-2xl p-8 text-center space-y-4">
        <CheckCircle2 size={40} className="mx-auto text-emerald-400" />
        <p className="font-headline text-xl font-bold text-on-surface">Chứng chỉ hợp lệ ✓</p>
        <div className="space-y-1 text-sm text-secondary/80">
          <p>Học viên: <span className="text-on-surface font-bold">{meta?.student_name ?? '—'}</span></p>
          <p>Khoá học: <span className="text-on-surface font-bold">{meta?.course_title ?? '—'}</span></p>
          <p>Ngày cấp: <span className="text-on-surface">{cert ? new Date(cert.issued_at).toLocaleDateString('vi-VN') : '—'}</span></p>
          {meta?.score !== undefined && <p>Điểm: <span className="text-primary font-bold">{meta.score.toFixed(0)}%</span></p>}
        </div>
        <p className="font-tech text-[9px] uppercase tracking-[0.14em] text-secondary/40">Mã: {cert?.verify_code}</p>
      </div>
    </PageShell>
  );
}
