import type { Metadata, Viewport } from "next";
import { Bebas_Neue, Nunito, Ubuntu } from "next/font/google";
import "./globals.css";
import InstallPrompt from "@/components/InstallPrompt";

const bebasNeue = Bebas_Neue({
  weight: '400',
  subsets: ["latin"],
  variable: '--font-bebas-neue',
});

const nunito = Nunito({
  subsets: ["latin"],
  variable: '--font-nunito',
});

const ubuntu = Ubuntu({
  weight: ['400', '500', '700'],
  subsets: ["latin"],
  variable: '--font-ubuntu',
});

export const viewport: Viewport = {
  themeColor: "#110c94",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "Coach Strong | Inspire Change",
  description: "High Performance Health & Wellbeing by Eske Dost",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Coach Strong",
    startupImage: [{ url: "/splash-screen.png" }],
  },
  icons: {
    icon: "/icon-192.png",
    apple: "/icon-512.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html 
      lang="en" 
      className={`${bebasNeue.variable} ${nunito.variable} ${ubuntu.variable} h-full select-none`}
    >
      <body 
        className="font-sans bg-brand-sand text-brand-dark antialiased h-full overflow-x-hidden"
        style={{ 
          overscrollBehaviorY: 'none', 
          WebkitTapHighlightColor: 'transparent' 
        } as React.CSSProperties}
      >
        <div className="flex flex-col min-h-full safe-top safe-bottom">
          {children}
        </div>
        <InstallPrompt />
      </body>
    </html>
  );
}