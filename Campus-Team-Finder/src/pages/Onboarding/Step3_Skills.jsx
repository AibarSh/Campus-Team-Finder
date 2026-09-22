import { useState } from 'react';

const POPULAR_SKILLS = [
  'JavaScript', 'TypeScript', 'Python', 'React', 'Node.js', 'Java',
  'C++', 'Kotlin', 'Figma', 'SQL', 'MongoDB', 'Docker',
  'TensorFlow', 'Flutter',
];

export default function Step3_Skills({ data = [], update }) {
  const [skills, setSkills] = useState(data.skills || []);
  const [skillInput, setSkillInput] = useState('');
  const [level, setLevel] = useState('Intermediate');

  const addSkill = (skillName) => {
    const nameToAdd = skillName || skillInput.trim();
    if (!nameToAdd) return;
    if (skills.some((s) => s.name.toLowerCase() === nameToAdd.toLowerCase())) return;

    const newSkills = [...skills, { name: nameToAdd, level }];
    setSkills(newSkills);
    setSkillInput('');
    if (update) update(newSkills);
  };

  const removeSkill = (index) => {
    const newSkills = skills.filter((_, i) => i !== index);
    setSkills(newSkills);
    if (update) update(newSkills);
  };

  return (
    <div className="space-y-6">
      {/* Input + Level Dropdown + Add Button */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-900">Add a skill</label>
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="e.g. React, Python, Figma..."
            value={skillInput}
            onChange={(e) => setSkillInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addSkill()}
            className="flex-grow px-4 py-3 rounded-2xl border border-gray-200 text-sm outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition"
          />

          <select
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            className="px-4 py-3 rounded-2xl border border-gray-200 text-sm bg-white outline-none text-gray-700 cursor-pointer"
          >
            <option value="Beginner">Beginner</option>
            <option value="Intermediate">Intermediate</option>
            <option value="Advanced">Advanced</option>
          </select>

          <button
            type="button"
            onClick={() => addSkill()}
            className="px-6 py-3 bg-blue-600 text-white font-semibold text-sm rounded-2xl hover:bg-blue-700 transition"
          >
            Add
          </button>
        </div>
      </div>

      {/* Quick Add Section */}
      <div className="space-y-2">
        <p className="text-xs text-gray-400 font-medium">Quick-add popular skills</p>
        <div className="flex flex-wrap gap-2">
          {POPULAR_SKILLS.map((skill) => (
            <button
              key={skill}
              type="button"
              onClick={() => addSkill(skill)}
              className="px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-medium text-gray-600 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 transition"
            >
              + {skill}
            </button>
          ))}
        </div>
      </div>

      {/* Dynamic Skill List / Empty State Banner */}
      {skills.length === 0 ? (
        <div className="border-2 border-dashed border-gray-200 rounded-2xl p-10 text-center space-y-2 my-4">
          <div className="text-amber-500 text-xl font-bold">⚡</div>
          <p className="text-sm text-gray-500 font-medium">
            Add at least 2 skills to help teams find you
          </p>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2.5 pt-4">
          {skills.map((skill, idx) => (
            <div
              key={idx}
              className="flex items-center gap-2 px-3.5 py-2 bg-blue-50 border border-blue-100 rounded-xl text-xs font-semibold text-blue-700"
            >
              <span>{skill.name}</span>
              <span className="text-blue-400 font-normal">({skill.level})</span>
              <button
                type="button"
                onClick={() => removeSkill(idx)}
                className="hover:text-red-500 ml-1"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}