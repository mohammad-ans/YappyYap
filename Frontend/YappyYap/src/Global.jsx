import { useContext, useEffect, useRef, useState } from "react"
import { gsap } from "gsap/gsap-core"
import useAxios from "../hooks/useAxios"
import default_image from "./assets/default_img.png"
import useChatAuth from "../hooks/useChatAuth";
import { useNavigate } from "react-router-dom";
import {ChatContext} from "./ChatContext";
import Members from "./Chat-Modules/Members";
export default function Global(props) {
    const [msg, setMsg] = useState("");
    const textArea = useRef();
    const ws = useRef(null);
    const [bold, setBold] = useState(false);
    const [italic, setItalic] = useState(false);
    const [strike, setStrike] = useState(false);
    const [optionsOpen, setOptionsOpen] = useState(false);
    const [yapDuration, setYapDuration] = useState(10);
    const { setError, setTrigger } = useChatAuth();
    const {dmSendOption, setRealm, tempDM, getDms, setDms, setGroups, realmRef} = useContext(ChatContext);
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
    useEffect(() => {
        let isMounted = true;
        realmRef.current = `${props.realm}-realm`;
        const element = document.querySelector(`.${realmRef.current}`);
        setRealm(realmRef.current);
        element.classList.add("current-realm");
        const axios = useAxios()
        async function getMessages() {
            try {
                const messages = await axios.get(`http://${props.url}/getchatmsgs/${props.realm}`)
                if (messages.data.msg == "Success") {
                    const response = messages.data.msgs;
                    const parent_element = document.querySelector(".msgs");
                    parent_element.innerHTML = "";
                    response.forEach(element => {
                        let time = new Date(element.time_sent);
                        let expiry = new Date(element.expiry);
                        if (expiry - new Date() > 1500) {
                            let text = element.msg;
                            let username = element.username;
                            time = time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                            let new_element = document.createElement("li");
                            expiry = expiry.toString().replace(/\s+/g, "-").replace(/[:+().]/g, "-");
                            new_element.classList.add(expiry, "chat-message-block")
                            new_element.innerHTML = (`<img src=${default_image} alt="user" class="chat-message-img" /><span><span class="chat-message-header"><h3 class="username">${username}</h3> <p class="timestamp">${time}</p>
                                <span class="three-dots" chatOption>
                                <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><g id="dots">
                                    <circle className="cls-1" cx="16" cy="16" r="3" />
                                    <circle className="cls-1" cx="16" cy="8" r="3" />
                                    <circle className="cls-1" cx="16" cy="24" r="3" />
                                    <path className="cls-2" d="M16,13v6a3,3,0,0,0,0-6Z" />
                                    <path className="cls-2" d="M16,5v6a3,3,0,0,0,0-6Z" />
                                    <path className="cls-2" d="M16,21v6a3,3,0,0,0,0-6Z" /></g></svg>
                            <span class="send-msg-option">Send Message</span>
                            </span></span>
                                <p class="chat-message">${text}</p></span>`)
                            parent_element.append(new_element);
                        new_element.querySelector(".send-msg-option").addEventListener("click", dmUser)
                        new_element.querySelector(".three-dots").addEventListener("click", chatOption)
                        }
                    });
                }
            }
            catch (error) {
                if (error.response && error.response.data) {
                    setError(e => error.response.data.detail[0].msg);
                    setTrigger(t => !t);
                    if (ws.current && ws.current.readyState == WebSocket.OPEN)
                        ws.current.close();
                    navigate("/signin")
                }
                console.warn("Connection to server failed")
            }
        }
        const interval1 = setInterval(getMessages, 20000)
        const interval2 = setInterval(() => msgDisplay(2), 1000);
        const interval3 = setInterval(() => msgDisplay(-2), 1000);
        let webreconInterval = 2000;
        function connect() {
            // ws.current = new WebSocket(`wss://api.yappyyap.xyz/ws`);
            ws.current = new WebSocket(`ws://${props.url}/ws/${props.realm}`)
            ws.current.onopen = () => {
                getMessages()
            }
            ws.current.onclose = () => {
                if (ws.current.readyState == 0 && isMounted) {
                    reconnect();
                }
            }
            ws.current.onmessage = (e) => {
                try {
                    const element = document.querySelector(".msgs");
                    let res = JSON.parse(e.data)
                    let time = new Date(res.time_sent);
                    let expiry = new Date(res.expiry);

                    if (expiry - new Date() > 1500) {
                        let text = res.msg;
                        let username = res.username;
                        time = time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                        let new_element = document.createElement("li");
                        expiry = expiry.toString().replace(/\s+/g, "-").replace(/[:+().]/g, "-");
                        new_element.classList.add(expiry, "chat-message-block")
                        new_element.innerHTML = (`<img src=${default_image} alt="user" class="chat-message-img" /><span><span class="chat-message-header"><h3 class="username">${username}</h3> <p class="timestamp">${time}</p><span class="three-dots">
                                <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><g id="dots">
                                    <circle class="cls-1" cx="16" cy="16" r="3" />
                                    <circle class="cls-1" cx="16" cy="8" r="3" />
                                    <circle class="cls-1" cx="16" cy="24" r="3" />
                                    <path class="cls-2" d="M16,13v6a3,3,0,0,0,0-6Z" />
                                    <path class="cls-2" d="M16,5v6a3,3,0,0,0,0-6Z" />
                                    <path class="cls-2" d="M16,21v6a3,3,0,0,0,0-6Z" /></g></svg>
                            <span class="send-msg-option" onClick={dmUser}>Send Message</span>
                            </span></span><p class="chat-message">${text}</p></span>`)
                        new_element.querySelector(".send-msg-option").addEventListener("click", dmUser)
                        new_element.querySelector(".three-dots").addEventListener("click", chatOption)
                        element.append(new_element);
                    }
                }
                catch (error) {
                    console.warn("Error occured in the message");
                }
            }
            ws.current.onerror = (e) => {
                if (ws.current && ws.current.readyState == WebSocket.OPEN) {
                    ws.current.close();
                }
                console.log(e)
                console.warn("An error occured");
            }
        }
        connect();
        function reconnect() {
            setTimeout(connect, webreconInterval);
            webreconInterval += 1000;
        }

        return () => {
            isMounted = false;
            if (ws.current && ws.current.readyState == WebSocket.OPEN)
                ws.current.close();
            clearInterval(interval1);
            clearInterval(interval2);
            clearInterval(interval3);
            element.classList.remove("current-realm")
        }
    }, [])
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
        if (ws.current && ws.current.readyState == WebSocket.OPEN) {
            let message = {
                "msg": msg.trim(),
                "expire": yapDuration
            }
            if (anonymity.current) {
                message["anonymity"] = true
            }
            ws.current.send(JSON.stringify(message));
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
    async function msgDisplay(time) {
        let date = new Date();
        date.setSeconds(date.getSeconds() + time)
        date = date.toString().replace(/\s/g, "-").replace(/[:+().]/g, "-");
        const el = document.querySelectorAll(`.${date}`);
        if (el.length > 0) {
            gsap.to(`.${date}`, {
                opacity: 0,
                duration: 2,
            })
            setTimeout(() => {
                for (const element of el) {
                    element.remove()
                }
            }, 2000)
        }
    }
    function anonymityHandler() {
        let xTravel;
        const element = document.querySelector(".anonymity-off");
        if (anonymity.current) {
            xTravel = 0;
            element.classList.remove("anonymity-on");
        }
        else {
            xTravel = 27;
            element.classList.add("anonymity-on");
        }
        gsap.to(".anonymity-button-circle", {
            x: xTravel,
            duration: 0.1
        })
        anonymity.current = !anonymity.current;
    }

    function chatOption(e) {
        try{
            const element = e.currentTarget.children[1];
            dmSendOption.current = element;
            dmSendOption.current.style.display = "inline";
            e.stopPropagation()
        }
        catch{}
    }


    async function dmUser(e) {
        try{
            const username = e.currentTarget.parentNode.parentNode.children[0].innerHTML;
            let dms = getDms();
            tempDM.current = username
            await setDms(dms)
            navigate(`/chat/u/${username}`)
        }
        catch{

        }
    }
    return (
        <>
        <div className="msg-typearea">
            <div className="msgs-helper">
                <ul className="msgs">
                    <li className="chat-message-block">
                        <img src={default_image} alt="user" className="chat-message-img" />
                        <span>
                            <span className="chat-message-header"><h3 className="username">Username</h3> <p className="timestamp">12:00am</p> <span className="three-dots" onClick={chatOption}>
                                <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><g id="dots">
                                    <circle className="cls-1" cx="16" cy="16" r="3" />
                                    <circle className="cls-1" cx="16" cy="8" r="3" />
                                    <circle className="cls-1" cx="16" cy="24" r="3" />
                                    <path className="cls-2" d="M16,13v6a3,3,0,0,0,0-6Z" />
                                    <path className="cls-2" d="M16,5v6a3,3,0,0,0,0-6Z" />
                                    <path className="cls-2" d="M16,21v6a3,3,0,0,0,0-6Z" /></g></svg>
                            <span className="send-msg-option" onClick={dmUser}>Send Message</span>
                            </span>
                            </span>
                            <p className="chat-message">--Welcome--</p>
                        </span>
                    </li>
                </ul>
            </div>
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
        </div>
        <Members url={"ocoma"}/>
        </>
    )
}