import { useEffect, useRef, useState } from "react"
import { gsap } from "gsap/gsap-core"
import useAxios from "../hooks/useAxios"
import default_image from "./assets/default_img.png"
import useChatAuth from "../hooks/useChatAuth";
import { useNavigate } from "react-router-dom";
import TypeArea from "./Voice/TypeArea";
import GrpTypeArea from "./GrpTypeArea";
export default function Group(props){
    const [msg, setMsg] = useState("");
    const textArea = useRef();
    const ws = useRef(null);
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
    useEffect(() => {

        let isMounted = true;
        const element = document.querySelector(`.${props.realm}`);
        props.setRealm(props.realm)
        element.classList.add("current-realm");

        const axios = useAxios()

        async function getMessages () {
            
        }

        const interval1 = setInterval(getMessages, 20000)
        const interval2 = setInterval(()=>removeMsg(2), 1000);
        const interval3 = setInterval(()=>removeMsg(-2), 1000);
        
        let webreconInterval  = 2000;
    function connect() {
        // ws.current = new WebSocket(`wss://api.yappyyap.xyz/ws`);
        ws.current = new WebSocket("ws://localhost:8002/ws")
        ws.current.onopen = () => {
            getMessages()
        }
        ws.current.onclose = () => {
            if (ws.current.readyState == 0 && isMounted){
                reconnect();
            }
        }
        ws.current.onmessage = (e) => {
        }
        ws.current.onerror = (e) => {
            if(ws.current && ws.current.readyState == WebSocket.OPEN){
                ws.current.close();
            }
            console.warn("An error occured");
        }
    }
    connect();
    function reconnect() {
        setTimeout(connect, webreconInterval);
        webreconInterval += 1000;
    }

        return ()=> {
            isMounted = false;
            if(ws.current && ws.current.readyState == WebSocket.OPEN)
                ws.current.close();
            clearInterval(interval1);
            clearInterval(interval2);
            clearInterval(interval3);
            element.classList.remove("current-realm")
        }
    }, [])
    // const [msgs, setMsgs] = useState(Array());
    function animation() {
    }
    
    function sendMsg() {
        if (msg.trim() == "") {
            return;
        }

        //send msg()

        textArea.current.value = "";
        setMsg("");
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
    async function removeMsg(time) {

    }
    
        return (
            <>
                    <div className="msgs-helper">
                        <ul className="msgs">

                        //Messages Handler()


                        </ul>
                    </div>

                    {props.grpType == "voice" ? (<TypeArea/>) : (<GrpTypeArea/>)}
                    </>
    )
}