import { useState } from "react";
import "./SignIn.css"
import useAxios from "../hooks/useAxios";

export default function AddUsername(){
    const [error, setError] = useState("");
    const [username, setUsername] = useState("");
    const axios = useAxios();
    async function addUsername() {
        try{
            const response = await axios.post("http://localhost:8001/add/username", {
                username : username
            })
        }
        catch(e) {
            setError("Adding username failed.")
        }
    }
    return (
        <div className="add-username-coverarea">
        <div className="add-username">
            
            <p>Enter a unique username</p>
                <input className="username-input addusername" type="text" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)}/>

            <button className="sign-button">Continue</button>
            <p className="error">{error}</p>
        </div>
        </div>
    )
}