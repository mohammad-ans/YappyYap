import {useState} from "react"
import { Link, useNavigate } from "react-router-dom"
import "./SignIn.css"
import useAxios from "../hooks/useAxios";
import Onfire from "./OnFire";
import useChatAuth from "../hooks/useChatAuth";

export default function SignUp(props) {
    const [email, setEmail] = useState("");
    const [username, setusername] = useState("");
    const {setTrigger} = useChatAuth()
    const {setError} = useChatAuth()
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate()
    async function sendOtp(e){
        setLoading(true);
        e.preventDefault();
        const axios = useAxios();
        try{
            const resp = await axios.post("http://localhost:8001", "/signup", {
                email: email,
                username: username
            })
            if (resp.data.msg == "Success"){
                props.setEmail(email);
                navigate("otp");
                setError("OTP Sent");
            }
        }
        catch(exception){
            if (exception.response && exception.response.data) {
                setError(exception.response.data.detail[0].msg);
            }
            else{
                setError("Something went wrong. Try Again");
            }
        }
        finally{
            setTrigger(val => !val);
            setLoading(false);
        }
    }
    return (
        <div className="background-signin">
        <form onSubmit={sendOtp} className="sign-form">
            <div className="signin-up">
                <h2 className="signin-up-heading">Sign Up</h2>
                <p className="signin-up-p">Already have an account. <Link className="signin-up-a" to="/signin">Sign In</Link></p>
                <hr />
            </div>
        <ul className="signin-list">
            <li className="margin-10px">
                <label>
                    Username
                </label>
                <div className="signform-input">                    
                <input className="username-input" type="text" placeholder="Username" value={username} onChange={(e) => setusername(e.target.value)} required/>
                </div>
        </li>
            <li>
                <label>
                    Enter your email
                </label>
                <div className="signform-input">                    
                <input className="email-input" type="email" placeholder="Enter your email" value={email} onChange={(e) => setEmail(e.target.value)} required/>
                </div>
        </li>

        <li>
        <button className="sign-button" type="submit" disabled={loading} >{loading ? "Processing..." : "Send OTP"}</button></li>
        </ul>
        </form>
        <Onfire loading={loading}/>
        </div>
    )
}