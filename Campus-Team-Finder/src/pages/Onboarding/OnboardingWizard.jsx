import { useState } from 'react';
import Header from '../../components/Header';
import Step1_PersonalInfo from './Step1_PersonalInfo';
import Step2_AcademicInfo from './Step2_AcademicInfo';
import Step3_Skills from './Step3_Skills';
import Step4_Interests from './Step4_Interests';
import Step5_Availability from './Step5_Availability';

function OnboardingWizard() {
  const [step, setStep] = useState(1);
  const [userData, setUserData] = useState({
    personalInfo: {},
    academicInfo: {},
    skills: [],
    interests: [],
    availability: null,
  });

  const nextStep = () => setStep((prev) => Math.min(prev + 1, 5));
  const prevStep = () => setStep((prev) => Math.max(prev - 1, 1));

  const renderStep = () => {
    switch (step) {
      case 1: return <Step1_PersonalInfo data={userData.personalInfo} update={(data) => setUserData({ ...userData, personalInfo: data })} />;
      case 2: return <Step2_AcademicInfo data={userData.academicInfo} update={(data) => setUserData({ ...userData, academicInfo: data })} />;
      case 3: return <Step3_Skills data={userData.skills} update={(data) => setUserData({ ...userData, skills: data })} />;
      case 4: return <Step4_Interests data={userData.interests} update={(data) => setUserData({ ...userData, interests: data })} />;
      case 5: return <Step5_Availability data={userData.availability} update={(data) => setUserData({ ...userData, availability: data })} />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header showProgress progressStep={step} />

      <main className="flex-grow flex flex-col items-center justify-center p-8">
        <div className="max-w-4xl w-full flex flex-col items-center space-y-12">
          {/* Main Content Area */}
          <div className="text-center space-y-3">
             <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-semibold border border-blue-100">
                <i className="fi fi-rs-user"></i> Tell us about yourself
             </div>
             <h1 className="text-4xl font-extrabold text-gray-950">Personal Info</h1>
          </div>

          <div className="bg-white p-12 rounded-2xl border border-gray-100 shadow-xl shadow-gray-100 w-full space-y-8">
            {renderStep()}
          </div>

          {/* Persistent Footer Buttons from design */}
          <div className="w-full flex items-center justify-between mt-16 pt-8 border-t border-gray-100">
            {step > 1 ? (
              <button onClick={prevStep} className="flex items-center gap-2 px-6 py-3 border border-gray-200 rounded-lg text-lg font-medium text-gray-700 hover:bg-gray-100">
                 <i className="fi fi-rs-arrow-left"></i> Back
              </button>
            ) : <div />} {/* Empty div to keep alignment */}

            {/* Pagination dots from image_1.png */}
            <div className="flex gap-2">
                {[1,2,3,4,5].map(i => (
                    <div key={i} className={`w-10 h-1.5 rounded-full ${i === step ? 'bg-blue-600' : 'bg-gray-200'}`} />
                ))}
            </div>

            <button onClick={nextStep} className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg text-lg font-medium hover:bg-blue-700">
              Continue <i className="fi fi-rs-arrow-right"></i>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default OnboardingWizard;