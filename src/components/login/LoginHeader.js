import CardBasedText from "../cards/CardBasedText"
import EmblemLogo from "@/assets/images/logofloodwatch.png"
import TypeLogo from "@/assets/images/logoword.png"
import Image from "next/image"
export default function LoginHeader() {
  return (
    <section className="flex  items-start lg:justify-start justify-center">
        <div className="items-start flex">
            <Image
                src={EmblemLogo}
                alt="Emblem Logo"
                className="object-contain"
               
            />
        <div className="flex flex-col items-center">
             <Image
                src={TypeLogo}
                alt="Type Logo"
                className="object-contain"
                width={200}
                height={200}
            />
            <CardBasedText className='text-gray-600'>Admin Services Portal</CardBasedText>
        </div>
        </div>
    </section>
  )
}

