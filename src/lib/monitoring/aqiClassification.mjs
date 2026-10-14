export function aqiLevel(aqi, status) {
  if (aqi !== null && aqi !== undefined && aqi !== '') {
    const value = Number(aqi);
    if (Number.isFinite(value) && value >= 0) {
      if (value <= 50) return 1;
      if (value <= 100) return 2;
      if (value <= 150) return 3;
      if (value <= 200) return 4;
      if (value <= 300) return 5;
      if (value <= 500) return 6;
      return 7;
    }
  }

  const label = typeof status === 'string' ? status.split(' | ')[0].trim().toLowerCase() : '';
  if (label === 'very hazardous') return 7;
  if (label === 'hazardous') return 6;
  if (label === 'very unhealthy') return 5;
  if (label === 'unhealthy') return 4;
  if (label === 'unhealthy for sensitive groups') return 3;
  if (label === 'moderate') return 2;
  if (label === 'good') return 1;
  return 0;
}
