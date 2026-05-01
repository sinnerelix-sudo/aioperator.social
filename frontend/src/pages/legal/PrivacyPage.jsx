import LegalLayout from './LegalLayout.jsx';

export default function PrivacyPage() {
  return (
    <LegalLayout title="Privacy Policy">
      <p data-testid="privacy-intro">
        AI Operator is an AI-powered sales assistant for online sellers. This Privacy Policy
        explains what information we collect, how we use it, and the choices you have. By
        using AI Operator you agree to the practices described here.
      </p>

      <h2>Data we process</h2>
      <p>To provide the service, AI Operator may process the following information:</p>
      <ul>
        <li>Account data — your name, email, phone number, and login credentials.</li>
        <li>Store data — store name, slug, language, currency, branding.</li>
        <li>Product catalog — product titles, descriptions, prices, images, links.</li>
        <li>
          Platform connections — Instagram and WhatsApp account identifiers, profile
          metadata, and access tokens issued via official OAuth flows.
        </li>
        <li>
          Customer messages — direct messages, comments and order-related text exchanged
          between your customers and your AI bot or operators.
        </li>
        <li>
          Order data — items, quantities, prices, delivery addresses, status history and
          notes captured during a sale.
        </li>
        <li>
          Technical data — request logs, IP address, device and browser identifiers used
          for security and abuse prevention.
        </li>
      </ul>

      <h2>How we use the data</h2>
      <ul>
        <li>To run the AI sales assistant on your connected channels.</li>
        <li>To send and receive messages on your behalf via Meta and WhatsApp APIs.</li>
        <li>To generate replies, suggestions and summaries with our AI provider.</li>
        <li>To display your conversations, leads and orders in the dashboard.</li>
        <li>To provide support, billing and product analytics.</li>
      </ul>

      <h2>Token security</h2>
      <p>
        Platform access tokens (Instagram, WhatsApp) are stored encrypted at rest using
        AES-256-GCM. Tokens are never returned to the browser and are never logged. Only
        a redacted indicator (<code>hasAccessToken: true/false</code>) is exposed to the
        connected dashboard.
      </p>

      <h2>Data sharing</h2>
      <p>
        We do <strong>not</strong> sell personal data to third parties. We share data only
        with the infrastructure providers that operate the service (database hosting,
        application hosting, AI inference, email delivery) under contractual confidentiality.
        We may disclose data when required by law or to prevent abuse.
      </p>

      <h2>Retention</h2>
      <p>
        We retain account, conversation and order data for as long as your account is
        active. You may request deletion at any time — see the{' '}
        <a href="/data-deletion">Data Deletion</a> page.
      </p>

      <h2>Your rights</h2>
      <ul>
        <li>Access and export your data.</li>
        <li>Correct inaccurate information.</li>
        <li>Disconnect any platform integration from the dashboard at any time.</li>
        <li>Request full deletion of your account and associated data.</li>
      </ul>

      <h2>Contact</h2>
      <p>
        For privacy questions or requests, contact{' '}
        <a href="mailto:social@aioperator.social">social@aioperator.social</a>.
      </p>
    </LegalLayout>
  );
}
