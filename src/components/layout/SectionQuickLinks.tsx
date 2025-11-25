import Link from "next/link"
import { ChevronRight } from "lucide-react"

import { cn } from "@/lib/utils"

type SectionQuickLinksProps = {
  sectionTitle: string
  links: {
    title: string
    url: string
  }[]
  activePath: string
  className?: string
}

const normalizePath = (path: string) => {
  if (!path) return "/"
  const [base] = path.split("?")
  if (base === "/") return base
  return base.endsWith("/") ? base.slice(0, -1) : base
}

export function SectionQuickLinks({
  sectionTitle,
  links,
  activePath,
  className,
}: SectionQuickLinksProps) {
  if (!links?.length) return null

  const normalizedActive = normalizePath(activePath)

  // Find the best matching link (longest URL that is a prefix of current path)
  const activeLinkUrl = links.reduce((best, link) => {
    const target = normalizePath(link.url)
    if (normalizedActive === target || normalizedActive.startsWith(`${target}/`)) {
      if (!best || target.length > best.length) {
        return target
      }
    }
    return best
  }, "")

  return (
    <div
      className={cn(
        "flex flex-nowrap items-center gap-2 overflow-x-auto pb-2 md:pb-0",
        "justify-end w-full",
        className,
      )}
    >
      {links.map((link) => {
        const normalizedTarget = normalizePath(link.url)
        const isActive = normalizedTarget === activeLinkUrl

        return (
          <Link
            key={`${link.title}-${link.url}`}
            href={link.url}
            className={cn(
              "inline-flex min-w-[130px] items-center justify-center gap-2 whitespace-nowrap rounded-full border px-5 py-2.5 text-sm font-medium leading-none transition-all duration-300 ease-out",
              "backdrop-blur-3xl shadow-sm",
              isActive
                ? "border-slate-200 bg-slate-900 text-white shadow-lg ring-1 ring-slate-900/10 dark:border-white/40 dark:bg-white/20 dark:text-white dark:shadow-[0_0_30px_-10px_rgba(255,255,255,0.3)] dark:ring-white/20"
                : "border-slate-200/60 bg-slate-50/50 text-slate-600 hover:bg-white hover:text-slate-900 hover:border-slate-300 hover:shadow-md dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white dark:hover:border-white/20",
            )}
            aria-label={`${sectionTitle} - ${link.title}`}
          >
            <span className="flex items-center gap-1">
              <ChevronRight
                className={cn(
                  "h-3 w-3 transition-colors",
                  isActive ? "text-white" : "text-slate-800 group-hover:text-slate-900",
                )}
              />
              <span>{link.title}</span>
            </span>
          </Link>
        )
      })}
    </div>
  )
}
