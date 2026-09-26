import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { profileApi } from '../services/api';
import { displayName, initials } from '../lib/names';
import { AVAILABILITY_OPTIONS } from '../lib/profileOptions';
import { ErrorBox, Spinner } from '../components/Feedback';

function Chips({ items, className = 'bg-blue-50 text-blue-600' }) {
  if (items.length === 0) return <p className="text-sm text-gray-400">Not set</p>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <span key={item} className={`px-3 py-1 text-xs font-medium rounded-lg ${className}`}>
          {item}
        </span>
      ))}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="space-y-2">
      <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{title}</h2>
      {children}
    </div>
  );
}

export default function ProfilePage() {
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    profileApi.getProfile().then(setProfile).catch((err) => setError(err.message));
  }, []);

  if (!profile) return <main className="p-8">{error ? <ErrorBox message={error} /> : <Spinner />}</main>;

  const availability = AVAILABILITY_OPTIONS.find((o) => o.id === profile.availability)?.title;
  const links = [
    profile.githubUrl && { href: profile.githubUrl, label: 'GitHub' },
    profile.linkedinUrl && { href: profile.linkedinUrl, label: 'LinkedIn' },
    profile.telegramHandle && { href: `https://t.me/${profile.telegramHandle.replace(/^@/, '')}`, label: 'Telegram' },
  ].filter(Boolean);

  return (
    <main className="p-8 max-w-3xl">
      <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-2xl">
              {initials(profile)}
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-gray-950">{displayName(profile)}</h1>
              <p className="text-sm text-gray-500">
                {[profile.faculty, profile.studyYear].filter(Boolean).join(' · ') || profile.email}
              </p>
            </div>
          </div>
          <Link
            to="/profile/edit"
            className="px-4 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition"
          >
            Edit profile
          </Link>
        </div>

        {profile.bio && <p className="text-sm text-gray-600 leading-relaxed">{profile.bio}</p>}

        <Section title="Skills">
          <Chips items={profile.skills.map((s) => `${s.skill.name} · ${s.proficiency.toLowerCase()}`)} />
        </Section>
        <Section title="Interests">
          <Chips items={profile.interests.map((i) => i.interest.name)} className="bg-gray-50 border border-gray-200 text-gray-600" />
        </Section>
        <Section title="Preferred roles">
          <Chips items={profile.preferredRoles.map((r) => r.role.name)} className="bg-gray-50 border border-gray-200 text-gray-600" />
        </Section>
        <Section title="Availability">
          <p className="text-sm text-gray-700">{availability || 'Not set'}</p>
        </Section>
        <Section title="Links">
          {links.length === 0 ? (
            <p className="text-sm text-gray-400">Not set</p>
          ) : (
            <div className="flex gap-4">
              {links.map((l) => (
                <a key={l.label} href={l.href} target="_blank" rel="noreferrer" className="text-sm font-semibold text-blue-600 hover:underline">
                  {l.label}
                </a>
              ))}
            </div>
          )}
        </Section>
      </div>
    </main>
  );
}
