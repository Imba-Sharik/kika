"use client"

import { useState } from "react"
import { Building2 } from "lucide-react"
import { RetailDemoPage } from "./RetailDemoPage"
import { BRANDS, type Brand } from "./brands"

const X5_BRANDS: Brand["key"][] = ["pyaterochka", "perekrestok", "chizhik"]

export function X5TechSwitcher() {
  const [activeKey, setActiveKey] = useState<Brand["key"]>("pyaterochka")
  const active = BRANDS[activeKey]

  return (
    <>
      <div
        className="fixed left-1/2 top-2 z-50 -translate-x-1/2 rounded-full bg-white/95 px-2 py-1.5 shadow-lg ring-1 ring-neutral-200 backdrop-blur"
      >
        <div className="flex items-center gap-1">
          <span className="ml-2 mr-2 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-neutral-700">
            <Building2 size={12} className="shrink-0" />
            X5 Tech · единая AI-команда
          </span>
          {X5_BRANDS.map(key => {
            const brand = BRANDS[key]
            const isActive = key === activeKey
            return (
              <button
                key={key}
                onClick={() => setActiveKey(key)}
                className="rounded-full px-3 py-1 text-xs font-semibold transition"
                style={{
                  backgroundColor: isActive ? brand.color : "transparent",
                  color: isActive ? "#fff" : brand.color,
                  border: isActive ? "none" : `1px solid ${brand.color}40`,
                }}
              >
                {brand.name}
              </button>
            )
          })}
        </div>
      </div>

      <RetailDemoPage key={active.key} brandKey={active.key} />
    </>
  )
}
