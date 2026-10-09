function parseLocationPoint(point) {
  if (!point) return null
  if (typeof point === 'object') {
    if (Array.isArray(point.coordinates) && point.type?.toLowerCase() === 'point') {
      return { longitude: point.coordinates[0], latitude: point.coordinates[1] }
    }
    return null
  }
  if (typeof point !== 'string') return null
  const value = point.trim()
  const wkt = value.match(/^(?:SRID=4326;)?POINT\s*\(\s*([-+\d.eE]+)\s+([-+\d.eE]+)\s*\)$/i)
  if (wkt) return { longitude: wkt[1], latitude: wkt[2] }
  if (/^[\da-f]+$/i.test(value) && value.length >= 42 && value.length % 2 === 0) {
    const bytes = Uint8Array.from(value.match(/.{2}/g), byte => parseInt(byte, 16))
    if (bytes[0] !== 0 && bytes[0] !== 1) return null
    const view = new DataView(bytes.buffer)
    const littleEndian = bytes[0] === 1
    const type = view.getUint32(1, littleEndian)
    if ((type & 0xff) !== 1) return null
    const coordinateOffset = 5 + (type & 0x20000000 ? 4 : 0)
    if (bytes.length < coordinateOffset + 16) return null
    return { longitude: view.getFloat64(coordinateOffset, littleEndian),
      latitude: view.getFloat64(coordinateOffset + 8, littleEndian) }
  }
  try {
    return parseLocationPoint(JSON.parse(value))
  } catch { return null }
}

export function getIncidentCoordinates(report) {
  const point = parseLocationPoint(report?.location_point)
  const latitude = Number(point?.latitude ?? report?.latitude)
  const longitude = Number(point?.longitude ?? report?.longitude)
  if ((point?.latitude ?? report?.latitude) == null || (point?.longitude ?? report?.longitude) == null ||
      (point?.latitude ?? report?.latitude) === '' || (point?.longitude ?? report?.longitude) === '') return null
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) ||
      Math.abs(latitude) > 90 || Math.abs(longitude) > 180 ||
      (latitude === 0 && longitude === 0)) return null

  return { latitude, longitude }
}
