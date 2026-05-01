import LegalLayout from './LegalLayout.jsx';

export default function DataDeletionPage() {
  return (
    <LegalLayout title="Data Deletion Instructions">
      <p data-testid="data-deletion-intro">
        AI Operator respects your right to control your data. This page explains how to
        disconnect a platform integration and how to request full deletion of your
        AI Operator data, including any data we received from Meta / Facebook / Instagram.
      </p>

      <h2>Self-service: disconnect Instagram in your dashboard</h2>
      <p>You can revoke AI Operator's access to your Instagram account at any time from your dashboard:</p>
      <ol data-testid="data-deletion-steps">
        <li>Sign in to your AI Operator panel.</li>
        <li>Open <strong>Settings → Integrations</strong>.</li>
        <li>Find your connected Instagram account and click <strong>Disconnect</strong>.</li>
        <li>For full account and data deletion, email{' '}
          <a href="mailto:social@aioperator.social">social@aioperator.social</a>.
        </li>
      </ol>
      <p>
        Once disconnected, AI Operator stops receiving webhook events from that
        Instagram account, removes the encrypted access token, and marks the connection
        as disabled. This change takes effect immediately.
      </p>

      <h2>Full data deletion request</h2>
      <p>
        To request full deletion of your AI Operator account and all related data
        (including Instagram / WhatsApp connection metadata, conversations, leads and
        orders), email <a href="mailto:social@aioperator.social">social@aioperator.social</a>{' '}
        from the address registered on your account with the subject line{' '}
        <strong>"Data Deletion Request"</strong>.
      </p>
      <p>What gets deleted after a confirmed request:</p>
      <ul>
        <li>Platform connections (Instagram, WhatsApp) and their encrypted tokens.</li>
        <li>Stored conversations and messages from connected channels.</li>
        <li>Leads, orders and customer profiles tied to your account.</li>
        <li>Bot training data, products and store metadata.</li>
        <li>Account profile, login credentials and billing identifiers.</li>
      </ul>
      <p>
        We will confirm the request, verify your identity (so we don't act on a request
        from someone else), and complete deletion within a reasonable period —
        typically up to 30 days. Some records may be retained where required by law
        (for example, financial bookkeeping) and will be securely deleted at the end of
        the retention period.
      </p>

      <h2>Meta / Facebook / Instagram users</h2>
      <p>
        If you previously authorized AI Operator on Instagram and want Meta to remove
        the app authorization on its side too, you can also revoke access from your
        Instagram account settings: <em>Settings → Apps and Websites → Active</em> →
        remove <strong>AI Operator</strong>.
      </p>
    </LegalLayout>
  );
}
