import { Header } from "@/widgets/header/ui/Header"

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col bg-[#0A0A0F] text-white antialiased">
      {/* Background glow — как на лендинге */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-1/2 top-0 h-[600px] w-[800px] -translate-x-1/2 rounded-full bg-pink-500/15 blur-[120px]" />
        <div className="absolute right-0 top-[300px] h-[400px] w-[400px] rounded-full bg-violet-600/15 blur-[100px]" />
      </div>
      <Header />
      <main className="flex-1 pt-16">{children}</main>
    </div>
  )
}
