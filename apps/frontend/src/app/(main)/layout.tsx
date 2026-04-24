import { Header } from "@/widgets/header/ui/Header"

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col h-full">
      <Header />
      <main className="flex-1 overflow-y-auto pt-16">{children}</main>
    </div>
  )
}
