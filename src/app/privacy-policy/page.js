import Link from 'next/link'

export const metadata = { title: 'Data Privacy Policy | FloodWatch Cebu' }

const sections = [
  ['Information processed', 'The system processes invited users’ names, email addresses, phone numbers, roles, municipality assignments where applicable, and account activity. Its reporting workflows can process incident descriptions, uploaded images or attachments, reported locations and coordinates, distress signals, resource requests, and verification records. Information depends on the feature used.'],
  ['Purposes and basis', 'Information is used to register and authenticate accounts, control role-based access, monitor flood conditions, assess risk, review and verify reports, manage distress signals and resource requests, coordinate LGU and provincial response, and maintain operational and security records. Processing must have an applicable basis under the Data Privacy Act of 2012 and its implementing rules, such as a legal obligation, public-authority function, vital interests in an emergency, or other basis that applies to the particular activity. Agreeing to this notice is an acknowledgment, not blanket consent to every processing activity.'],
  ['Storage and security', 'FloodWatch Cebu uses Supabase for authentication and database services and for file storage where uploads are used. The application uses authenticated access and role-based controls in relevant workflows. No online service can promise uninterrupted availability or absolute security.'],
  ['Access and service providers', 'Authorized LGU personnel, Provincial Admins, and National Admins may see information needed for their assigned work. Supabase processes backend data. Depending on the feature used, Mapbox may receive map or geocoding requests; OpenWeather and OpenAQ provide environmental information; and configured Google Gemini services may process report, verification, or assistance inputs. Do not enter information unrelated to the task into AI features.'],
  ['Retention', 'A fixed retention period for personal information and emergency records has not yet been established. The authorized project representatives and privacy officer must approve a retention and deletion schedule before this policy is officially published. Until then, do not assume records are automatically deleted after a set time.'],
  ['Your rights', 'Under Republic Act No. 10173 and its implementing rules, data subjects may have rights to be informed, access, correction, objection, erasure or blocking, portability, damages, and to file a complaint, subject to applicable conditions and exceptions.'],
  ['Privacy requests and contact', 'To request access, correction, or other privacy action, contact the administrator who invited you or your authorized LGU or provincial system administrator. A designated Data Protection Officer contact has not yet been provided and must be added before official publication.'],
  ['Changes to this policy', 'Material changes should be communicated to affected users. The effective date and version will be updated when a revised policy is approved.'],
]

export default function PrivacyPolicyPage() {
  return <main className="min-h-screen bg-gray-50 px-4 py-10 text-gray-800">
    <article className="mx-auto max-w-3xl rounded-xl border border-gray-200 bg-white p-6 shadow-sm sm:p-10">
      <Link href="/" className="text-sm font-semibold text-primary">FloodWatch Cebu</Link>
      <h1 className="mt-4 text-3xl font-bold">Data Privacy Policy</h1>
      <p className="mt-2 text-sm text-gray-600">Version 1.0 · Effective date: 24 October 2026</p>
      <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Draft for review. A retention schedule and designated privacy contact require approval before official publication.</p>
      <div className="mt-8 space-y-7">{sections.map(([title, body]) => <section key={title}>
        <h2 className="text-lg font-semibold">{title}</h2><p className="mt-2 leading-7 text-gray-700">{body}</p>
      </section>)}</div>
      <p className="mt-8 text-sm text-gray-600">For more on statutory rights, see the <a href="https://privacy.gov.ph/data-subject-rights/" className="text-primary underline">National Privacy Commission’s data subject rights guidance</a>.</p>
      <Link href="/terms-and-conditions" className="mt-4 inline-block text-primary underline">Read the Terms &amp; Conditions</Link>
    </article>
  </main>
}
