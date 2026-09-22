import { redirect } from 'next/navigation'

export default function page() {
  // Direct access to registration is strictly prohibited.
  // Users must use the /register/provincial/[id] link from their email.
  redirect('/Error/auth')
}
