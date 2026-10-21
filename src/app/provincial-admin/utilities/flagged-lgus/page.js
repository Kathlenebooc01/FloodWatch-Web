"use client"

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Flag, Search, X } from 'lucide-react'
import TablePagination from '@/components/table/TablePagination'
import { supabase } from '@/supabase/util/supabase'
import { daysOverdue } from '@/lib/utilities/overdue.mjs'

const PAGE_SIZE = 10

export default function FlaggedLGUsPage() {
  const [flags, setFlags] = useState([])
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('All')
  const [selected, setSelected] = useState(null)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [now, setNow] = useState(() => new Date())

  const load = useCallback(async () => {
    const { data, error: loadError } = await supabase.from('utility_overdue_flags')
      .select('*, lgu:lgu_id(full_name, municipality_or_city:municipality_id(name)), request:request_id(resource_request_items(quantity_requested, utilities:utilities_id(name)))')
      .order('flagged_at', { ascending: false })
    if (loadError) setError(loadError.message)
    else { setFlags(data || []); setError('') }
    setIsLoading(false)
  }, [])

  useEffect(() => {
    try { window.localStorage.removeItem('floodwatch-bogo-utility-flag-demo') } catch { /* Storage may be unavailable. */ }
    const initialLoad = setTimeout(load, 0)
    const channel = supabase.channel('utility-overdue-flags-page')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'utility_overdue_flags' }, load)
      .subscribe()
    const timer = setInterval(() => { setNow(new Date()); load() }, 60000)
    return () => { clearTimeout(initialLoad); clearInterval(timer); supabase.removeChannel(channel) }
  }, [load])

  const visible = useMemo(() => flags.filter(flag => {
    if (filter === 'Active' && flag.cleared_at) return false
    if (filter === 'Cleared' && !flag.cleared_at) return false
    const utilities = flag.request?.resource_request_items?.map(item => item.utilities?.name).join(' ') || ''
    const searchable = [flag.lgu?.full_name, flag.lgu?.municipality_or_city?.name, flag.request_id, flag.reason, utilities]
      .join(' ').toLowerCase()
    return searchable.includes(query.toLowerCase().trim())
  }), [flags, filter, query])

  const page = Math.min(currentPage, Math.max(1, Math.ceil(visible.length / PAGE_SIZE)))
  const pageRows = visible.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const activeCount = flags.filter(flag => !flag.cleared_at).length
  const utilitiesFor = flag => flag.request?.resource_request_items?.map(item =>
    `${item.utilities?.name || 'Utility'} (${item.quantity_requested})`).join(', ') || '—'
  const dateFor = value => value ? new Intl.DateTimeFormat('en-PH', {
    timeZone: 'Asia/Manila', dateStyle: 'medium', timeStyle: value.includes('T') ? 'short' : undefined,
  }).format(new Date(value)) : '—'

  return <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
    <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Flagged LGUs</h1>
          <p className="mt-1 text-sm text-slate-500">Overdue utility flags and their history.</p>
        </div>
        <span className="rounded-full bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700">
          {activeCount} active {activeCount === 1 ? 'flag' : 'flags'}
        </span>
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-sm">
          <Search aria-hidden="true" className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input aria-label="Search flags" placeholder="Search name, municipality, request or reason"
            value={query} onChange={event => { setQuery(event.target.value); setCurrentPage(1) }}
            className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-9 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
          {query && <button type="button" aria-label="Clear search" onClick={() => { setQuery(''); setCurrentPage(1) }}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X className="size-4" /></button>}
        </div>
        <select aria-label="Flag status" value={filter} onChange={event => { setFilter(event.target.value); setCurrentPage(1) }}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
          <option>All</option><option>Active</option><option>Cleared</option>
        </select>
        {!isLoading && <span className="text-xs text-slate-500">{visible.length} {visible.length === 1 ? 'result' : 'results'}</span>}
      </div>
    </div>

    {error && <p role="alert" className="mx-5 mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 sm:mx-6">{error}</p>}
    <div className="w-full overflow-x-auto">
      <table className="w-full min-w-[1450px] table-fixed text-left text-sm">
        <colgroup>
          <col className="w-[155px]" /><col className="w-[125px]" /><col className="w-[125px]" />
          <col className="w-[160px]" /><col className="w-[135px]" /><col className="w-[105px]" />
          <col className="w-[180px]" /><col className="w-[155px]" /><col className="w-[160px]" />
          <col className="w-[90px]" /><col className="w-[105px]" />
        </colgroup>
        <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <tr>{['LGU Headmaster', 'Municipality/City', 'Request Number', 'Borrowed Utilities', 'Expected Return', 'Days Overdue', 'Reason', 'Remarks', 'Date Flagged', 'Status', 'Actions'].map(label =>
            <th key={label} scope="col" className="border-b border-slate-200 px-4 py-3">{label}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {pageRows.map(flag => <tr key={flag.flag_id} className="align-top text-slate-700 hover:bg-slate-50/70">
            <td className="px-4 py-4 font-medium text-slate-900">{flag.lgu?.full_name || '—'}</td>
            <td className="px-4 py-4">{flag.lgu?.municipality_or_city?.name || '—'}</td>
            <td className="px-4 py-4 font-mono text-xs" title={flag.request_id}>{flag.request_id.slice(0, 8)}</td>
            <td className="px-4 py-4">{utilitiesFor(flag)}</td>
            <td className="px-4 py-4 whitespace-nowrap">{dateFor(flag.expected_return_date)}</td>
            <td className="px-4 py-4 font-semibold text-red-700">{daysOverdue(flag.expected_return_date, flag.cleared_at || now)}</td>
            <td className="px-4 py-4">{flag.reason}</td>
            <td className="px-4 py-4 text-slate-500">{flag.remarks || '—'}</td>
            <td className="px-4 py-4">{dateFor(flag.flagged_at)}</td>
            <td className="px-4 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${flag.cleared_at ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>{flag.cleared_at ? 'Cleared' : 'Active'}</span></td>
            <td className="px-4 py-4"><button type="button" onClick={() => setSelected(flag)} className="font-semibold text-blue-600 hover:text-blue-800 hover:underline">View Details</button></td>
          </tr>)}
        </tbody>
      </table>
      {!isLoading && !error && visible.length === 0 && <div className="flex min-h-48 flex-col items-center justify-center border-t border-slate-100 px-5 py-8 text-center">
        <span className="mb-3 flex size-11 items-center justify-center rounded-full bg-slate-100 text-slate-500"><Flag className="size-5" /></span>
        <p className="font-semibold text-slate-800">{flags.length ? 'No matching flags' : 'No flagged LGUs yet'}</p>
        <p className="mt-1 max-w-sm text-sm text-slate-500">{flags.length ? 'Try another search or status filter.' : 'Confirmed overdue utility flags will appear here.'}</p>
      </div>}
      {isLoading && <div className="border-t border-slate-100 px-5 py-8 text-center text-sm text-slate-500">Loading flags...</div>}
    </div>
    <TablePagination currentPage={page} totalItems={visible.length} itemsPerPage={PAGE_SIZE} onPageChange={setCurrentPage} />

    {selected && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setSelected(null) }}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl" role="dialog" aria-modal="true" aria-label="Flag details">
        <h2 className="mb-4 text-lg font-bold">Flag Details</h2>
        <div className="space-y-2 text-sm">
          <p><strong>LGU Headmaster:</strong> {selected.lgu?.full_name || '—'}</p>
          <p><strong>Municipality/City:</strong> {selected.lgu?.municipality_or_city?.name || '—'}</p>
          <p><strong>Utility Request Number:</strong> {selected.request_id}</p>
          <p><strong>Borrowed Utilities:</strong> {utilitiesFor(selected)}</p>
          <p><strong>Expected Return Date:</strong> {dateFor(selected.expected_return_date)}</p>
          <p><strong>Days Overdue:</strong> {daysOverdue(selected.expected_return_date, selected.cleared_at || now)}</p>
          <p><strong>Flag Reason:</strong> {selected.reason}</p>
          <p><strong>Additional Remarks:</strong> {selected.remarks || '—'}</p>
          <p><strong>Date Flagged:</strong> {dateFor(selected.flagged_at)}</p>
          <p><strong>Status:</strong> {selected.cleared_at ? 'Cleared' : 'Active'}</p>
          <p><strong>Date Cleared:</strong> {dateFor(selected.cleared_at)}</p>
        </div>
        <div className="mt-5 flex justify-end gap-3">
          <Link href={`/provincial-admin/utilities/request/view-request?id=${selected.request_id}`} className="text-blue-600 hover:underline">Open Request</Link>
          <button type="button" onClick={() => setSelected(null)}>Close</button>
        </div>
      </div>
    </div>}
  </section>
}
