const MATCH_WEIGHT ={
    activity:30,
    location: 20,
  availability: 25,
  skill: 15,
  rating: 10
}

const SKILL_LEVELS ={
      beginner: 1,
  intermediate: 2,
  advanced: 3,
}

const calculateTimeOverlap = ( candidateStart,candidateEnd,requestedStart,requestedEnd)=>{
    if(!requestedStart || !requestedEnd){
        return 0;
    }

    if(candidateStart <= requestedStart && candidateEnd >= requestedEnd){
        return 1;
    }

    const overlaps= candidateStart < requestedEnd && candidateEnd> requestedStart;

    return overlaps?0.6:0;
}


const calculateMatchScore = (profile,criteria)=>{
    let earnedScore = 0;
    let availableWeight=0;

    const breakdown={};
      // -------------------------
  // Activity - 30%
  // -------------------------

if(criteria.activity){
    availableWeight += MATCH_WEIGHT.activity;

    const activityMatch = profile.activities.some((activity)=>{
        return activity._id.toString()==criteria.activity
    });
    breakdown.activity = activityMatch?MATCH_WEIGHT.activity:0;

    earnedScore += breakdown.activity
}

 // -------------------------
  // Location - 20%
  // -------------------------

  if(criteria.city){
    availableWeight += MATCH_WEIGHT.location;

    const candidateCity= profile.location?.city?.trim().toLowerCase();

    const locationMatch=candidateCity && candidateCity === criteria.city.trim().toLowerCase();

    breakdown.location = locationMatch ? MATCH_WEIGHT.location:0;

    earnedScore += breakdown.location
  }


    // -------------------------
  // Availability - 25%
  // -------------------------

  if(criteria.day){
    availableWeight += MATCH_WEIGHT.availability;

    const availability = profile.availability.find((slot)=> slot.day ===criteria.day);

    if(!availability){
        breakdown.availability = 0;
    }
    else if(!criteria.startTime || !criteria.endTime){
        breakdown.availability =MATCH_WEIGHT.availability
    }
    else{
        const overlap = calculateTimeOverlap(
            availability.startTime,availability.endTime,criteria.startTime,criteria.endTime
        )

        breakdown.availability = MATCH_WEIGHT.availability * overlap;
    }

    earnedScore += breakdown.availability 
 }

  // -------------------------
  // Skill - 15%
  // -------------------------


  if(criteria.skillLevel){
    availableWeight += MATCH_WEIGHT.skill;

    const candidateSkill = SKILL_LEVELS[profile.skillLevel];

    const requestedSkill = SKILL_LEVELS[criteria.skillLevel];

    if(candidateSkill === requestedSkill){
        breakdown.skill = MATCH_WEIGHT.skill;
    }
    else if(Math.abs(candidateSkill - requestedSkill) === 1){
        breakdown.skill = MATCH_WEIGHT.skill * 0.5;
    }

    else{
        breakdown.skill = 0;
    }

    earnedScore += breakdown.skill
  }

   // -------------------------
  // Rating - 10%
  // -------------------------


  availableWeight += MATCH_WEIGHT.rating;

  const rating = profile.averageRating || 0;

  // Unrated users get a neutral rating score.

  const ratingScore = rating ===0 ? 0.5 : Math.min(rating /5,1);

  breakdown.rating = MATCH_WEIGHT.rating * ratingScore;

  earnedScore += breakdown.rating;

    // -------------------------
  // Normalize to 100
  // -------------------------


  const score = availableWeight ===0 ? 0 :(earnedScore / availableWeight) * 100;

  return {
    score: Math.round(score),breakdown:{
        activity:Math.round(breakdown.activity || 0),
        location: Math.round(breakdown.location || 0),
        availability : Math.round(breakdown.availability || 0),
        skill: Math.round(breakdown.skill|| 0),
        rating:Math.round(breakdown.rating|| 0),
    }
  }

}


const getMatchQuality = (score) =>{
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
}

module.exports = {
  calculateMatchScore,
  getMatchQuality,
};

   

