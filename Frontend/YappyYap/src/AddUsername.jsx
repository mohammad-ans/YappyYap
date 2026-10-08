import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./SignIn.css"
import useAxios from "../hooks/useAxios";
import useChatAuth from "../hooks/useChatAuth";
import { takeNext } from "./authRedirect";

// Last step of signing up with Google: the email is already verified, only a username is needed
export default function AddUsername(props){
    const [error, setError] = useState("");
    const [username, setUsername] = useState("");
    const [loading, setLoading] = useState(false);
    const {setLogged, setUsername: setAuthUsername} = useChatAuth();
    const navigate = useNavigate();
    const axios = useAxios();
    async function addUsername(e) {
        e.preventDefault();
        setLoading(true);
        try{
            // const response = await axios.post("http://localhost:8001/add/google", {
            const response = await axios.post("https://auth.yappyyap.xyz/add/google", {
                username : username
            })
            if (response.data.msg == "Success") {
                setLogged(true);
                setAuthUsername(response.data.username);
                navigate(takeNext());
            }
        }
        catch(e) {
            if (e.response && e.response.data)
                setError(e.response.data.detail[0].msg)
            else
                setError("Adding username failed.")
        }
        finally{
            setLoading(false);
        }
    }
    return (
        <div className="add-username-coverarea">
        <form className="add-username" onSubmit={addUsername}>
            <p>Choose a unique username for {props.email}</p>
                <input className="username-input addusername" type="text" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} pattern="[A-Za-z0-9_]{3,20}" title="3-20 characters: letters, digits or _" required/>

            <button className="sign-button" type="submit" disabled={loading}>{loading ? "Processing..." : "Continue"}</button>
            <p className="error">{error}</p>
        </form>
        </div>
    )
}
