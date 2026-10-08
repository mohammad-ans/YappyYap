import defaultImg from "./assets/default_img.png"
import "./Account.css"
import useAxios from "../hooks/useAxios"
import { useEffect, useRef, useState } from "react";
import useChatAuth from "../hooks/useChatAuth";
import AccActiveMsg from "./AccActiveMsg";
import { useNavigate } from "react-router-dom";
import { AUTH_URL, DM_URL, GROUPS_URL } from "./config";
export default function Account() {
    const axios = useAxios();
    const [key, setKey] = useState();
    const {setError, setTrigger, setLogged, setUsername} = useChatAuth()
    const [msgList, setMsg] = useState([])
    const [userType, setUserType] = useState("")
    const [confirmDelete, setConfirmDelete] = useState(false)
    const [busy, setBusy] = useState(false)
    const navigate = useNavigate()
    useEffect(()=>{
        async function getUserDetails(){
            try{
                const response = await axios.get(`${AUTH_URL}/userdetails`)
                const elements = document.querySelector(".account-details").children;
                elements[1].textContent = response.data.username;
                elements[2].textContent = response.data.user_type;
                setUserType(response.data.user_type);
            }
            catch(e){
                setError("Credentials Loading Failed. Login Expired")
                setTrigger(t => !t);
                console.log(e)
            }
        }
        getUserDetails();
    }, [])
    function loggedOut(msg) {
        setLogged(false);
        setUsername("");
        setError(msg);
        setTrigger(t => !t);
        navigate("/");
    }
    async function signOut() {
        setBusy(true);
        try{
            // Guests are removed on sign out so their generated name is freed
            if (userType == "Guest")
                // await axios.post("http://localhost:8001/signoutguest")
                await axios.post(`${AUTH_URL}/signoutguest`)
            else
                // await axios.get("http://localhost:8001/signout")
                await axios.get(`${AUTH_URL}/signout`)
            loggedOut("Signed out");
        }
        catch(e){
            setError("Could not sign out, try again");
            setTrigger(t => !t);
        }
        finally{
            setBusy(false);
        }
    }
    async function deleteAccount() {
        setBusy(true);
        try{
            // Hand over or remove realms/groups and DMs first, then delete the login itself
            await axios.delete(`${GROUPS_URL}/users/me`);
            await axios.delete(`${DM_URL}/users/me`);
            // await axios.post("http://localhost:8001/delete")
            await axios.post(`${AUTH_URL}/delete`)
            loggedOut("Account deleted");
        }
        catch(e){
            setError("Could not delete the account, try again");
            setTrigger(t => !t);
        }
        finally{
            setBusy(false);
            setConfirmDelete(false);
        }
    }
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
            <div className="account-actions">
                <button className="sign-button" onClick={signOut} disabled={busy}>Sign Out</button>
                {userType && userType != "Guest" && !confirmDelete && <button className="sign-button" onClick={() => setConfirmDelete(true)} disabled={busy}>Delete Account</button>}
                {confirmDelete && <div className="account-delete-confirm">
                    <p>Delete your account? Realms and groups you own go to the next admin or member, or are deleted if nobody is left. Your messages are deleted. This cannot be undone.</p>
                    <button className="sign-button" onClick={deleteAccount} disabled={busy}>{busy ? "Deleting..." : "Yes, delete"}</button>
                    <button className="sign-button" onClick={() => setConfirmDelete(false)} disabled={busy}>Cancel</button>
                </div>}
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