export default function Preloader() {
    return (
        <div className="fixed inset-0 bg-white z-[99999] flex items-center justify-center">
            <div className="text-center">
                <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="mx-auto">
                    <rect x="5" y="5" width="70" height="70" rx="16" fill="#FEC201"/>
                    <text x="28" y="55" fontFamily="Arial" fontWeight="bold" fontSize="36" fill="#034460">S</text>
                </svg>
                <div className="mt-5 w-12 h-12 border-[5px] border-brand-1 border-b-brand-2 rounded-full animate-spin mx-auto"/>
            </div>
        </div>
    )
}
