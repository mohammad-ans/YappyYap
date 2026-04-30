import "./SigninError.css"
import gsap from "gsap"
import { useGSAP } from "@gsap/react"
import { useEffect, useRef } from "react"
import useChatAuth from "../hooks/useChatAuth"
export default function SigninError() {
    const {errorMsg} = useChatAuth()
    const {errorMsgAnimation} = useChatAuth()
    const timeline = useRef();
    useGSAP(()=>{
        timeline.current = gsap.timeline({paused : true});
        timeline.current.to(".signin-error", {
            x : 0,
            duration : 1,
            display : "flex"
        }).to(".signin-error", {
            x : 300,
            delay : 3,
            display : "none",
            duration : 1
        })
    }, [])
    useEffect(()=>{
        const element = document.querySelector(".signin-error-error");
        const element2 = document.querySelector(".signin-error-decoration")
        if (errorMsg === "Successfuly Logged In" || errorMsg === "Welcome to our page" || errorMsg === "OTP Sent" || errorMsg === "Success" || errorMsg == "Successfully done"){
            element.style.color = "rgb(104, 234, 104)"
            element2.style.backgroundColor = "rgb(104, 234, 104)"
        }
        else{
            element.style.color = "rgb(238, 79, 79)"
            element2.style.backgroundColor = "rgb(238, 79, 79)"
        }
        if(timeline.current){
            timeline.current.restart()
            timeline.current.pause()
            timeline.current.play()
        }
    }, [errorMsgAnimation])
    return(
        <div className="signin-error">
            <div className="signin-error-decoration"></div>
            <div className="signin-error-error">{errorMsg}</div>
        </div>
    )
}