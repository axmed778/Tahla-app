import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { I18nProvider } from "@/components/i18n-provider";
import { ProfileGuard } from "@/components/profile-guard";
import { getCurrentUser } from "@/actions/auth";
import { getLocale, getMessages } from "@/lib/i18n";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Təhlə App",
  description: "Family and relatives directory",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [locale, user] = await Promise.all([getLocale(), getCurrentUser()]);
  const messages = getMessages(locale);
  return (
    <html lang={locale}>
      <body className={inter.className}>
        <I18nProvider locale={locale} messages={messages}>
          <ProfileGuard user={user}>
            {children}
            <Toaster />
          </ProfileGuard>
        </I18nProvider>
      </body>
    </html>
  );
}
