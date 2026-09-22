import { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import Step1_PersonalInfo from './Step1_PersonalInfo';
import Step2_AcademicInfo from './Step2_AcademicInfo';
import Step3_Skills from './Step3_Skills';
import Step4_Interests from './Step4_Interests';
import Step5_Availability from './Step5_Availability';
import { profileApi } from '../../services/api';
import { UserContext } from '../../context/UserContext';

const STEPS = [
  { id: 1, title: 'Personal Info', description: 'Tell us a bit about yourself so teammates can get to know you.' },
  { id: 2, title: 'Academic Info', description: 'Your study details help match you with relevant campus projects.' },
  { id: 3, title: 'Skills & Expertise', description: 'List your skills along with your proficiency level.' },
  { id: 4, title: 'Interests & Roles', description: 'Select topics you care about and roles you prefer.' },
  { id: 5, title: 'Availability & Links', description: 'Let teams know your weekly hours and where to find your work.' },
];

export default function OnboardingWizard() {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    bio: '',
    photoPreview: null,
    faculty: '',
    studyYear: '',
    skills: [],
    interests: [],
    roles: [],
    availability: '',
    links: { github: '', linkedin: '', telegram: '' },
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const { refreshUser } = useContext(UserContext);
  const navigate = useNavigate();

  // Helper to merge data from step components
  const updateFormData = (newData) => {
    setFormData((prev) => ({
      ...prev,
      ...newData,
    }));
  };

  // Step navigation handlers
  const handleNext = () => {
    setError('');
    if (currentStep < STEPS.length) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    setError('');
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  // Final submit handler — flow 2 integration
  const handleComplete = async () => {
    setSubmitting(true);
    setError('');

    try {
      // 1. Partial profile update (Steps 1, 2, 5)
      await profileApi.updateProfile({
        firstName: formData.firstName,
        lastName: formData.lastName,
        bio: formData.bio,
        faculty: formData.faculty,
        studyYear: formData.studyYear,
        availability: formData.availability,
        githubUrl: formData.links?.github,
        linkedinUrl: formData.links?.linkedin,
        telegramUrl: formData.links?.telegram,
      });

      // 2. Skill set replacement (Step 3)
      if (formData.skills?.length > 0) {
        await profileApi.updateSkills(
          formData.skills.map((s) => ({
            skillId: s.id || s.name,
            proficiency: s.level || 'Intermediate',
          }))
        );
      }

      // 3. Interest set replacement (Step 4)
      if (formData.interests?.length > 0) {
        await profileApi.updateInterests(formData.interests);
      }

      // 4. Preferred roles replacement (Step 4)
      if (formData.roles?.length > 0) {
        await profileApi.updatePreferredRoles(formData.roles);
      }

      // 5. Mark profile complete flag on backend
      await profileApi.completeProfile();

      // 6. Refresh user session and enter Dashboard
      await refreshUser();
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Failed to submit profile. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Switch statement rendering current active step
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return <Step1_PersonalInfo data={formData} update={updateFormData} />;
      case 2:
        return <Step2_AcademicInfo data={formData} update={updateFormData} />;
      case 3:
        return (
          <Step3_Skills
            data={formData.skills}
            update={(updatedSkills) => updateFormData({ skills: updatedSkills })}
          />
        );
      case 4:
        return <Step4_Interests data={formData} update={updateFormData} />;
      case 5:
        return <Step5_Availability data={formData} update={updateFormData} />;
      default:
        return null;
    }
  };

  const activeStepMeta = STEPS[currentStep - 1];
  const progressPercent = (currentStep / STEPS.length) * 100;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-between p-4 sm:p-6 lg:p-8">
      <div className="max-w-3xl w-full mx-auto space-y-8 my-auto">
        
        {/* Top Header & Branding */}
        <div className="flex items-center justify-between border-b border-gray-200 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 text-white rounded-2xl font-black flex items-center justify-center text-lg">
              K
            </div>
            <div>
              <h1 className="text-lg font-extrabold text-gray-900">KBTU Connect</h1>
              <p className="text-xs text-gray-400">Profile Setup</p>
            </div>
          </div>
          <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-xl">
            Step {currentStep} of {STEPS.length}
          </span>
        </div>

        {/* Step Progress Bar */}
        <div className="space-y-2">
          <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
            <div
              className="bg-blue-600 h-full rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-gray-400 font-medium px-0.5">
            {STEPS.map((step) => (
              <span
                key={step.id}
                className={step.id <= currentStep ? 'text-blue-600 font-bold' : ''}
              >
                {step.id}. {step.title}
              </span>
            ))}
          </div>
        </div>

        {/* Step Card Container */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 sm:p-8 space-y-6">
          
          {/* Step Header */}
          <div className="space-y-1">
            <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900">
              {activeStepMeta.title}
            </h2>
            <p className="text-xs sm:text-sm text-gray-500">
              {activeStepMeta.description}
            </p>
          </div>

          {/* Error Message Alert */}
          {error && (
            <div className="p-4 rounded-2xl bg-red-50 border border-red-100 text-red-600 text-xs font-medium">
              {error}
            </div>
          )}

          {/* Active Step Content */}
          <div className="pt-2">{renderStepContent()}</div>

          {/* Bottom Action Bar */}
          <div className="flex items-center justify-between pt-6 border-t border-gray-100">
            <button
              type="button"
              onClick={handleBack}
              disabled={currentStep === 1 || submitting}
              className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition ${
                currentStep === 1 || submitting
                  ? 'opacity-0 pointer-events-none'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              ← Back
            </button>

            {currentStep < STEPS.length ? (
              <button
                type="button"
                onClick={handleNext}
                className="px-6 py-2.5 bg-blue-600 text-white font-semibold text-sm rounded-xl hover:bg-blue-700 transition shadow-sm"
              >
                Next →
              </button>
            ) : (
              <button
                type="button"
                onClick={handleComplete}
                disabled={submitting}
                className="px-8 py-2.5 bg-blue-600 text-white font-semibold text-sm rounded-xl hover:bg-blue-700 transition shadow-sm flex items-center gap-2"
              >
                {submitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Complete Profile'
                )}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}