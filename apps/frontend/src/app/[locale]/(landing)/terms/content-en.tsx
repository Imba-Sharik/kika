// Boilerplate — replace with lawyer-reviewed text for the relevant jurisdiction
// (RU sole-prop / Stripe LLC / Estonia OÜ etc.) before scaling beyond friends-and-family.
// Crypto-payment refund clause was reviewed against industry practice (NOWPayments,
// Stripe Crypto, BitPay docs) — non-refundable is standard given blockchain finality.

export function TermsEn() {
  return (
    <article className="prose prose-invert max-w-none [&_h1]:mb-2 [&_h2]:mt-10 [&_h2]:mb-3 [&_h2]:text-2xl [&_h2]:font-bold [&_p]:my-3 [&_p]:leading-relaxed [&_ul]:my-3 [&_li]:my-1">
      <h1 className="text-4xl font-bold text-white">Terms of Service</h1>
      <p className="text-sm text-white/50">Last updated: April 29, 2026</p>

      <p>
        By using Yukai, you agree to these terms. If you do not agree, please do not
        use the service.
      </p>

      <h2>1. About the service</h2>
      <p>
        Yukai is a desktop AI application for voice conversation, dictation, music
        recognition, and other helper tasks. The service operates through cloud AI
        providers (Anthropic, Groq, ElevenLabs).
      </p>

      <h2>2. Account</h2>
      <ul>
        <li>AI features require registration (email + password).</li>
        <li>You are responsible for your password security.</li>
        <li>You must be 18 years old or have parental consent.</li>
        <li>One account per individual. Sharing accounts is prohibited.</li>
      </ul>

      <h2>3. Subscription and payment</h2>
      <p>
        After the 7-day trial, an active subscription is required to continue using AI
        features. The current price is $19/month, billed monthly until cancellation.
        Pricing may change with prior notice; existing subscribers keep their current
        rate until renewal.
      </p>
      <ul>
        <li>
          Payments are processed by{" "}
          <a href="https://nowpayments.io" target="_blank" rel="noopener noreferrer" className="text-pink-300 underline">
            NOWPayments
          </a>
          {" "}in cryptocurrency (USDT TRC-20 and others). Card payments are coming soon.
        </li>
        <li>Subscriptions do <strong>not</strong> auto-renew with crypto — you receive
          a payment link before each billing cycle.</li>
        <li>You can cancel anytime by simply not renewing — no action needed.</li>
        <li>Access remains until the end of the paid period.</li>
      </ul>

      <h2>4. Refunds</h2>
      <p>
        <strong>Cryptocurrency payments are non-refundable.</strong> Once a USDT/crypto
        transaction is confirmed on the blockchain, it cannot be reversed by us or the
        payment processor — this is a fundamental property of how cryptocurrency works.
      </p>
      <p>
        We will <strong>not</strong> issue refunds for crypto payments except in two cases:
      </p>
      <ul>
        <li><strong>Service outage exceeding 48 hours</strong> within a paid period —
          we may extend your subscription accordingly at our discretion.</li>
        <li><strong>Accidental double-payment</strong> caused by a bug on our side —
          please email us within 7 days with the transaction hash.</li>
      </ul>
      <p>
        Card-payment refunds (when card is enabled) follow standard 7-day refund policy:
        contact{" "}
        <a href="mailto:sharinigor1@gmail.com" className="text-pink-300 underline">
          sharinigor1@gmail.com
        </a>
        {" "}within 7 days of the first charge if the service didn&apos;t work for you.
      </p>
      <p>
        Before subscribing, the trial gives you 7 days to evaluate the service. We
        recommend testing all features you care about before purchasing.
      </p>

      <h2>5. Prohibited use</h2>
      <ul>
        <li>Using the service for illegal activity</li>
        <li>Generating harmful, threatening, or unethical content</li>
        <li>Attempting to hack or disrupt the service</li>
        <li>Reverse-engineering the protocol or app</li>
        <li>Reselling access or AI responses to third parties</li>
        <li>Using the service as a proxy for your own AI application
          (against rate-limit rules)</li>
      </ul>

      <h2>6. AI content disclaimer</h2>
      <p>
        Yukai generates responses via AI models. These may contain errors, inaccuracies,
        or inappropriate phrasing. <strong>Do not rely on Yukai for medical, legal,
        financial, or other professional advice.</strong>
      </p>
      <p>
        Yukai is not liable for decisions made based on AI responses.
      </p>

      <h2>7. Intellectual property</h2>
      <p>
        Yukai&apos;s code, design, voice, and character images are our intellectual
        property. You receive a license to use the service, not ownership.
      </p>

      <h2>8. Limitation of liability</h2>
      <p>
        Yukai is provided &quot;as is&quot;. We do not guarantee uptime or absolute
        accuracy of AI responses. To the maximum extent permitted by law, we are not
        liable for indirect damages.
      </p>

      <h2>9. Termination</h2>
      <p>
        We may suspend accounts for violating these terms. You can delete your account
        anytime via settings or by emailing us.
      </p>

      <h2>10. Changes</h2>
      <p>
        We may update these terms. Material changes will be communicated by email at
        least 14 days in advance.
      </p>

      <h2>11. Contact</h2>
      <p>
        Email: <a href="mailto:sharinigor1@gmail.com" className="text-pink-300 underline">sharinigor1@gmail.com</a>
        <br />
        Telegram: <a href="https://t.me/+O_SNPGI-CGI0ZjUy" target="_blank" rel="noopener noreferrer" className="text-pink-300 underline">developer channel</a>
      </p>
    </article>
  )
}
