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

export default function Step2_AcademicInfo({ data = {}, update }) {
  const [faculty, setFaculty] = useState(data.faculty || '');
  const [studyYear, setStudyYear] = useState(data.studyYear || '');

  const handleFacultyChange = (e) => {
    const val = e.target.value;
    setFaculty(val);
    if (update) update({ ...data, faculty: val, studyYear });
  };

  const handleSelectYear = (year) => {
    setStudyYear(year);
    if (update) update({ ...data, faculty, studyYear: year });
  };

  return (
    <div className="space-y-8">
      {/* Faculty / Department Dropdown */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-900">
          Faculty / Department
        </label>
        <div className="relative">
          <select
            value={faculty}
            onChange={handleFacultyChange}
            className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 text-sm outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 bg-white appearance-none text-gray-800 transition cursor-pointer"
          >
            <option value="" disabled>
              Select your faculty...
            </option>
            {FACULTY_OPTIONS.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
            <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
              <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Study Year Grid */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-900">Study Year</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {STUDY_YEAR_OPTIONS.map((year) => {
            const isSelected = studyYear === year;
            return (
              <button
                key={year}
                type="button"
                onClick={() => handleSelectYear(year)}
                className={`px-5 py-3.5 rounded-2xl border text-sm font-medium text-left transition-all ${
                  isSelected
                    ? 'border-2 border-blue-600 bg-blue-50/40 text-blue-900'
                    : 'border-gray-200 text-gray-700 hover:border-gray-300 bg-white'
                }`}
              >
                {year}
              </button>
            );
          })}
        </div>
      </div>

      {/* Verification Notice Banner */}
      <div className="flex items-start gap-3 p-4 bg-blue-50/70 border border-blue-100 rounded-2xl text-blue-800 text-sm leading-relaxed">
        <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 font-bold text-xs mt-0.5">
          i
        </div>
        <p>
          Your profile is verified against the KBTU student directory. Only current students can use KBTU Connect.
        </p>
      </div>
    </div>
  );
}