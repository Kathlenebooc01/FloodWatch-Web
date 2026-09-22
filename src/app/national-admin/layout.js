import AdminNav from "@/components/navbar/AdminNav";
import NavHeader from "@/components/navbar/NavHeader";
import AuthGuard from "@/supabase/auth/AuthGuard";

export const metadata = {
  title: "National Admin",
};

export default function LoginLayout({ children }) {
  return (
    <AuthGuard allowedRole="national_admin">
      <main className="flex">
        <div >
          <AdminNav/>
          
        </div>
          <section className="flex-1 bg-accent/20 w-full gap-5 p-2 flex flex-col pb-24 lg:pb-2">
          <NavHeader/>
          {children}
          </section>
      </main>
    </AuthGuard>
  );
}
