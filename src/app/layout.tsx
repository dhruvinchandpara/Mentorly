import type { Metadata } from "next";
import { Newsreader, Manrope } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { QueryProvider } from "@/context/QueryProvider";
import { TestRoleSwitcher } from "@/components/ui/test-role-switcher";

// Display serif - headings, hero copy (Mesa brand pairing)
const newsreader = Newsreader({
 variable: "--font-newsreader",
 subsets: ["latin"],
 display: "swap",
 weight: ["400", "500", "600", "700"],
 style: ["normal", "italic"],
 preload: true,
 fallback: ['Georgia', 'serif'],
});

// Body sans - UI copy, labels (Mesa brand pairing)
const manrope = Manrope({
 variable: "--font-manrope",
 subsets: ["latin"],
 display: "swap",
 weight: ["400", "500", "600", "700", "800"],
 preload: true,
 fallback: ['system-ui', 'arial'],
});

export const metadata: Metadata = {
 title: "Mentorly | Connect with Expert Mentors",
 description: "Accelerate your career with personalized mentorship. Book sessions with industry leaders in Product, Engineering, Design, and more.",
 openGraph: {
 title: "Mentorly",
 description: "Connect with expert mentors and accelerate your career.",
 url: "https://mentorly.vercel.app", // Placeholder, user should update if needed
 siteName: "Mentorly",
 locale: "en_US",
 type: "website",
 },
 twitter: {
 card: "summary_large_image",
 title: "Mentorly",
 description: "Accelerate your career with personalized mentorship.",
 },
};

export default function RootLayout({
 children,
}: Readonly<{
 children: React.ReactNode;
}>) {
 return (
 <html lang="en" suppressHydrationWarning>
 <body
 className={`${newsreader.variable} ${manrope.variable} antialiased`}
 suppressHydrationWarning
 >
 <AuthProvider>
        <QueryProvider>
          {children}
          <TestRoleSwitcher />
        </QueryProvider>
      </AuthProvider>
 </body>
 </html>
 );
}
