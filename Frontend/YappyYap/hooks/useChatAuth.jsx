import { useContext, createContext, useState, useEffect, useRef } from "react";
import useAxios from "./useAxios";
import { AUTH_URL } from "../src/config";
const ChatAuth = createContext()
export default function useChatAuth() {
    return useContext(ChatAuth)
}
export function ChatAuthProvider({children}){
    const [logged, setLogged] = useState(false);
    const [username, setUsername] = useState("");
    const [loading, setLoading] = useState(true);
    const [errorMsg, setError] = useState("Welcome to our page");
    const [errorMsgAnimation, setTrigger] = useState(false);
    useEffect(()=>{
        async function makereq() {
            const axios = useAxios();
            try{
                const response = await axios.get(`${AUTH_URL}/logincheck`);
                // const response = await axios.get("https://auth.yappyyap.xyz/logincheck");
                if (response.data.msg == "Success") {
                    setLogged(true)
                    setUsername(response.data.username);
                }
            }
            catch{
                // No valid session: protected pages redirect to sign up
                setLogged(false)
            }
            finally{
                setLoading(false);
            }
        }
        makereq();

    },[])
    return(
        <ChatAuth.Provider value={{logged, username, loading, setLogged, setUsername, errorMsg, setError, errorMsgAnimation, setTrigger}}>
            {children}
        </ChatAuth.Provider>
    )
}