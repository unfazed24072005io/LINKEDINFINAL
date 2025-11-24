import './globals.css'

export const metadata = {
  title: 'ProspectFind - LinkedIn Intelligence Platform',
  description: 'Discover qualified professionals with AI-powered LinkedIn search',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  )
}