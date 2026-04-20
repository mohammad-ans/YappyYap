import { useEffect } from "react"
import useAxios from "../hooks/useAxios";
import { useNavigate } from "react-router-dom";
import useChatAuth from "../hooks/useChatAuth";
import "./otpform.css"
export default function OTPForm(props) {
    const navigate = useNavigate();
    const {setTrigger} = useChatAuth();
    const {setError} = useChatAuth();
    const { setUsername } = useChatAuth();
    const { setLogged } = useChatAuth();
    useEffect(()=>{
        document.querySelector(".otp-enter-design").focus()
    }, [])
    async function otpVerification(otp) {
        const axios = useAxios();
        try {
            const response = await axios.post("http://localhost:8001", props.link, {
                email: props.email,
                otp: otp
            })
            if (response.data.msg == "Success") {
                setError("Successfuly Logged In");
                setLogged(true);
                setUsername(response.data.username);
                navigate("/chat")
            }
        }
        catch (err) {
            setError("Invalid or expired OTP");
        }
        finally {
            setTrigger(e => !e);
        }
    }
    function otpInput(e) {
        if (e.target.value.length != 0) {
            const sibling = e.target.nextElementSibling;
            if (sibling) {
                sibling.focus()
            }
            else {
                let temp = "";
                const siblings = e.target.parentNode.children;
                for (let i = 0; i < siblings.length; i++) {
                    temp += siblings[i].value
                }
                otpVerification(temp);
            }
        }
    }
    function otpInputBackLogic(e) {
        if (e.code === "Backspace" && e.target.value.length === 0) {
            const sibling = e.target.previousElementSibling;
            if (sibling)
                sibling.focus()
        }
    }
    return (
        <div className="background-signin otp-form">
            <h2>Enter the OTP sent to your mail</h2>
            <ul className="otp-list">
                <li className="margin-10px">
                    <div className="otp-input">
                        <input type="text" className="otp-enter-design" maxLength={1}
                            onChange={otpInput} onKeyDown={otpInputBackLogic} />
                        <input type="text" className="otp-enter-design" maxLength={1}
                            onChange={otpInput} onKeyDown={otpInputBackLogic} />
                        <input type="text" className="otp-enter-design" maxLength={1}
                            onChange={otpInput} onKeyDown={otpInputBackLogic} />
                        <input type="text" className="otp-enter-design" maxLength={1}
                            onChange={otpInput} onKeyDown={otpInputBackLogic} />
                        <input type="text" className="otp-enter-design" maxLength={1}
                            onChange={otpInput} onKeyDown={otpInputBackLogic} />
                        <input type="text" className="otp-enter-design" maxLength={1}
                            onChange={otpInput} onKeyDown={otpInputBackLogic} />
                    </div>
                </li>
                <li>
                    {/* <button onClick={otpVerification} className="sign-button" disabled={loading}>{loading ? "Verifying..." : "Verify"}</button>
            <p style = {msg == "Successfully logged in" ? {color : "green"} : {color : "red"}}>{msg}</p> */}
                </li>
            </ul>
        </div>
    )
}