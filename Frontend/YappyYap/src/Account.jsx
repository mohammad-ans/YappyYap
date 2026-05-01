import defaultImg from "./assets/default_img.png"
import "./Account.css"
import useAxios from "../hooks/useAxios"
import { useEffect, useRef, useState } from "react";
import useChatAuth from "../hooks/useChatAuth";
import AccActiveMsg from "./AccActiveMsg";
export default function Account() {
    const axios = useAxios();
    const [key, setKey] = useState();
    const {setError, setTrigger} = useChatAuth()
    const [msgList, setMsg] = useState([])
    useEffect(()=>{
        async function getUserDetails(){
            try{
                const response = await axios.get("https://auth.yappyyap.xyz/userdetails")
                const elements = document.querySelector(".account-details").children;
                elements[1].textContent = response.data.username;
                elements[2].textContent = response.data.user_type;
            }
            catch(e){
                setError("Credentials Loading Failed. Login Expired")
                setTrigger(t => !t);
                console.log(e)
            }
        }
        getUserDetails();
    }, [])
    function removeChild(key){
        setMsg(pre => pre.filter(element => element.id != key));
    }
    async function fetchMessages() {
        try{
            const response = await axios.get("/voice/accountmsgs");
            setMsg(msg => response.data.msgs.map(obj => {
                obj.id = crypto.randomUUID();
                return obj;
            }));
        }
        catch(e){
            console.log(e)
        }
    }
    return(
        <div className="account-area">
            <div className="account-details">
                <img src={defaultImg} alt="UserPic" />
                <p className="account-username"></p>
                <p className="account-type"></p>
            </div>
            <h2>Active Messages: </h2>
            <div className="active-messages">
                <button className="fetch-messages" onClick={fetchMessages} disabled={true}>Fetch Active Messages(Under Development)</button>
                {msgList.map(element => {
                    let time_sent = new Date(element.time_sent).toLocaleTimeString([], {hour : "2-digit", minute : "2-digit"})
                    let expirySeconds = Math.trunc((new Date(element.expiry) - new Date())/ 1000);
                    // let expirySeconds = 30;
                    let id = element.id;
                    let msg = "Voice Msg";
                    if (element.msg) {
                        msg = element.msg
                    }
                    return <AccActiveMsg key={id} id={id} msg={msg} time={time_sent} expirySeconds={expirySeconds} removeYourself={removeChild}/>
                    })}
            </div>
        </div>
    )
}