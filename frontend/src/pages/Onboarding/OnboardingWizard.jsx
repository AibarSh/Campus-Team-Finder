import { useState, useContext, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Step1_PersonalInfo from './Step1_PersonalInfo';
import Step2_AcademicInfo from './Step2_AcademicInfo';
import Step3_Skills from './Step3_Skills';
import Step4_Interests from './Step4_Interests';
import Step5_Availability from './Step5_Availability';
import { profileApi } from '../../services/api';
import { UserContext } from '../../context/UserContext';
import { profileToFormData } from '../../lib/profileForm';
import { saveProfilePhoto } from '../../lib/profilePhoto';
import { Spinner } from '../../components/Feedback';

const heading = { fontFamily: 'Outfit, sans-serif' };

const STEPS = [
  { title: 'Personal Info', desc: 'Tell us about yourself' },
  { title: 'Academic Info', desc: 'Your university details' },
  { title: 'Skills', desc: 'What can you build?' },
  { title: 'Interests & Roles', desc: 'What do you want to work on?' },
  { title: 'Availability & Links', desc: 'How teams can reach you' },
];

export const MIN_SKILLS = 2;

// Required fields per step. Returns { fieldName: message }; empty object means the step is valid.
function validateStep(step, d, minSkills) {
  const e = {};
  if (step === 0) {
    if (!d.firstName?.trim()) e.firstName = 'First name is required';
    if (!d.lastName?.trim()) e.lastName = 'Last name is required';
  } else if (step === 1) {
    if (!d.faculty) e.faculty = 'Select your faculty';
    if (!d.studyYear) e.studyYear = 'Select your study year';
  } else if (step === 2) {
    if (d.skills.length < minSkills) e.skills = `Add at least ${minSkills} skills`;
  } else if (step === 4) {
    if (!d.availability) e.availability = 'Select your weekly availability';
  }
  return e;
}

function ErrorAlert({ children }) {
  return (
    <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-xs font-medium">{children}</div>
  );
}

export default function OnboardingWizard({ mode = 'create' }) {
  const isEdit = mode === 'edit';
  const minSkills = isEdit ? 0 : MIN_SKILLS;
  const [loadingProfile, setLoadingProfile] = useState(isEdit);
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    bio: '',
    photoFile: null,
    photoPreview: '',
    photoRemoved: false,
    faculty: '',
    studyYear: '',
    skills: [],
    interests: [],
    roles: [],
    customInterests: [],
    customRoles: [],
    availability: '',
    links: { github: '', linkedin: '', telegram: '' },
  });
  const [attempted, setAttempted] = useState(false); // person pressed Continue on this step
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [loadFailed, setLoadFailed] = useState(false);
  const [done, setDone] = useState(false);
  const redirectTimer = useRef(null);

  const { refreshUser } = useContext(UserContext);
  const navigate = useNavigate();

  // Step components read their initial state once on mount, so render them only after this loads
  useEffect(() => {
    if (!isEdit) return;
    profileApi
      .getProfile()
      .then((profile) => setFormData((prev) => ({ ...prev, ...profileToFormData(profile) })))
      .catch((err) => {
        setError(err.message);
        setLoadFailed(true);
      })
      .finally(() => setLoadingProfile(false));
  }, [isEdit]);

  useEffect(() => () => clearTimeout(redirectTimer.current), []);

  // Steps send only the fields they changed
  const updateFormData = (patch) => setFormData((prev) => ({ ...prev, ...patch }));

  // Errors are only shown after the first Continue press, then update live as the person fixes them
  const errors = attempted ? validateStep(step, formData, minSkills) : {};

  const handleNext = () => {
    setError('');
    if (Object.keys(validateStep(step, formData, minSkills)).length > 0) {
      setAttempted(true);
      return;
    }
    setAttempted(false);
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const handleBack = () => {
    setError('');
    setAttempted(false);
    if (step === 0) {
      // First step: leave the wizard (back to login for new users, back to the profile when editing)
      navigate(isEdit ? '/profile' : '/login');
      return;
    }
    setStep((s) => s - 1);
  };

  const handleComplete = async () => {
    setError('');

    // Make sure every step is valid (the person could have skipped around while editing)
    const invalid = STEPS.findIndex((_, i) => Object.keys(validateStep(i, formData, minSkills)).length > 0);
    if (invalid !== -1) {
      setStep(invalid);
      setAttempted(true);
      return;
    }

    setSubmitting(true);
    try {
      await profileApi.updateProfile({
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        bio: formData.bio || null,
        faculty: formData.faculty,
        studyYear: formData.studyYear,
        availability: formData.availability,
        githubUrl: formData.links?.github || null,
        linkedinUrl: formData.links?.linkedin || null,
        telegramHandle: formData.links?.telegram || null,
      });

      // Photo: no-op until the backend endpoint exists (see lib/profilePhoto.js)
      await saveProfilePhoto({ file: formData.photoFile, removed: formData.photoRemoved });

      await profileApi.updateSkills(
        formData.skills.filter((s) => s.id !== null).map((s) => ({ skillId: s.id, proficiency: s.level })),
        formData.skills.filter((s) => s.id === null).map((s) => ({ name: s.name, proficiency: s.level })),
      );

      // TODO(backend): the second argument carries the free-text entries the person typed in.
      // Until updateInterests / updatePreferredRoles (and the API) accept it, those are ignored.
      await profileApi.updateInterests(formData.interests, formData.customInterests);
      await profileApi.updatePreferredRoles(formData.roles, formData.customRoles);

      if (!isEdit) await profileApi.completeProfile();
      await refreshUser();

      if (isEdit) {
        navigate('/profile');
        return;
      }
      // First-time setup: show the success screen, then go to the dashboard
      setDone(true);
      redirectTimer.current = setTimeout(() => navigate('/dashboard'), 1600);
    } catch (err) {
      setError(err.message || 'Failed to submit profile. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderStepContent = () => {
    switch (step) {
      case 0:
        return <Step1_PersonalInfo data={formData} update={updateFormData} errors={errors} />;
      case 1:
        return <Step2_AcademicInfo data={formData} update={updateFormData} errors={errors} />;
      case 2:
        return (
          <Step3_Skills
            data={formData.skills}
            minSkills={minSkills}
            update={(skills) => updateFormData({ skills })}
            error={errors.skills}
          />
        );
      case 3:
        return <Step4_Interests data={formData} update={updateFormData} />;
      case 4:
        return <Step5_Availability data={formData} update={updateFormData} errors={errors} />;
      default:
        return null;
    }
  };

  if (done) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center px-6">
          <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-200">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-slate-900 text-2xl font-bold mb-2" style={heading}>
            Profile Created!
          </h2>
          <p className="text-slate-500">Taking you to your dashboard…</p>
          <div className="mt-6 flex justify-center gap-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const isLast = step === STEPS.length - 1;
  const blocked = loadingProfile || loadFailed;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sticky header with progress */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm" style={heading}>K</span>
              </div>
              <span className="text-slate-800 font-semibold text-sm" style={heading}>KBTU Connect</span>
              {isEdit && <span className="text-xs text-slate-400">· Edit profile</span>}
            </div>
            <div className="flex items-center gap-4">
              {isEdit && (
                <Link to="/profile" className="text-xs font-semibold text-slate-500 hover:text-slate-700">
                  Cancel
                </Link>
              )}
              <span className="text-xs text-slate-400 font-medium">
                Step {step + 1} of {STEPS.length}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {STEPS.map((s, i) => (
              <div key={s.title} className="flex-1">
                <div
                  className="w-full h-1.5 rounded-full transition-all duration-500"
                  style={{ background: i < step ? '#2563eb' : i === step ? '#93c5fd' : '#e2e8f0' }}
                />
              </div>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-10">
        {/* Step label */}
        <div className="mb-7">
          <div className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-600 text-xs font-semibold px-3 py-1 rounded-full mb-3">
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            {STEPS[step].desc}
          </div>
          <h1 className="text-slate-900 text-2xl font-bold" style={heading}>
            {STEPS[step].title}
          </h1>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 space-y-6">
          {error && !loadFailed && <ErrorAlert>{error}</ErrorAlert>}

          {loadFailed ? (
            <div className="space-y-4">
              <ErrorAlert>{error}</ErrorAlert>
              <Link to="/profile" className="text-xs font-semibold text-slate-500 hover:text-slate-700">
                Cancel
              </Link>
            </div>
          ) : loadingProfile ? (
            <Spinner />
          ) : (
            <>
              {step !== 3 && (
                <p className="text-xs text-slate-400">
                  Fields marked <span className="text-red-500">*</span> are required.
                </p>
              )}
              {renderStepContent()}
            </>
          )}
        </div>

        {/* Nav buttons */}
        <div className="flex items-center justify-between mt-6">
          <button
            type="button"
            onClick={handleBack}
            disabled={submitting}
            className="px-6 py-2.5 border border-slate-200 text-slate-600 text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
            </svg>
            Back
          </button>

          <div className="flex items-center gap-1.5" aria-hidden="true">
            {STEPS.map((s, i) => (
              <div
                key={s.title}
                className="rounded-full transition-all duration-300"
                style={{
                  width: i === step ? '24px' : '6px',
                  height: '6px',
                  background: i === step ? '#2563eb' : i < step ? '#93c5fd' : '#e2e8f0',
                }}
              />
            ))}
          </div>

          {!isLast ? (
            <button
              type="button"
              onClick={handleNext}
              disabled={blocked}
              className="px-6 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-sm shadow-blue-200 flex items-center gap-2 disabled:opacity-50"
            >
              Continue
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleComplete}
              disabled={submitting || blocked}
              className="px-7 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-sm shadow-blue-200 flex items-center gap-2 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  {isEdit ? 'Save changes' : 'Complete Setup'}
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </>
              )}
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
