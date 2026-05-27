import { Navigate } from 'react-router-dom';
import PageShell from '../components/PageShell';
import MistakeNotebook from '../components/MistakeNotebook';
import { useAuth } from '../contexts/AuthContext';

export default function Mistakes() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;

  return (
    <PageShell>
      <div className="max-w-3xl mx-auto">
        <MistakeNotebook userId={user.id} />
      </div>
    </PageShell>
  );
}
