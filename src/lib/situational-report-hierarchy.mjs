export const isAcceptedReport = (report) => report?.status?.toLowerCase() === 'verified';

export function buildReportHierarchy(reports) {
  const byId = new Map(reports.map(report => [String(report.report_id), report]));
  const groups = new Map();
  const roots = new Map();
  const unresolved = [];
  const newestFirst = (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0);

  for (const report of reports) {
    if (report.parent_report_id) continue;
    const key = report.municipality_id || 'unknown';
    if (!groups.has(key)) groups.set(key, {
      municipality_id: key,
      municipality_name: report.municipality_name || 'Unknown municipality',
      reports: [], pendingCount: 0, latestReport: report,
    });
    const node = { ...report, updates: [], latestReport: report };
    roots.set(String(report.report_id), node);
    groups.get(key).reports.push(node);
  }

  for (const report of reports) {
    if (!report.parent_report_id) continue;
    let parentId = String(report.parent_report_id);
    const seen = new Set([String(report.report_id)]);
    while (byId.get(parentId)?.parent_report_id && !seen.has(parentId)) {
      seen.add(parentId);
      parentId = String(byId.get(parentId).parent_report_id);
    }
    const root = seen.has(parentId) ? null : roots.get(parentId);
    if (!root || root.municipality_id !== report.municipality_id) {
      unresolved.push(report);
      continue;
    }
    root.updates.push(report);
  }

  for (const group of groups.values()) {
    for (const root of group.reports) {
      root.updates.sort((a, b) => -newestFirst(a, b));
      root.latestReport = [byId.get(String(root.report_id)), ...root.updates].sort(newestFirst)[0];
      const records = [root, ...root.updates];
      group.pendingCount += records.filter(report => /pending|ready|review|submitted/i.test(report.status || '')).length;
      if (newestFirst(root.latestReport, group.latestReport) < 0) group.latestReport = root.latestReport;
    }
    group.reports.sort((a, b) => newestFirst(a.latestReport, b.latestReport));
  }
  return { groups: [...groups.values()].sort((a, b) => newestFirst(a.latestReport, b.latestReport)), unresolved };
}

// Supabase caps responses; fetch every page so a recent update cannot lose its root.
export async function fetchAllIncidentReports(db) {
  const reports = [];
  const pageSize = 500;
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await db.from('incident_report')
      .select('*, profiles:user_id(id, full_name, role, organization_name, mobile_number, profile_picture, email), municipality_or_city:municipality_id(name)')
      .order('created_at', { ascending: false }).order('report_id', { ascending: false })
      .range(offset, offset + pageSize - 1);
    if (error) throw error;
    reports.push(...(data || []));
    if (!data || data.length < pageSize) return reports;
  }
}
