// 하단 브랜드 푸터 — TTAK. — PERFECT SLOT ONLY

export function Footer({ dark = false }: { dark?: boolean }) {
  return (
    <footer className="py-[22px] opacity-40">
      <p
        className={`text-center font-galmuri9 text-[10px] font-black tracking-[1px] uppercase ${
          dark ? 'text-white' : 'text-ink'
        }`}
      >
        TTAK<span className={dark ? 'text-white' : 'text-primary'}>.</span> — PERFECT SLOT ONLY
      </p>
    </footer>
  )
}
