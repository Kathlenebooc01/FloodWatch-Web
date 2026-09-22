import GeneralCard from "@/components/cards/GeneralCard";
import LoginHeader from "@/components/login/LoginHeader";
import LoginForm from "@/components/login/LoginForm";
import RightPane from "@/components/login/RightPane";
export default function page() {
    return (
        <GeneralCard className="w-full max-w-md gap-3 md:max-w-4xl grid grid-cols-1 md:grid-cols-2 min-h-[500px] p-0 overflow-hidden">
            <section className="p-5">
            <div className="flex flex-col gap-5">
                <LoginHeader/>
                <LoginForm/>
            </div>
            </section>
              <RightPane/>
        </GeneralCard>
    )
}
