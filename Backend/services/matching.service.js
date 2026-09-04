/**
 * Weight distribution (total 100%) for calculating user match compatibility scores.
 */
const MATCH_WEIGHT = {
  activity: 30,
  location: 20,
  availability: 25,
  skill: 15,
  rating: 10,
};

/**
 * Skill level mapping to numeric scale for distance comparison.
 */
const SKILL_LEVELS = {
  beginner: 1,
  intermediate: 2,
  advanced: 3,
};

/**
 * Calculates time slot overlap ratio between candidate availability and requested time range.
 *
 * @param {string} candidateStart - Start time of candidate.
 * @param {string} candidateEnd - End time of candidate.
 * @param {string} requestedStart - Start time requested by user.
 * @param {string} requestedEnd - End time requested by user.
 * @returns {number} Overlap multiplier between 0 and 1.
 */
const calculateTimeOverlap = (candidateStart, candidateEnd, requestedStart, requestedEnd) => {
  if (!requestedStart || !requestedEnd) {
    return 0;
  }

  // Full overlap
  if (candidateStart <= requestedStart && candidateEnd >= requestedEnd) {
    return 1;
  }

  // Partial overlap check
  const overlaps = candidateStart < requestedEnd && candidateEnd > requestedStart;

  return overlaps ? 0.6 : 0;
};

/**
 * Calculates weighted match score (0-100) and breakdown for a user profile based on search criteria.
 *
 * @param {Object} profile - User profile document containing activities, location, availability, skill level, and rating.
 * @param {Object} criteria - Search criteria provided by requesting user.
 * @returns {{score: number, breakdown: Object}} Match score percentage and category breakdown.
 */
const calculateMatchScore = (profile, criteria) => {
  let earnedScore = 0;
  let availableWeight = 0;

  const breakdown = {};

  // -------------------------
  // 1. Activity Match (30%)
  // -------------------------
  if (criteria.activity) {
    availableWeight += MATCH_WEIGHT.activity;

    const activityMatch = profile.activities.some((activity) => {
      return activity._id.toString() == criteria.activity;
    });
    breakdown.activity = activityMatch ? MATCH_WEIGHT.activity : 0;
    earnedScore += breakdown.activity;
  }

  // -------------------------
  // 2. Location Match (20%)
  // -------------------------
  if (criteria.city) {
    availableWeight += MATCH_WEIGHT.location;

    const candidateCity = profile.location?.city?.trim().toLowerCase();
    const locationMatch = candidateCity && candidateCity === criteria.city.trim().toLowerCase();

    breakdown.location = locationMatch ? MATCH_WEIGHT.location : 0;
    earnedScore += breakdown.location;
  }

  // -------------------------
  // 3. Availability Match (25%)
  // -------------------------
  if (criteria.day) {
    availableWeight += MATCH_WEIGHT.availability;

    const availability = profile.availability.find((slot) => slot.day === criteria.day);

    if (!availability) {
      breakdown.availability = 0;
    } else if (!criteria.startTime || !criteria.endTime) {
      breakdown.availability = MATCH_WEIGHT.availability;
    } else {
      const overlap = calculateTimeOverlap(
        availability.startTime,
        availability.endTime,
        criteria.startTime,
        criteria.endTime
      );
      breakdown.availability = MATCH_WEIGHT.availability * overlap;
    }

    earnedScore += breakdown.availability;
  }

  // -------------------------
  // 4. Skill Level Match (15%)
  // -------------------------
  if (criteria.skillLevel) {
    availableWeight += MATCH_WEIGHT.skill;

    const candidateSkill = SKILL_LEVELS[profile.skillLevel];
    const requestedSkill = SKILL_LEVELS[criteria.skillLevel];

    if (candidateSkill === requestedSkill) {
      breakdown.skill = MATCH_WEIGHT.skill;
    } else if (Math.abs(candidateSkill - requestedSkill) === 1) {
      breakdown.skill = MATCH_WEIGHT.skill * 0.5;
    } else {
      breakdown.skill = 0;
    }

    earnedScore += breakdown.skill;
  }

  // -------------------------
  // 5. Rating Score (10%)
  // -------------------------
  availableWeight += MATCH_WEIGHT.rating;

  const rating = profile.averageRating || 0;
  // Unrated users receive a neutral default score ratio (0.5)
  const ratingScore = rating === 0 ? 0.5 : Math.min(rating / 5, 1);

  breakdown.rating = MATCH_WEIGHT.rating * ratingScore;
  earnedScore += breakdown.rating;

  // -------------------------
  // Normalize Score to 100%
  // -------------------------
  const score = availableWeight === 0 ? 0 : (earnedScore / availableWeight) * 100;

  return {
    score: Math.round(score),
    breakdown: {
      activity: Math.round(breakdown.activity || 0),
      location: Math.round(breakdown.location || 0),
      availability: Math.round(breakdown.availability || 0),
      skill: Math.round(breakdown.skill || 0),
      rating: Math.round(breakdown.rating || 0),
    },
  };
};

/**
 * Returns a human-readable quality label for a numeric match score.
 *
 * @param {number} score - Calculated match score (0-100).
 * @returns {string} Quality label description ("Excellent match", "Good match", "Fair match", or "Low match").
 */
const getMatchQuality = (score) => {
  if (score >= 80) {
    return "Excellent match";
  }
  if (score >= 60) {
    return "Good match";
  }
  if (score >= 40) {
    return "Fair match";
  }
  return "Low match";
};

module.exports = {
  calculateMatchScore,
  getMatchQuality,
};


   

