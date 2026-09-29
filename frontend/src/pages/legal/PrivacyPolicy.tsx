/**
 * PrivacyPolicy.tsx - /privacy
 *
 * Describes what PlanPal actually stores and does. Keep it in sync with the
 * code: if you add analytics, email, file uploads or new profile fields,
 * update this page.
 */

import React from 'react';
import LegalPage, { LegalSection, CONTACT_URL } from './LegalPage';

const PrivacyPolicy = () => (
  <LegalPage title="Privacy Policy">
    <p>
      This policy explains what information PlanPal collects when you use it, how that
      information is used, and the choices you have. PlanPal is an event planning app: you can
      create events, join events, and receive in-app notifications about them.
    </p>

    <LegalSection heading="Information we collect">
      <ul className="list-disc pl-5 space-y-1">
        <li><strong>Account details:</strong> your name, email address, username and password. Passwords are stored only as a salted bcrypt hash, never in plain text.</li>
        <li><strong>Profile details you choose to add:</strong> bio, profile image URL and interests.</li>
        <li><strong>Events and participation:</strong> events you create (title, description, date and time, venue, city, state, price, capacity, tags) and the events you join, including whether you are "interested" or "going".</li>
        <li><strong>Notifications:</strong> the in-app notifications generated for you and whether you have read them.</li>
        <li><strong>Technical data:</strong> your IP address is used briefly to limit repeated sign-in, sign-up and session-renewal attempts. Our hosting providers may keep standard server logs.</li>
      </ul>
    </LegalSection>

    <LegalSection heading="How we use it">
      <ul className="list-disc pl-5 space-y-1">
        <li>To run your account and sign you in.</li>
        <li>To show events, let you join them, and show organizers who is coming.</li>
        <li>To send in-app notifications (for example when someone joins your event, or an event you joined is updated, cancelled or starts within 24 hours).</li>
        <li>To protect the service from abuse, such as too many login attempts.</li>
      </ul>
      <p>We do not sell your data, show advertising, or use third-party analytics or tracking.</p>
    </LegalSection>

    <LegalSection heading="What other users can see">
      <p>
        Other signed-in users can see your name, username, bio, profile image, interests, and the
        events you create or join. Your email address is never shown to other users.
      </p>
    </LegalSection>

    <LegalSection heading="Cookies and local storage">
      <p>
        PlanPal does not use tracking or advertising cookies. To keep you signed in, your browser
        stores two sign-in tokens in its local storage. Your theme choice (light or dark) is also
        stored there. Logging out removes the tokens from your browser and revokes them on our server. Changing your password signs you out on every other device.
      </p>
    </LegalSection>

    <LegalSection heading="Where your data is stored">
      <p>
        Data is stored in a PostgreSQL database hosted by Supabase. The app itself is hosted on
        Vercel (website) and Render (API). All traffic between your browser and PlanPal is encrypted
        with HTTPS.
      </p>
    </LegalSection>

    <LegalSection heading="How long we keep it">
      <p>
        We keep your account and events until you ask us to delete them. Past events stay visible
        so you can find them again. Revoked sign-in tokens are deleted automatically once they expire.
      </p>
    </LegalSection>

    <LegalSection heading="Your choices">
      <ul className="list-disc pl-5 space-y-1">
        <li>You can view and edit your profile at any time on the Profile page.</li>
        <li>You can leave events you joined and delete events you created, and delete your notifications.</li>
        <li>
          To get a copy of your data or have your account deleted, contact us using the link below.
        </li>
      </ul>
    </LegalSection>

    <LegalSection heading="Children">
      <p>PlanPal is not intended for children under 13, and we do not knowingly collect their information.</p>
    </LegalSection>

    <LegalSection heading="Changes to this policy">
      <p>If we change this policy, we will update the date at the top of this page.</p>
    </LegalSection>

    <LegalSection heading="Contact">
      <p>
        Questions or requests about your data:{' '}
        <a href={CONTACT_URL} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">
          open an issue on the PlanPal repository
        </a>.
      </p>
    </LegalSection>
  </LegalPage>
);

export default PrivacyPolicy;
