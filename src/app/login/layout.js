
export const metadata = {
  title: "Login - FloodWatch",
};

export default function LoginLayout({ children }) {
  return (
    <div className="h-screen flex flex-col items-center justify-center">
      {children}
    </div>
  );
}
