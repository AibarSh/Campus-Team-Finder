// Shape must match OnboardingWizard's formData
export function profileToFormData(profile) {
  return {
    firstName: profile.firstName || '',
    lastName: profile.lastName || '',
    bio: profile.bio || '',
    faculty: profile.faculty || '',
    studyYear: profile.studyYear || '',
    skills: profile.skills.map((s) => ({ id: s.skill.id, name: s.skill.name, level: s.proficiency })),
    interests: profile.interests.map((i) => i.interest.id),
    roles: profile.preferredRoles.map((r) => r.role.id),
    availability: profile.availability || '',
    links: {
      github: profile.githubUrl || '',
      linkedin: profile.linkedinUrl || '',
      telegram: profile.telegramHandle || '',
    },
  };
}
