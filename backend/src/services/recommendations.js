const tagWeights = {
  big_tech: 5,
  communication: 4,
  mock_interview: 2,
  resume: 2,
  tech: 2,
  non_tech: 2,
  public_company: 2,
  india: 1,
  ireland: 1,
  senior_developer: 2,
};

const callTypeProfiles = {
  RESUME_REVAMP: {
    desiredTags: ["big_tech", "resume", "tech"],
    keywords: ["resume", "cv", "linkedin", "big tech", "career story"],
  },
  JOB_MARKET_GUIDANCE: {
    desiredTags: ["communication", "public_company", "non_tech"],
    keywords: ["communication", "job market", "hiring", "networking", "guidance"],
  },
  MOCK_INTERVIEW: {
    desiredTags: ["mock_interview", "tech", "senior_developer"],
    keywords: ["mock interview", "domain", "system design", "coding", "behavioral"],
  },
};

function normalizeTag(tag) {
  return String(tag || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function normalizeTags(tags) {
  return Array.isArray(tags) ? tags.map(normalizeTag).filter(Boolean) : [];
}

function countKeywordHits(text, keywords) {
  const normalized = String(text || "").toLowerCase();
  return keywords.reduce((score, keyword) => score + (normalized.includes(keyword) ? 1 : 0), 0);
}

export function scoreMentorForUser({ mentor, user, callType }) {
  const mentorTags = normalizeTags(mentor.tags);
  const userTags = normalizeTags(user.tags);
  const profile = callTypeProfiles[callType] || callTypeProfiles.MOCK_INTERVIEW;

  let score = 0;
  const reasons = [];

  for (const tag of profile.desiredTags) {
    if (mentorTags.includes(tag)) {
      score += tagWeights[tag] || 1;
      reasons.push(`Has ${tag.replaceAll("_", " ")} experience`);
    }
  }

  for (const tag of userTags) {
    if (mentorTags.includes(tag)) {
      score += 3;
      reasons.push(`Matches user tag: ${tag.replaceAll("_", " ")}`);
    }
  }

  const keywordHits = countKeywordHits(mentor.description, profile.keywords);
  if (keywordHits > 0) {
    score += keywordHits * 2;
    reasons.push("Description aligns with the requested call type");
  }

  const sharedKeywords = countKeywordHits(
    `${mentor.description} ${mentorTags.join(" ")}`,
    user.description.split(/\s+/).filter(Boolean).slice(0, 20)
  );
  if (sharedKeywords > 0) {
    score += Math.min(sharedKeywords, 3);
    reasons.push("Mentor background overlaps with the user's requirement description");
  }

  return {
    mentorId: mentor.id,
    score,
    reasons: [...new Set(reasons)].slice(0, 3),
  };
}

export function rankMentors({ mentors, user, callType }) {
  return mentors
    .map((mentor) => ({
      mentor,
      recommendation: scoreMentorForUser({ mentor, user, callType }),
    }))
    .sort((a, b) => b.recommendation.score - a.recommendation.score || a.mentor.name.localeCompare(b.mentor.name));
}
