import { useRef, useState } from 'react';
import { initials } from '../../lib/names';
import { PHOTO_TYPES, PHOTO_MAX_BYTES, PHOTO_MAX_MB } from '../../lib/profilePhoto';

const baseInput =
  'w-full h-10 px-4 rounded-xl border text-slate-900 text-sm placeholder-slate-400 outline-none transition-all';
const okInput = 'border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-50';
const badInput = 'border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-50';

function FieldError({ children }) {
  if (!children) return null;
  return (
    <p role="alert" className="mt-1.5 text-xs text-red-500">
      {children}
    </p>
  );
}

export default function Step1_PersonalInfo({ data = {}, update, errors = {} }) {
  const [firstName, setFirstName] = useState(data.firstName || '');
  const [lastName, setLastName] = useState(data.lastName || '');
  const [bio, setBio] = useState(data.bio || '');
  // data.photoUrl is the already-saved photo (edit mode, once the backend returns one)
  const [photoPreview, setPhotoPreview] = useState(data.photoPreview || data.photoUrl || '');
  const [photoError, setPhotoError] = useState('');
  const fileRef = useRef(null);

  const handleFirstNameChange = (e) => {
    setFirstName(e.target.value);
    update?.({ firstName: e.target.value });
  };

  const handleLastNameChange = (e) => {
    setLastName(e.target.value);
    update?.({ lastName: e.target.value });
  };

  const handleBioChange = (e) => {
    const val = e.target.value.slice(0, 200);
    setBio(val);
    update?.({ bio: val });
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow picking the same file again
    if (!file) return;

    if (!PHOTO_TYPES.includes(file.type)) {
      setPhotoError('Please use a JPG, PNG or WebP image.');
      return;
    }
    if (file.size > PHOTO_MAX_BYTES) {
      setPhotoError(`The image must be smaller than ${PHOTO_MAX_MB} MB.`);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setPhotoError('');
      setPhotoPreview(reader.result);
      update?.({ photoFile: file, photoPreview: reader.result, photoRemoved: false });
    };
    reader.onerror = () => setPhotoError('Could not read that image. Try another one.');
    reader.readAsDataURL(file);
  };

  const removePhoto = () => {
    setPhotoError('');
    setPhotoPreview('');
    update?.({ photoFile: null, photoPreview: '', photoRemoved: true });
  };

  return (
    <div className="space-y-6">
      {/* Photo */}
      <div className="flex items-center gap-6">
        <div
          className="w-20 h-20 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-600 text-2xl font-bold select-none flex-shrink-0 overflow-hidden"
          style={{ fontFamily: 'Outfit, sans-serif' }}
        >
          {photoPreview ? (
            <img src={photoPreview} alt="Your profile" className="w-full h-full object-cover" />
          ) : (
            initials({ firstName, lastName }) || '?'
          )}
        </div>
        <div className="min-w-0">
          <div className="text-sm font-medium text-slate-700 mb-2">Profile photo</div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="px-4 py-2 border border-slate-200 bg-white text-slate-700 text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors"
            >
              {photoPreview ? 'Change photo' : 'Upload photo'}
            </button>
            {photoPreview && (
              <button
                type="button"
                onClick={removePhoto}
                className="px-3 py-2 text-slate-500 text-sm font-medium rounded-xl hover:text-red-500 hover:bg-slate-50 transition-colors"
              >
                Remove
              </button>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Optional. JPG, PNG or WebP, up to {PHOTO_MAX_MB} MB. Without one, your initials are shown.
          </p>
          <FieldError>{photoError}</FieldError>
          <input
            ref={fileRef}
            type="file"
            accept={PHOTO_TYPES.join(',')}
            onChange={handlePhotoChange}
            className="hidden"
            aria-label="Upload profile photo"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="firstName" className="block text-sm font-medium text-slate-700 mb-1.5">
            First Name <span className="text-red-500">*</span>
          </label>
          <input
            id="firstName"
            value={firstName}
            onChange={handleFirstNameChange}
            placeholder=""
            aria-invalid={!!errors.firstName}
            className={`${baseInput} ${errors.firstName ? badInput : okInput}`}
          />
          <FieldError>{errors.firstName}</FieldError>
        </div>
        <div>
          <label htmlFor="lastName" className="block text-sm font-medium text-slate-700 mb-1.5">
            Last Name <span className="text-red-500">*</span>
          </label>
          <input
            id="lastName"
            value={lastName}
            onChange={handleLastNameChange}
            placeholder=""
            aria-invalid={!!errors.lastName}
            className={`${baseInput} ${errors.lastName ? badInput : okInput}`}
          />
          <FieldError>{errors.lastName}</FieldError>
        </div>
      </div>

      <div>
        <label htmlFor="bio" className="block text-sm font-medium text-slate-700 mb-1.5">
          Short Bio
        </label>
        <textarea
          id="bio"
          value={bio}
          onChange={handleBioChange}
          placeholder="I'm a 3rd-year CS student passionate about AI and building products that matter…"
          rows={3}
          className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 text-sm placeholder-slate-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all resize-none"
        />
        <div className="flex justify-end mt-1">
          <span className="text-xs text-slate-400">{bio.length}/200</span>
        </div>
      </div>
    </div>
  );
}
