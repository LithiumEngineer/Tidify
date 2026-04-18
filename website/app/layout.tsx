import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Tidify — Find and remove duplicate photos',
  description:
    'Desktop app that uses CNN embeddings to find duplicate and similar photos on your computer.',
  icons: {
    icon: '/favicon.png',
    apple: '/favicon.png',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans">{children}</body>
    </html>
  )
}
