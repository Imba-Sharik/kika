// Boilerplate — replace with lawyer-reviewed text before public payment launch.

export function PrivacyEn() {
  return (
    <article className="prose prose-invert max-w-none [&_h1]:mb-2 [&_h2]:mt-10 [&_h2]:mb-3 [&_h2]:text-2xl [&_h2]:font-bold [&_p]:my-3 [&_p]:leading-relaxed [&_ul]:my-3 [&_li]:my-1">
      <h1 className="text-4xl font-bold text-white">Privacy Policy</h1>
      <p className="text-sm text-white/50">Last updated: April 27, 2026</p>

      <p>
        Yukai (&quot;we&quot;, &quot;us&quot;, &quot;the service&quot;) respects your privacy.
        This document describes what data we collect, how we use it, and what rights you have.
      </p>

      <h2>1. Data we collect</h2>
      <p>When you use Yukai, we process:</p>
      <ul>
        <li><strong>Registration data:</strong> email, username, password (hashed).</li>
        <li>
          <strong>Voice data:</strong> audio of your phrases is sent to speech recognition
          providers (Groq Whisper) for transcription. Audio is not stored on our servers
          after processing.
        </li>
        <li>
          <strong>Conversation text:</strong> your messages and Yukai&apos;s replies are sent
          to a language model (Anthropic Claude) to generate responses. Conversation
          history is not stored on our servers.
        </li>
        <li>
          <strong>Service usage:</strong> number of requests, command types, cost in USD,
          timestamps. Used for billing and product improvement.
        </li>
        <li>
          <strong>Yukai memory (optional):</strong> files in <code>~/yukai-memory/</code> folder
          are stored locally on your computer and not sent to our servers.
        </li>
      </ul>

      <h2>2. How we use data</h2>
      <ul>
        <li>Providing the service — voice chat, dictation, music recognition</li>
        <li>Billing and usage tracking (quotas)</li>
        <li>Security — abuse and fraud detection</li>
        <li>Product improvement — anonymous usage analytics</li>
        <li>Customer support — email / Telegram correspondence</li>
      </ul>

      <h2>3. Third-party services</h2>
      <p>
        To run Yukai we use third-party services. Your data is shared with them only
        to the extent necessary to provide functionality:
      </p>
      <ul>
        <li>
          <strong>Anthropic Claude</strong> — processes your messages with the AI model.{" "}
          <a href="https://www.anthropic.com/privacy" target="_blank" rel="noopener noreferrer" className="text-pink-300 underline">
            Privacy Policy
          </a>
        </li>
        <li>
          <strong>Groq</strong> — speech recognition (STT).{" "}
          <a href="https://groq.com/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-pink-300 underline">
            Privacy Policy
          </a>
        </li>
        <li>
          <strong>ElevenLabs / Fish Audio</strong> — speech synthesis (TTS).
        </li>
        <li>
          <strong>Vercel, Railway, Timeweb</strong> — hosting and infrastructure.
        </li>
      </ul>

      <h2>4. Data retention</h2>
      <p>
        Registration data and usage history are stored while your account is active.
        Request logs are automatically deleted after 90 days. After account deletion,
        all your data is removed within 30 days.
      </p>

      <h2>5. Your rights</h2>
      <ul>
        <li>Request a copy of your data</li>
        <li>Request account deletion and removal of all data</li>
        <li>Withdraw consent to processing (results in account deletion)</li>
        <li>File a complaint with a supervisory authority</li>
      </ul>
      <p>
        For requests: <a href="mailto:sharinigor1@gmail.com" className="text-pink-300 underline">sharinigor1@gmail.com</a>
      </p>

      <h2>6. Cookies</h2>
      <p>
        We use a minimal set of cookies for authentication (NextAuth session) and
        remembering language preferences. No analytics or advertising trackers.
      </p>

      <h2>7. Policy changes</h2>
      <p>
        We may update this policy. Material changes are announced by email and on our
        Telegram channel 14 days before they take effect.
      </p>

      <h2>8. Contact</h2>
      <p>
        Email: <a href="mailto:sharinigor1@gmail.com" className="text-pink-300 underline">sharinigor1@gmail.com</a>
        <br />
        Telegram: <a href="https://t.me/+O_SNPGI-CGI0ZjUy" target="_blank" rel="noopener noreferrer" className="text-pink-300 underline">developer channel</a>
      </p>
    </article>
  )
}
