import { useState, useContext, createContext, useEffect } from "react";
import useAxios from "./useAxios";
import { unzipSync } from "fflate";
const HomeComps = createContext()
export default function useHomeComps(){
    return useContext(HomeComps)
}
export function HomeCompsProvider({children}) {
    const [headings, setHeadings] = useState([]);
    const [contents, setContent ] = useState([]);
    const [urls, setUrls] = useState([]);
    const [loading, setLoading] = useState(true);
    const [compsChecker, setCompsCheck] = useState(true)
    const axios = useAxios();
    async function getComps(){
        try{
            setHeadings(pre=> [])
            setUrls(pre=>[])
            setContent(pre=>[])
            setLoading(l => true);
            const response = await axios.get("https://dashboard.yappyyap.xyz/get/homecomps", {
                responseType : "arraybuffer"
            })
            const zip = new Uint8Array(response.data)
            const files = unzipSync(zip);
            for (let filename in files){
                const file = files[filename];
                const buffer = file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength)
                const vw = new DataView(buffer);
                const textdecoder = new TextDecoder("utf-8");
                const headingLen = vw.getUint32(0, false) + 4;
                const heading = textdecoder.decode(file.slice(4, headingLen))
                const contentLen = vw.getUint32(headingLen, false) + headingLen + 4;
                const content = textdecoder.decode(file.slice(headingLen + 4, contentLen))
                const blobBytes = file.slice(contentLen)
                const blob = new Blob([blobBytes])
                const url = URL.createObjectURL(blob);
                setHeadings(pre => [...pre, heading]);
                setContent(pre => [...pre, content]);
                setUrls(pre =>[...pre, url]);
            }
        }
        catch{
        }
        finally{
            setLoading(false)
        }
    }
    useEffect(()=>{
        getComps()
    }, [compsChecker])
    return (
        <HomeComps.Provider value={{headings, contents, urls, loading, setCompsCheck}}>
            {children}
        </HomeComps.Provider>
    )
}