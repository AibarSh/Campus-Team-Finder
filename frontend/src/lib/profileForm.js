export function getProfileSkills(profile) {
  return [
    ...profile.skills.map((s) => ({ id: s.skill.id, name: s.skill.name, level: s.proficiency })),
    ...(profile.customSkills ?? []).map((s) => ({ id: null, name: s.name, level: s.proficiency })),
  ];
}

// Shape must match OnboardingWizard's formData
export function profileToFormData(profile) {
  return {
    firstName: profile.firstName || '',
    lastName: profile.lastName || '',
    bio: profile.bio || '',
    faculty: profile.faculty || '',
    studyYear: profile.studyYear || '',
    skills: getProfileSkills(profile),
    interests: profile.interests.map((i) => i.interest.id),
    roles: profile.preferredRoles.map((r) => r.role.id),
    customInterests: (profile.customInterests ?? []).map((i) => i.name),
    customRoles: (profile.customRoles ?? []).map((r) => r.name),
    availability: profile.availability || '',
    links: {
      github: profile.githubUrl || '',
      linkedin: profile.linkedinUrl || '',
      telegram: profile.telegramHandle || '',
    },
  };
}
