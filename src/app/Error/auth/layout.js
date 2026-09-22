export const metadata = {
  title: "Unauthorized Access | FloodWatch",
};

export default function AuthErrorLayout({ children }) {
  return (
    <main className="min-h-screen w-full bg-gradient-to-br from-slate-50 to-blue-50/50 flex flex-col items-center justify-center p-4">
      {children}
    </main>
  );
}
