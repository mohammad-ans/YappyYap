import { useContext, createContext, useState, useEffect, useRef } from "react";
import useAxios from "./useAxios";
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
                const response = await axios.get("http://localhost:8001/logincheck");
                if (response.data.msg == "Success") {
                    setLogged(true)
                    setUsername(response.data.username);
                }
            }
            catch{}
            finally{
                setLoading(false);
                    setLogged(true)
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