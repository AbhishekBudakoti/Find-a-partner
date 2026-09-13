const isUnset = (val) => val === undefined || val === null || val === "";

const buildLocation = (rawLocation, existingPoint) => {
  if (!rawLocation || typeof rawLocation !== "object") {
    return { city: "" };
  }

  const { city = "", lat, lng } = rawLocation;
  const location = { city: city || "" };

  if (isUnset(lat) && isUnset(lng)) {
    if (existingPoint) {
      location.point = existingPoint;
    }
    return location; // no coordinates given; preserve existing point if available
  }

  if (isUnset(lat) || isUnset(lng)) {
    const error = new Error("Invalid coordinates");
    error.statusCode = 400;
    throw error;
  }

  const latNum = Number(lat), lngNum = Number(lng);
  if (!Number.isFinite(latNum) || !Number.isFinite(lngNum) ||
      latNum < -90 || latNum > 90 || lngNum < -180 || lngNum > 180) {
    const error = new Error("Invalid coordinates");
    error.statusCode = 400;
    throw error;
  }

  location.point = { type: "Point", coordinates: [lngNum, latNum] };
  return location;
};

module.exports = {
  buildLocation,
};
