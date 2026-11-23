// src/lib/profilePhoto.js
// Shared rules for the profile photo, plus the (not yet implemented) backend call.

export const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const PHOTO_MAX_MB = 2;
export const PHOTO_MAX_BYTES = PHOTO_MAX_MB * 1024 * 1024;

/**
 * Called by OnboardingWizard when the profile is submitted.
 *   file    - a File the person picked, or null
 *   removed - true if the person removed an existing photo
 *
 * TODO(backend): storage isn't built yet, so this does nothing for now. When the endpoint
 * exists, send the file as multipart form data, for example:
 *
 *   if (file) {
 *     const body = new FormData();
 *     body.append('photo', file);
 *     await profileApi.uploadPhoto(body);      // POST /api/profile/photo, field name "photo"
 *   } else if (removed) {
 *     await profileApi.deletePhoto();          // DELETE /api/profile/photo
 *   }
 */
// eslint-disable-next-line no-unused-vars
export async function saveProfilePhoto({ file, removed }) {
  return null;
}
