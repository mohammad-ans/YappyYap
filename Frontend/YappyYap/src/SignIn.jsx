import {useState} from "react"
import { Link, useNavigate } from "react-router-dom"
import useAxios from "../hooks/useAxios"
import Onfire from "./OnFire"
import "./SignIn.css"
import useChatAuth from "../hooks/useChatAuth"

export default function SignIn(props) {
    const [email, setEmail] = useState("");
    const {setError, setTrigger} = useChatAuth();
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const axios = useAxios();
    async function sendOtp(e){
        setLoading(true);
        e.preventDefault()
        try{
            const resp = await axios.post("http://localhost:8001", "/signin", {
                email: email
            })
            if (resp.data.msg == "Success"){
                props.setEmail(email);
                navigate("otp");
                setError("OTP Sent")
            }
            else{
                setError(resp.data.message)
            }
        }
        catch(exception){
            if (exception.response && exception.response.data){
                setError(exception.response.data.detail[0].msg);
            }
            else
                setError("Something went wrong. Try Again");
        }
        finally{
            setLoading(false);
            setTrigger(e => !e);
        }
    }
    return (
        <div className="background-signin">
        <form onSubmit={sendOtp} className="sign-form">
            <div className="signin-up">
                <h2 className="signin-up-heading">Sign In</h2>
                <p className="signin-up-p">Don't have an account. <Link className="signin-up-a" to="/signup">Sign Up</Link></p>
                <hr />
            </div>
        <ul className="signin-list">
            <li>
                <label>
                    Enter your email
                </label>
                <div className="signform-input">                    
                <input className="email-input"type="email" placeholder="Enter your email" value={email} onChange={(e) => setEmail(e.target.value)} required/>
                </div>
        </li>

        <li>
        <button className="sign-button" type="submit" disabled={loading} >{loading ? "Processing...":"Send OTP"}</button></li>
        </ul>
        </form>
        <Onfire loading={loading}/>
        </div>
    )
}