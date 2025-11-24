import './globals.css'

export const metadata = {
  title: 'ProspectFind - LinkedIn Intelligence Platform',
  description: 'Discover qualified professionals with AI-powered LinkedIn search',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        {children}
      </body>
    </html>
  )
}