import PageShell from '../components/PageShell';
import SectionHeading from '../components/ui/SectionHeading';

export default function Cart() {
  return (
    <PageShell>
      <SectionHeading
        eyebrow="Checkout"
        title="Giỏ hàng"
        subtitle="Phase 2.2 sẽ wire flow checkout với VNPay & MoMo."
      />
      <div className="mt-10 glass-card rounded-2xl p-12 text-center">
        <p className="text-secondary/70">Giỏ hàng trống.</p>
      </div>
    </PageShell>
  );
}
