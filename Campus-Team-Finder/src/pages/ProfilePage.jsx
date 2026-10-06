import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { profileApi } from '../services/api';
import { displayName, initials } from '../lib/names';
import { AVAILABILITY_OPTIONS } from '../lib/profileOptions';
import { ErrorBox, Spinner } from '../components/Feedback';

const heading = { fontFamily: 'Outfit, sans-serif' };

const LEVEL_COLORS = {
  beginner: '#64748b',
  intermediate: '#0891b2',
  advanced: '#7c3aed',
  expert: '#059669',
};

const LINK_STYLES = {
  GitHub: { icon: 'GH', bg: '#24292e' },
  LinkedIn: { icon: 'in', bg: '#0077b5' },
  Telegram: { icon: 'TG', bg: '#2aabee' },
};

function Card({ title, children }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-3">
      <h2 className="text-slate-900 font-bold text-sm" style={heading}>
        {title}
      </h2>
      {children}
    </div>
  );
}

function NotSet() {
  return <p className="text-sm text-slate-400">Not set</p>;
}

function Chips({ items, className }) {
  if (items.length === 0) return <NotSet />;
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span key={item} className={`px-4 py-1.5 text-sm font-medium rounded-xl border ${className}`}>
          {item}
        </span>
      ))}
    </div>
  );
}

export default function ProfilePage() {
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    profileApi.getProfile().then(setProfile).catch((err) => setError(err.message));
  }, []);

  if (!profile) {
    return <main className="p-8 bg-slate-50 min-h-screen">{error ? <ErrorBox message={error} /> : <Spinner />}</main>;
  }

  const availability = AVAILABILITY_OPTIONS.find((o) => o.id === profile.availability)?.title;
  const links = [
    profile.githubUrl && { href: profile.githubUrl, label: 'GitHub' },
    profile.linkedinUrl && { href: profile.linkedinUrl, label: 'LinkedIn' },
    profile.telegramHandle && { href: `https://t.me/${profile.telegramHandle.replace(/^@/, '')}`, label: 'Telegram' },
  ].filter(Boolean);

  return (
    <main className="bg-slate-50 min-h-screen p-8">
      <div className="max-w-3xl mx-auto space-y-4">
        {/* Header */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-5">
              <div
                className="w-20 h-20 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center text-2xl font-bold select-none"
                style={heading}
              >
                {initials(profile)}
              </div>
              <div>
                <h1 className="text-slate-900 text-2xl font-bold" style={heading}>
                  {displayName(profile)}
                </h1>
                <p className="text-sm text-slate-500 mt-0.5">
                  {[profile.faculty, profile.studyYear].filter(Boolean).join(' · ') || profile.email}
                </p>
              </div>
            </div>
            <Link
              to="/profile/edit"
              className="flex-shrink-0 px-4 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-sm shadow-blue-200"
            >
              Edit profile
            </Link>
          </div>

          {profile.bio && <p className="text-sm text-slate-600 leading-relaxed">{profile.bio}</p>}
        </div>

        {/* Skills */}
        <Card title="Skills">
          {profile.skills.length === 0 ? (
            <NotSet />
          ) : (
            <div className="flex flex-wrap gap-2">
              {profile.skills.map((s) => {
                const level = s.proficiency?.toLowerCase();
                const color = LEVEL_COLORS[level] || LEVEL_COLORS.beginner;
                return (
                  <div
                    key={s.skill.name}
                    className="flex items-center gap-2 pl-3 pr-2 py-1.5 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <span className="text-sm font-medium text-slate-800">{s.skill.name}</span>
                    {level && (
                      <span
                        className="text-xs font-medium px-2 py-0.5 rounded-full capitalize"
                        style={{ color, background: color + '18' }}
                      >
                        {level}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Interests & roles */}
        <Card title="Interests">
          <Chips
            items={profile.interests.map((i) => i.interest.name)}
            className="border-blue-100 bg-blue-50 text-blue-700"
          />
        </Card>
        <Card title="Preferred roles">
          <Chips
            items={profile.preferredRoles.map((r) => r.role.name)}
            className="border-emerald-100 bg-emerald-50 text-emerald-700"
          />
        </Card>

        {/* Availability */}
        <Card title="Weekly availability">
          {availability ? (
            <div className="inline-block px-4 py-2.5 rounded-xl border border-blue-500 bg-blue-50 ring-1 ring-blue-400 text-sm font-semibold text-blue-700">
              {availability}
            </div>
          ) : (
            <NotSet />
          )}
        </Card>

        {/* Links */}
        <Card title="Social & professional links">
          {links.length === 0 ? (
            <NotSet />
          ) : (
            <div className="space-y-2.5">
              {links.map((l) => (
                <a
                  key={l.label}
                  href={l.href}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 group"
                >
                  <span
                    className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                    style={{ background: LINK_STYLES[l.label].bg }}
                  >
                    {LINK_STYLES[l.label].icon}
                  </span>
                  <span className="text-sm font-semibold text-blue-600 group-hover:underline">{l.label}</span>
                </a>
              ))}
            </div>
          )}
        </Card>
      </div>
    </main>
  );
}
