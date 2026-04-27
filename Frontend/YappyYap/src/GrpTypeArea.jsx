import { useEffect, useRef, useState } from "react"
import { gsap } from "gsap/gsap-core"
import useAxios from "../hooks/useAxios"
import default_image from "./assets/default_img.png"
import useChatAuth from "../hooks/useChatAuth";
import { useNavigate } from "react-router-dom";
export default function GrpTypeArea(props){
    const [msg, setMsg] = useState("");
    const textArea = useRef();
    const [bold, setBold] = useState(false);
    const [italic, setItalic] = useState(false);
    const [strike, setStrike] = useState(false);
    const [optionsOpen, setOptionsOpen] = useState(false);
    const [yapDuration, setYapDuration] = useState(10);
    const {setError, setTrigger} = useChatAuth();
    const navigate = useNavigate()
    const anonymity = useRef(false);
    useEffect(() => {
        textArea.current.style.height = "auto";
        if (textArea.current.scrollHeight < 400) {
            textArea.current.style.height = textArea.current.scrollHeight + "px";
        }
        else {
            textArea.current.style.height = "400px";
        }
    }, [msg])
    // const [msgs, setMsgs] = useState(Array());
    function optionsAnimation() {
        if (optionsOpen) {
            gsap.to(".chat-message-style-buttons", {
                x: -20,
                duration: 0.5,
                stagger: 0.1,
            })
            gsap.to(".chat-message-style-buttons", {
                display: "none",
                duration: 0.2,
            })
            gsap.to(".arrow-animationa", {
                rotate: "0deg",
                x: 0,
                duration: 0.6,
            })
            gsap.to(".arrow-animationb", {
                rotate: "0deg",
                display: "none",
                duration: 0.1,
                x: 0,
            })
        }
        else {
            gsap.to(".arrow-animationb", {
                delay: 0.4,
                rotate: "1080deg",
                display: "inline-block",
                duration: 0.1,
                x: 5,
            })
            gsap.to(".arrow-animationa", {
                rotate: "1440deg",
                x: 150,
                duration: 0.6,
            })
            gsap.to(".chat-message-style-buttons", {
                x: 20,
                duration: 0.5,
                stagger: 0.1,
            })
            gsap.to(".chat-message-style-buttons", {
                display: "inline",
                duration: 0.2,
            })
        }
        setOptionsOpen((o) => !o);
    }
    function sendMsg() {
        if (msg.trim() == "") {
            return;
        }
        if (props.ws.current && props.ws.current.readyState == WebSocket.OPEN) {
            let message = {
                "msg" : msg.trim(),
                "expire" : yapDuration
            }
            if (anonymity.current) {
                message["anonymity"] = true
            }
            props.ws.current.send(JSON.stringify(message));
        }
        
        textArea.current.value = "";
        // textArea.current.focus()
        setMsg("");
    }
    function boldHandler(e) {
        if (!bold) {
            e.target.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
        }
        else {
            e.target.style.backgroundColor = "transparent";
        }
        setBold((b) => !b);
    }
    function italicHandler(e) {
        if (!italic) {
            e.target.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
        }
        else {
            e.target.style.backgroundColor = "transparent";
        }
        setItalic((b) => !b);
    }
    function strikeHandler(e) {
        if (!strike) {
            e.target.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
        }
        else {
            e.target.style.backgroundColor = "transparent";
        }
        setStrike((b) => !b);
    }
    function changeHandler(e) {
        // console.log(e.nativeEvent.data)
        // if(bold) {
        //     setMsg((m)=> m +`<i>${e.nativeEvent.data}</i>`)
        // }
        // else{
        setMsg(e.target.value);
        // }
    }
    function yapDurationhandler(e) {
        setYapDuration(e.target.value);
    }
    function enterKeyHandler(e) {
        if (e.key == "Enter") {
            sendMsg();
        e.preventDefault();
        }
    }
    function anonymityHandler() {
        let xTravel;
        const element = document.querySelector(".anonymity-off");
        if (anonymity.current) {
            xTravel = 0;
            element.classList.remove("anonymity-on");
        }
        else{
            xTravel = 27;
            element.classList.add("anonymity-on");
        }
        gsap.to(".anonymity-button-circle", {
            x : xTravel,
            duration : 0.1
        })
        anonymity.current = !anonymity.current;
    }
        return (
                    <div className="type-area-overlay">
                        <div className="type-area" onKeyDown={enterKeyHandler}>
                            <span className="options-chat-message">
                                <button className="chat-show-options" onClick={optionsAnimation}>Options <span className="arrow-style arrow-animationa">{">"}</span></button>
                                <button className="chat-bold chat-message-style-buttons" onClick={boldHandler}>B</button>
                                <button className="chat-italic chat-message-style-buttons" onClick={italicHandler}>I</button>
                                <button className="chat-strike chat-message-style-buttons" onClick={strikeHandler}>S</button>
                                <button className="chat-show-options" onClick={optionsAnimation}><span className="arrow-style arrow-animationb">{"<"}</span></button>
                            </span>
                            <textarea placeholder="Enter message" ref={textArea} value={msg} onChange={changeHandler} className="send-message" />
                            <div className="chat-yap-duration">
                                <div className="anonymity-button-area">
                                    <span className="input-label">Anonymity: </span>
                                    <button className="anonymity-off" onClick={anonymityHandler}><span className="anonymity-button-circle"></span></button>
                                </div>
                                <div>
                                <span className="input-label">Duration: </span>
                                <input type="range" value={yapDuration} min={10} max={300} step={5} onChange={yapDurationhandler} />
                                <span id="chat-yap-duration">{`${yapDuration}s`}</span>
                                </div>
                            </div>
                            <button onClick={sendMsg} className="send-button">
                                <svg className="chat-sendsvg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M2 21L23 12L2 3L6 12L2 21Z" />
                                    <path d="M6 12L23 12" />
                                </svg></button>
                        </div>
                    </div>
    )
}