// A transparent database-only fallback when all AI providers fail. It preserves
// every request and uses only stored urgency and creation time for ordering.
export function buildPrioritizationFallback(requests, weather) {
  const urgencyRank = request => {
    const urgency = String(request.urgency || '').toLowerCase();
    return urgency === 'critical' ? 2 : urgency === 'high' ? 1 : 0;
  };
  const ordered = [...requests].sort((a, b) =>
    urgencyRank(b) - urgencyRank(a)
    || String(a.created_at || '').localeCompare(String(b.created_at || ''))
    || String(a.id).localeCompare(String(b.id)));
  const weatherAvailable = weather.some(station => station.available);
  return {
    executive_summary: {
      summary: 'AI providers are unavailable. This provisional queue uses stored request urgency and submission time; an administrator should review it before dispatch.',
      highest_risk_area: '',
      key_weather_factor: weatherAvailable ? 'Weather readings are available for manual review.' : 'Current weather readings are unavailable.',
      strategic_recommendations: [
        'Review high-urgency requests first.',
        'Confirm local conditions and resource availability before dispatch.',
        'Run AI analysis again when the provider is available.',
      ],
    },
    prioritized_queue: ordered.map((request, index) => ({
      rank: index + 1,
      request_id: request.id,
      municipality: request.municipality,
      requested_items: request.items.map(item => `${item.quantity}x ${item.name}`).join(', ') || 'No items recorded',
      priority_level: urgencyRank(request) === 2 ? 'CRITICAL' : urgencyRank(request) === 1 ? 'HIGH' : 'MEDIUM',
      urgency_score: urgencyRank(request) === 2 ? 95 : urgencyRank(request) === 1 ? 80 : 50,
      weather_impact_factor: weatherAvailable ? 'Review available weather readings before dispatch.' : 'Current weather data is unavailable.',
      ai_reasoning: urgencyRank(request) ? `Stored request urgency is ${request.urgency}.` : 'Ordered by submission time; no high urgency is recorded.',
      recommended_action: 'Verify the request and available resources before dispatch.',
    })),
    analysis_source: 'database-fallback',
  };
}
