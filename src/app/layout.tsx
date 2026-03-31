import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { QueryProvider } from "@/context/QueryProvider";

// Modern, professional sans-serif - exceptional for UI clarity
const inter = Inter({
 variable: "--font-inter",
 subsets: ["latin"],
 display: "swap",
 weight: ["400", "500", "600", "700"], // Reduced weights for faster loading
 preload: true,
 fallback: ['system-ui', 'arial'],
});

// Sharp, modern monospace for code and data
const jetbrainsMono = JetBrains_Mono({
 variable: "--font-jetbrains-mono",
 subsets: ["latin"],
 display: "swap",
 weight: ["400", "600"], // Reduced weights for faster loading
 preload: false, // Only preload primary font
 fallback: ['monospace'],
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
 className={`${inter.variable} ${jetbrainsMono.variable} antialiased`}
 suppressHydrationWarning
 >
 <AuthProvider>
 <QueryProvider>
 {children}
 </QueryProvider>
 </AuthProvider>
 </body>
 </html>
 );
}
