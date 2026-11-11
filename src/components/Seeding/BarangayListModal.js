"use client"

import { useEffect, useState } from "react"
import { X } from "lucide-react"
import SideModal from "@/components/Modal/SideModal"
import { clientApiAuthorization } from "@/lib/auth/clientApiAuthorization"

const PSGC_API = "https://psgc.gitlab.io/api"

function normalizeName(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/\b(city of|municipality of)\b/g, "")
    .replace(/\b(city|municipality)\b/g, "")
    .replace(/[^a-z0-9]/g, "")
}

async function getList(url, signal) {
  const response = await fetch(url, { signal })
  if (!response.ok) throw new Error("The PSGC barangay list is unavailable right now.")
  const rows = await response.json()
  if (!Array.isArray(rows)) throw new Error("The PSGC barangay list returned an unexpected response.")
  return rows
}

export default function BarangayListModal({ municipality, province, onClose }) {
  const [barangays, setBarangays] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [statistics, setStatistics] = useState({})
  const [censusLoading, setCensusLoading] = useState(false)
  const [censusError, setCensusError] = useState("")

  useEffect(() => {
    const controller = new AbortController()
    let loadedBarangays = false

    async function loadBarangays() {
      setLoading(true)
      setError("")
      try {
        const provinces = await getList(`${PSGC_API}/provinces/`, controller.signal)
        const matchedProvince = provinces.find(item => normalizeName(item.name) === normalizeName(province))
        if (!matchedProvince) throw new Error(`Could not match ${province} in the PSGC list.`)

        const municipalities = await getList(`${PSGC_API}/provinces/${encodeURIComponent(matchedProvince.code)}/cities-municipalities/`, controller.signal)
        const matchedMunicipality = municipalities.find(item => normalizeName(item.name) === normalizeName(municipality))
        if (!matchedMunicipality) throw new Error(`Could not match ${municipality} in the PSGC list.`)

        const rows = await getList(`${PSGC_API}/cities-municipalities/${encodeURIComponent(matchedMunicipality.code)}/barangays/`, controller.signal)
        setBarangays(rows.sort((a, b) => a.name.localeCompare(b.name)))
        loadedBarangays = true
        setLoading(false)
        setCensusLoading(true)
        setCensusError("")
        const codes = rows.map(row => row.psgc10DigitCode)
        if (codes.some(code => !/^\d{10}$/.test(code || ""))) {
          throw new Error("Some barangays have no verified 10-digit PSGC code for census matching.")
        }
        const censusResponse = await fetch('/api/seeding/barangay-census', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...await clientApiAuthorization() },
          body: JSON.stringify({ codes }),
          signal: controller.signal,
        })
        if (!censusResponse.ok) throw new Error("PSA barangay census figures are unavailable right now.")
        const censusResult = await censusResponse.json()
        if (!censusResult.statistics) throw new Error("PSA barangay census response was incomplete.")
        setStatistics(censusResult.statistics)
      } catch (cause) {
        if (!controller.signal.aborted) {
          if (loadedBarangays) setCensusError(cause.message || "Census figures are unavailable.")
          else setError(cause.message || "Unable to load barangays.")
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
          setCensusLoading(false)
        }
      }
    }

    loadBarangays()
    return () => controller.abort()
  }, [municipality, province])

  return (
    <SideModal>
      <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-gray-100 bg-white p-4">
        <div>
          <h2 className="text-lg font-bold text-primary">Barangays of {municipality}</h2>
          <p className="text-xs text-gray-500">{province} · {loading ? "Loading..." : error ? "Unavailable" : `${barangays.length} barangays`}</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Close barangay list" className="rounded-full p-1.5 hover:bg-gray-100">
          <X className="size-5 text-gray-500" />
        </button>
      </div>

      <div className="max-h-[75vh] overflow-y-auto p-4">
        {loading ? <p role="status" className="text-sm text-gray-500">Loading all barangays...</p> : null}
        {error ? <p role="alert" className="text-sm text-red-600">{error}</p> : null}
        {censusError ? <p role="status" className="mb-3 text-sm text-amber-700">{censusError} Barangay names are still shown.</p> : null}
        {!loading && !error && barangays.length === 0 ? <p className="text-sm text-gray-500">No barangays were returned for this municipality.</p> : null}
        {!loading && !error && barangays.length > 0 ? (
          <ol className="grid gap-2">
            {barangays.map((barangay, index) => (
              <li key={barangay.code || `${barangay.name}-${index}`} className="grid gap-2 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-700 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center">
                <span className="font-semibold">{barangay.name}</span>
                <span className="sm:w-36"><span className="block text-xs text-gray-500">Total Population</span>{censusLoading ? "Loading..." : statistics[barangay.psgc10DigitCode]?.total_population?.toLocaleString('en-PH') ?? 'N/A'}</span>
                <span className="sm:w-36"><span className="block text-xs text-gray-500">Number of Households</span>{censusLoading ? "Loading..." : statistics[barangay.psgc10DigitCode]?.number_of_households?.toLocaleString('en-PH') ?? 'N/A'}</span>
              </li>
            ))}
          </ol>
        ) : null}
      </div>
    </SideModal>
  )
}
