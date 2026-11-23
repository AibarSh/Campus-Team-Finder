import { useState } from 'react';

const FACULTY_OPTIONS = [
  'School of Information Technology and Engineering (SITE)',
  'School of Energy and Petroleum Industry (SEPI)',
  'Business School (BS)',
  'International School of Economics (ISE)',
  'Maritime Academy (KMA)',
  'School of Applied Mathematics (SAM)',
  'School of Chemical Engineering (SCE)',
];

const STUDY_YEAR_OPTIONS = [
  '1st year (Bachelor)',
  '2nd year (Bachelor)',
  '3rd year (Bachelor)',
  '4th year (Bachelor)',
  '1st year (Master)',
  '2nd year (Master)',
  'PhD',
];

function FieldError({ children }) {
  if (!children) return null;
  return (
    <p role="alert" className="mt-1.5 text-xs text-red-500">
      {children}
    </p>
  );
}

export default function Step2_AcademicInfo({ data = {}, update, errors = {} }) {
  const [faculty, setFaculty] = useState(data.faculty || '');
  const [studyYear, setStudyYear] = useState(data.studyYear || '');

  const handleFacultyChange = (e) => {
    setFaculty(e.target.value);
    update?.({ faculty: e.target.value });
  };

  const handleSelectYear = (year) => {
    setStudyYear(year);
    update?.({ studyYear: year });
  };

  return (
    <div className="space-y-6">
      <div>
        <label htmlFor="faculty" className="block text-sm font-medium text-slate-700 mb-1.5">
          Faculty / Department <span className="text-red-500">*</span>
        </label>
        <select
          id="faculty"
          value={faculty}
          onChange={handleFacultyChange}
          aria-invalid={!!errors.faculty}
          className={`w-full h-11 px-4 rounded-xl border text-slate-900 text-sm outline-none transition-all bg-white ${
            errors.faculty
              ? 'border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-50'
              : 'border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-50'
          }`}
        >
          <option value="" disabled>
            Select your faculty…
          </option>
          {FACULTY_OPTIONS.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
        <FieldError>{errors.faculty}</FieldError>
      </div>

      <div>
        <div className="block text-sm font-medium text-slate-700 mb-2">
          Study Year <span className="text-red-500">*</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {STUDY_YEAR_OPTIONS.map((year) => (
            <button
              key={year}
              type="button"
              onClick={() => handleSelectYear(year)}
              aria-pressed={studyYear === year}
              className={`h-10 px-4 rounded-xl border text-sm font-medium transition-all text-left ${
                studyYear === year
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : errors.studyYear
                  ? 'border-red-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                  : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              {year}
            </button>
          ))}
        </div>
        <FieldError>{errors.studyYear}</FieldError>
      </div>

      <div className="bg-blue-50 rounded-xl p-4 flex gap-3">
        <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
            clipRule="evenodd"
          />
        </svg>
        <p className="text-sm text-blue-700">
          Your profile is verified against the KBTU student directory. Only current students can use KBTU Connect.
        </p>
      </div>
    </div>
  );
}
