import LegalLayout from './LegalLayout.jsx';

export default function TermsPage() {
  return (
    <LegalLayout title="Terms of Service">
      <p data-testid="terms-intro">
        These Terms govern your use of AI Operator, an AI-powered sales assistant for
        online sellers (the "Service"). By creating an account or using any feature of
        the Service you accept these Terms.
      </p>

      <h2>The service</h2>
      <p>
        AI Operator provides an AI assistant that helps sellers communicate with customers
        on connected channels (such as Instagram and WhatsApp), manage products, leads,
        conversations and orders, and automate parts of the sales workflow.
      </p>

      <h2>Your responsibilities</h2>
      <ul>
        <li>You are responsible for the accuracy of your store information, products and bot training instructions.</li>
        <li>You are responsible for the platforms you connect (Instagram, WhatsApp, etc.), including compliance with their terms and applicable laws.</li>
        <li>You are responsible for the messages your AI bot sends and for any replies your operators write.</li>
        <li>You must not use the Service for spam, harassment, fraud, illegal goods, or content that violates third-party rights.</li>
        <li>You must keep your credentials confidential and notify us of any unauthorized use of your account.</li>
      </ul>

      <h2>Prohibited use</h2>
      <ul>
        <li>Selling regulated, illegal or unsafe products via the Service.</li>
        <li>Mass unsolicited messaging or spam.</li>
        <li>Impersonating another person or business.</li>
        <li>Attempting to compromise, reverse-engineer or overload the Service.</li>
      </ul>

      <h2>AI output and accuracy</h2>
      <p>
        AI-generated replies, summaries and suggestions are produced by automated systems
        and may contain inaccuracies. AI Operator does <strong>not</strong> warrant that
        the Service will be error-free or 100% accurate. You are responsible for
        reviewing AI output before relying on it for binding business decisions.
      </p>

      <h2>Subscriptions and trial</h2>
      <p>
        Some features may be offered under a free trial or paid subscription. Pricing,
        billing cycle and refund policy are described on the pricing page or in the
        applicable order form.
      </p>

      <h2>Suspension and termination</h2>
      <p>
        We may suspend or terminate accounts that violate these Terms, abuse the Service,
        or jeopardize the integrity of connected platforms. You may delete your account
        at any time — see the <a href="/data-deletion">Data Deletion</a> page.
      </p>

      <h2>Limitation of liability</h2>
      <p>
        To the maximum extent permitted by law, AI Operator and its operators are not
        liable for indirect, incidental or consequential damages, including lost sales,
        lost data or business interruption arising from use of the Service.
      </p>

      <h2>Changes</h2>
      <p>
        We may update these Terms from time to time. Material changes will be communicated
        via email or in the dashboard.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about these Terms?{' '}
        <a href="mailto:social@aioperator.social">social@aioperator.social</a>.
      </p>
    </LegalLayout>
  );
}
