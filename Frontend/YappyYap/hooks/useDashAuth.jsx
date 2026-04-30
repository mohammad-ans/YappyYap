import { useContext, createContext, useState, useEffect } from "react";
import useAxios from "./useAxios";
const DashboardAuth = createContext();
export default function useDashAuth(){
    return useContext(DashboardAuth)
} 
export function DashboardAuthProvider({children}){
    const[isAdmin, setIsAdmin] = useState(false);
    const[checking, setChecking] = useState(true);
    useEffect(()=>{
        async function adminCheck() {
            try{
                const axios = useAxios();
                // const response = await axios.get("http://localhost:8001", "/admincheck");
                const response = await axios.get("https://auth.yappyyap.xyz/admincheck");
                if (response.data.msg == "Success") {
                    setIsAdmin(true);
                }
            }
            catch(e){
                setIsAdmin(false);
            }
            finally{
                setChecking(false);
            }
        }
        adminCheck();
    }, [])
    return(
        <DashboardAuth.Provider value={{isAdmin, checking}}>
            {children}
        </DashboardAuth.Provider>
    )   
}