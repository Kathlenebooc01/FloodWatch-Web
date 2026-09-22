import { Origami, Bell, User, Sparkle } from "lucide-react"
import Link from "next/link"
import RouteHeader from "./RouteHeader"
export default function ProvincialHeader() {
  return (
    <section className="flex w-full justify-between items-stretch">
        
            <RouteHeader/>
        
        <div className="flex gap-1 items-center">
        <Link href='/provincial-admin/lantaw' className="navheader-button relative">
            <Origami className="text-xs"/>
            <Sparkle className="size-4 absolute top-0 left-0 right-1 fill-primary/50"/>
        </Link>
        <Link href='/provincial-admin/account' className="navheader-button block lg:hidden">
            <User className="text-xs"/>
        </Link>
        <Link href='/provincial-admin/notification' className="navheader-button">
            <Bell className="text-xs"/>
        </Link>
        </div>
    </section>
  )
}
