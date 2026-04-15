import type { Metadata, Viewport } from "next";
import { Bebas_Neue, Nunito, Ubuntu } from "next/font/google";
import "./globals.css";
import InstallPrompt from "@/components/InstallPrompt"; //

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
  weight:['400', '500', '700'],
  subsets: ["latin"],
  variable: '--font-ubuntu',
});

// This forces the phone's top status bar and prevents annoying zooming on inputs
export const viewport: Viewport = {
  themeColor: "#110c94",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1, 
  userScalable: false,
};

export const metadata: Metadata = {
  title: "Coach Strong | Inspire Change",
  description: "High Performance Health & Wellbeing by Eske Dost",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Coach Strong",
    // Tells iPhones to use your new Canva Splash Screen
    startupImage:[
      {
        url: "/splash-screen.png",
      },
    ],
  },
  icons: {
    icon: "/icon-192.png",
    // Forces iOS to use the high-res 512px icon you made
    apple: "/icon-512.png", 
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${bebasNeue.variable} ${nunito.variable} ${ubuntu.variable}`}>
      <body className="font-sans bg-brand-sand text-brand-dark antialiased">
        {children}
        
        {/* ADD THE PROMPT HERE */}
        <InstallPrompt />
      </body>
    </html>
  );
}