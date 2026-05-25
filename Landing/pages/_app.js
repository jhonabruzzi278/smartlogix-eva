import Preloader from "@/components/elements/Preloader"
import { useEffect, useState } from "react"
import "@/styles/globals.css"
import "swiper/css"
import "swiper/css/pagination"

function MyApp({ Component, pageProps }) {
    const [loading, setLoading] = useState(true)
    useEffect(() => {
        setTimeout(() => { setLoading(false) }, 800)
    }, [])
    return <>{!loading ? <Component {...pageProps} /> : <Preloader />}</>
}
export default MyApp
