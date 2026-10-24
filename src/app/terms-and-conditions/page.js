import Link from 'next/link'

export const metadata = { title: 'Terms & Conditions | FloodWatch Cebu' }

const sections = [
  ['Introduction and acceptance', 'FloodWatch Cebu is a geospatial flood monitoring, incident reporting, and emergency coordination system. Authorized users can review flood information, incident reports, distress signals, and response resources. By registering through an invitation, you agree to these terms.'],
  ['Authorized users and accounts', 'Provincial Admins, National Admins, and LGU Headmasters must provide accurate registration details, protect their credentials, use only their assigned permissions, prevent unauthorized access, and report suspected account or security incidents to their system administrator. Use the system only for legitimate monitoring and emergency coordination.'],
  ['Acceptable use', 'Do not submit intentionally false emergency information, misuse reports or distress signals, access restricted information without authorization, improperly share personal information, upload malicious or unauthorized files, manipulate emergency or verification records, or interfere with system security or availability.'],
  ['Reports and verification', 'The system supports citizen incident reports, LGU verification, distress signal escalation, and Provincial Admin monitoring. Submitted information may require review before it is treated as verified. Users should identify uncertainty and correct inaccurate records through authorized procedures.'],
  ['Emergency response limitations', 'FloodWatch Cebu helps share information and coordinate response. It does not guarantee immediate rescue, emergency assistance, or uninterrupted service. Continue to follow official emergency procedures and instructions from authorized government agencies.'],
  ['Access and restrictions', 'Access is determined by your invitation, assigned role, and applicable authorization. Misuse or unauthorized access may lead to restriction or suspension under applicable procedures.'],
  ['Availability', 'Maintenance, connectivity, external data services, and technical problems may interrupt access or affect the freshness of displayed information.'],
  ['Changes to these terms', 'These terms may change when system functions, security requirements, or operational policies change. Material changes should be communicated to affected users before the new version takes effect.'],
]

export default function TermsPage() {
  return <main className="min-h-screen bg-gray-50 px-4 py-10 text-gray-800">
    <article className="mx-auto max-w-3xl rounded-xl border border-gray-200 bg-white p-6 shadow-sm sm:p-10">
      <Link href="/" className="text-sm font-semibold text-primary">FloodWatch Cebu</Link>
      <h1 className="mt-4 text-3xl font-bold">Terms &amp; Conditions</h1>
      <p className="mt-2 text-sm text-gray-600">Version 1.0 · Effective date: 24 October 2026</p>
      <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Draft for review by authorized project representatives before official publication.</p>
      <div className="mt-8 space-y-7">{sections.map(([title, body]) => <section key={title}>
        <h2 className="text-lg font-semibold">{title}</h2><p className="mt-2 leading-7 text-gray-700">{body}</p>
      </section>)}</div>
      <Link href="/privacy-policy" className="mt-8 inline-block text-primary underline">Read the Data Privacy Policy</Link>
    </article>
  </main>
}
