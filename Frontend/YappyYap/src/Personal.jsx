import { useContext, useEffect, useRef, useState } from "react"
import { gsap } from "gsap/gsap-core"
import useAxios from "../hooks/useAxios"
import default_image from "./assets/default_img.png"
import useChatAuth from "../hooks/useChatAuth";
import { useNavigate } from "react-router-dom";
import { ChatContext } from "./ChatContext";
export default function Personal(props){
    const [msg, setMsg] = useState("");
    const textArea = useRef();
    const [bold, setBold] = useState(false);
    const [italic, setItalic] = useState(false);
    const [strike, setStrike] = useState(false);
    const [optionsOpen, setOptionsOpen] = useState(false);
    const [yapDuration, setYapDuration] = useState(10);
    const {setError, setTrigger} = useChatAuth();
    const {getDms, setDms, dmMsgs, ws, realmRef, user, tempDM} = useContext(ChatContext)
    const navigate = useNavigate()
    const startDuration = useRef(false);
    const axios = useAxios();
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
        realmRef.current = "dms";
        user.current = props.secondUser;
        const element = document.querySelector(`.${user.current}`);
        element.classList.remove("new-msg-notification");
        props.setRealm("dms")
        element.classList.add("current-realm");
        async function setMessages () {
            try{
                setDms(getDms());
                let username = props.secondUser;
                if(!dmMsgs[username]){
                    return;
                }
                const response = dmMsgs[username];
                const parent_element = document.querySelector(".msgs");
                parent_element.innerHTML = "";
                response.forEach(element => {
                    // msg = data["msg"],
                    //     sentTime = timeCurr,
                    //     duration = data["duration"],
                    //     defaultExpiration
                    let time = new Date(element.sentTime);
                    let expiry;
                    if (element.defaultExpiration){
                        expiry = new Date(element.defaultExpiration);
                    }
                    else
                        expiry = new Date(time.getTime() + element.duration * 1000);
                    
                    if (expiry - new Date() > 500){
                        let tempMsg;
                        if(element.group) {
                            tempMsg = `<button class="group-invite" data-group="${element.group}">Join ${element.group}-realm</button>`
                            
                        }
                        else{
                            tempMsg = `<p class="chat-message">${element.msg}</p>`
                        }
                        time = time.toLocaleTimeString([], {hour : "2-digit", minute : "2-digit"})
                        let new_element = document.createElement("li");
                        expiry = expiry.toString().replace(/\s+/g, "-").replace(/[:+().]/g, "-");
                        new_element.classList.add(expiry, "chat-message-block")
                        new_element.innerHTML = (`<img src=${default_image} alt="user" class="chat-message-img" /><span><span class="chat-message-header"><h3 class="username">${username}</h3> <p class="timestamp">${time}</p></span>${tempMsg}</span>`)
                        const tempElement = new_element.querySelector(".group-invite");
                        if(tempElement)
                            tempElement.addEventListener("click", joinGroup)
                        parent_element.append(new_element);
                    }
                });
            }
            catch(err){
            if(err.response && err.response.data) {
                    setError(e => err.response.data.detail[0].msg);
                    setTrigger(t => !t);
                    if(ws.current && ws.current.readyState == WebSocket.OPEN)
                        ws.current.close();
                    navigate("/signin")
                }
                // console.warn("Connection to server failed")
            }
        }
        setMessages()
        const interval2 = setInterval(()=>msgDisplay(2), 1000);
        const interval3 = setInterval(()=>msgDisplay(-2), 1000);
        
        return ()=> {
            clearInterval(interval2);
            clearInterval(interval3);
            element.classList.remove("current-realm");
            tempDM.current = "";
            setDms(getDms());
        }
    }, [])
    async function joinGroup(e){
        let group = e.target.dataset.group;
        console.log(group)
        try{
            const response = await axios.get(`https://groups.yappyyap.xyz/addmem/${group}`);
            e.target.innerText = "Joined";
        }
        catch(err) {
            if(err.response.status == 406){
                setError(err.response.data.detail[0].msg);
                setTrigger(pre => !pre);
            }
            else{
                e.target.innerText = "Could not join";
            }
        }
    }
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
                "recipient" : props.secondUser,
                "defaultExpiration" : startDuration.current,
                "msg" : msg.trim(),
                "duration" : Number(yapDuration)
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
            gsap.to(`.${date}`,{
                opacity : 0,
                duration : 2,
            })
            setTimeout(()=>{
                for (const element of el) {
                    element.remove()
                }
            }, 2000)
        }
    }
    function startDurationHandler() {
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
        startDuration.current = !startDuration.current;
    }
        return (
            <>
                    <div className="msgs-helper">
                        <ul className="msgs">
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
                                    <span className="input-label">Start Duration: </span>
                                    <button className="anonymity-off" onClick={startDurationHandler}><span className="anonymity-button-circle"></span></button>
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
                    </>
    )
}