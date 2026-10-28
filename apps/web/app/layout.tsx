import type { Metadata, Viewport } from "next";
import PwaRegister from "./pwa-register";
import "./globals.css";
export const metadata: Metadata = {
  title: "OrbitAI — seu próximo passo",
  description: "Iniciar Conexão. Demonstração com dados sintéticos.",
  applicationName: "OrbitAI",
  appleWebApp: { capable: true, title: "OrbitAI", statusBarStyle: "default" },
  icons: { icon: "/icons/orbit-192.png", apple: "/icons/orbit-180.png" },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#080d12",
  interactiveWidget: "resizes-content",
};
export default function Layout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
