import AdminNav from "@/components/navbar/AdminNav";
import Navbar from "./Navbar";
export const metadata = {
  title: "Logs and Activity",
};

export default function RegisterLayout({ children }) {
  return (
      <main className="grid gap-5">
        <Navbar/>
          {children}
          
      </main>
  );
}
