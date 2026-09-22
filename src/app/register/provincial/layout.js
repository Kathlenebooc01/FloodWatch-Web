import AdminNav from "@/components/navbar/AdminNav";

export const metadata = {
  title: "Registration",
};

export default function RegisterLayout({ children }) {
  return (
      <main className="flex flex-1 items-center justify-center w-full">
        
          {children}
          
      </main>
  );
}
