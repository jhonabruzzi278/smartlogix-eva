import { useEffect, useState } from "react"

export default function BackToTop() {
    const [visible, setVisible] = useState(false)
    useEffect(() => {
        const handler = () => setVisible(window.scrollY > 400)
        window.addEventListener("scroll", handler, { passive: true })
        return () => window.removeEventListener("scroll", handler)
    }, [])
    return (
        <a href="#top"
            className={`fixed bottom-6 right-6 w-11 h-11 rounded-full bg-brand-2 text-white flex items-center justify-center shadow-lg hover:bg-brand-5 hover:-translate-y-0.5 transition-all z-50 ${visible ? 'opacity-100 scale-100' : 'opacity-0 scale-75 pointer-events-none'}`}
        >
            <svg width="14" height="10" viewBox="0 0 12 8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 7L6 2L1 7"/>
            </svg>
        </a>
    )
}
