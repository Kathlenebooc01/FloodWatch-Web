export function getIncidentCoordinates(report) {
  if (report?.latitude == null || report?.longitude == null ||
      report.latitude === '' || report.longitude === '') return null

  const latitude = Number(report.latitude)
  const longitude = Number(report.longitude)
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) ||
      Math.abs(latitude) > 90 || Math.abs(longitude) > 180 ||
      (latitude === 0 && longitude === 0)) return null

  return { latitude, longitude }
}
