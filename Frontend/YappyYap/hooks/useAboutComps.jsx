import { useState, createContext, useContext, useEffect } from "react";
import useAxios from "./useAxios";

const AboutContext = createContext();
export default function useAboutComps() {
    return useContext(AboutContext)
}
export function AboutCompsProvider({children}) {
    const axios = useAxios();
    const [contents, setContents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [compsChecker, setCompsCheck] = useState(false);
    async function getAboutComps() {
        setLoading(false)
        try{
            const response = await axios.get("https://dashboard.yappyyap.xyz/get/aboutcomps");
            if (response.data.msg == "Success") {
                // setContents(pre=> response.data.content);
            }
        }
        catch{

        }
        finally{
            setContents(["hi", "by"]);
            setLoading(false)
        }
    }
    useEffect(()=>{
        getAboutComps()
    }, [compsChecker])
    return(
        <AboutContext.Provider value={{contents, loading, setCompsCheck}}>
            {children}
        </AboutContext.Provider>
    )
}