import '@/assets/css/globals.css'

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
    >
      <body className='mx-10'>{children}</body>
    </html>
  );
}