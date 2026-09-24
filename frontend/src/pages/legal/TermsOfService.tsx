/**
 * TermsOfService.tsx - /terms
 *
 * Terms users agree to at registration (see the checkbox on the Register page).
 */

import React from 'react';
import { Link } from 'react-router-dom';
import LegalPage, { LegalSection, CONTACT_URL } from './LegalPage';

const TermsOfService = () => (
  <LegalPage title="Terms and Conditions">
    <p>
      These terms apply when you use PlanPal. By creating an account you agree to them.
      If you do not agree, please do not use PlanPal.
    </p>

    <LegalSection heading="Your account">
      <ul className="list-disc pl-5 space-y-1">
        <li>You must give accurate information and be at least 13 years old.</li>
        <li>You are responsible for keeping your password secret and for what happens under your account.</li>
        <li>One person per account. Do not impersonate other people.</li>
      </ul>
    </LegalSection>

    <LegalSection heading="Events you create">
      <ul className="list-disc pl-5 space-y-1">
        <li>You are responsible for the events you post and for running them as described.</li>
        <li>Event details (time, place, price, capacity) must be accurate. If something changes, update the event; participants are notified.</li>
        <li>If you cancel, delete the event so participants are notified.</li>
        <li>
          PlanPal does not process payments. Any price shown is set by the organizer, and any payment
          is arranged directly between organizer and participant.
        </li>
      </ul>
    </LegalSection>

    <LegalSection heading="Acceptable use">
      <p>Do not use PlanPal to:</p>
      <ul className="list-disc pl-5 space-y-1">
        <li>post illegal, harmful, hateful, misleading or sexually explicit content;</li>
        <li>harass other users or collect their information;</li>
        <li>send spam or create fake events or accounts;</li>
        <li>try to break, overload, or get around the security of the service.</li>
      </ul>
      <p>We may remove content or suspend accounts that break these rules.</p>
    </LegalSection>

    <LegalSection heading="Attending events">
      <p>
        Events are organized by users, not by PlanPal. We do not check events or organizers and are
        not responsible for what happens at an event. Use your own judgement, especially when meeting
        people you don't know.
      </p>
    </LegalSection>

    <LegalSection heading="Your content">
      <p>
        You keep ownership of what you post. You allow PlanPal to store and display it so the service
        works (for example, showing your event to other users).
      </p>
    </LegalSection>

    <LegalSection heading="Service availability">
      <p>
        PlanPal is provided "as is". We try to keep it running and your data safe, but we can't
        promise it will always be available or error-free, and we may change or stop features.
      </p>
    </LegalSection>

    <LegalSection heading="Privacy">
      <p>
        How we handle your information is described in the{' '}
        <Link to="/privacy" className="text-blue-600 dark:text-blue-400 hover:underline">Privacy Policy</Link>.
      </p>
    </LegalSection>

    <LegalSection heading="Changes">
      <p>If we change these terms, we will update the date at the top of this page.</p>
    </LegalSection>

    <LegalSection heading="Contact">
      <p>
        Questions about these terms:{' '}
        <a href={CONTACT_URL} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">
          open an issue on the PlanPal repository
        </a>.
      </p>
    </LegalSection>
  </LegalPage>
);

export default TermsOfService;
