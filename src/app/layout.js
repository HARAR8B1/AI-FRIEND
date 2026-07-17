import './globals.css'

export const metadata = {
  title: 'Nila - Empathetic AI Life-Coach',
  description: 'Your empathetic AI life-coach companion. A warm, judgment-free space to talk, reflect, and grow.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-theme="dark">
      <head>
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🌸</text></svg>" />
      </head>
      <body>{children}</body>
    </html>
  )
}
