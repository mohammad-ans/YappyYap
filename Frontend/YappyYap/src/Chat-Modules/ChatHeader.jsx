import "./ChatHeader.css"
import useAxios from "../../hooks/useAxios"
import { useEffect, useState, useCallback, useContext } from "react"
import useChatAuth from "../../hooks/useChatAuth";
import { useNavigate } from "react-router-dom";
import { ChatContext } from "../ChatContext";
export default function ChatHeader(props) {
    const [online, setOnline] = useState(0);
    const [members, setMembers] = useState(0);
    const axios = useAxios();
    const {setError, setTrigger} = useChatAuth();
    const [displayname, setDisplay] = useState("");
    const navigate = useNavigate();
    const {realmType} = useContext(ChatContext);
    const getOnline = useCallback(async ()=> {
        try{
            let response;
            document.querySelector(".members").style.display = "none";
            if (props.realmRef.current == "dms"){
                // response = await axios.get(`http://localhost:8005/${props.user.current}`);
                response = await axios.get(`https://chat.yappyyap.xyz/livecount/${props.user.current}`);
            }else{
                let initialPath;
                if (props.realmRef.current == "voice-realm") {
                    // initialPath = "3/voice";
                    initialPath = "voice.yappyyap.xyz/voice";
                }
                else if (props.realmRef.current == "global-realm") {
                    // initialPath = "2/global"
                    initialPath = "textchat.yappyyap.xyz/global"
                }
                else {
                    // initialPath = `4/${realmType.current}/${props.realmRef.current.slice(0,-6)}`
                    initialPath = `groups.yappyyap.xyz/${realmType.current}/${props.realmRef.current.slice(0,-6)}`
                    document.querySelector(".members").style.display = "block";
                    // const tempMembers = await axios.get(`http://localhost:800${initialPath}/numMembers`);
                    const tempMembers = await axios.get(`https://${initialPath}/numMembers`);
                    setMembers(tempMembers.data);
                }
                // response = await axios.get(`http://localhost:800${initialPath}/livecount`);
                response = await axios.get(`https://${initialPath}/livecount`);
            }
            if (response.data.msg === "Success") {
                setOnline(response.data.total)
            }
        }
        catch(err) {
            if(err.response && err.response.data) {
                    setError(pre => err.response.data.detail[0].msg);
                    setTrigger(t => !t);
                    if(ws.current && ws.current.readyState == WebSocket.OPEN)
                        ws.current.close();
                    navigate("/signin")
                }
        }
    }, [])
    useEffect(()=>{
        let theme = localStorage.getItem("theme");
        if(theme)
            document.documentElement.setAttribute("data-theme", theme);
        const onlineInterval = setInterval(getOnline, 4000);
        return ()=> clearInterval(onlineInterval);
    }, [])
    useEffect(()=>{
        if(props.realm == "dms") {
            setDisplay(`Personal Msg: ${props.user.current}`)
        }
        else {
            setDisplay(props.realm.toUpperCase())
        }
    }, [props.realm, props.user.current])
    function changeTheme(e) {
        let temp = e.target.value;
        localStorage.setItem("theme", temp);
        document.documentElement.setAttribute("data-theme", temp);
        props.setTheme(pre => temp);
    }
    function navBarSimulator(){
        const element = document.querySelector(".chat-area");
        // if (props.navOpen){
        //     element.classList.add("nav-close-styles");
        //     element.classList.remove("nav-open-styles");
        // }
        element.classList.remove("nav-close-styles");
        element.classList.add("nav-open-styles");
        props.setNavopen(n => true);
    }
    function showMembers() {
        document.querySelector(".msg-typearea").style.display = "none";
        document.querySelector(".members-area").style.display = "block";
    }
    return(
            <div className="chat-header">
                <div className="chat-menu-bar" onClick={navBarSimulator}>≡</div>
                <div className="active-realm">

                    <h2>{displayname}
                        </h2>
                </div>
                <div className="chat-theme">
                <select className="select-theme-design" value = {props.theme} onChange={changeTheme}>
                    <option value="blue">Blue</option>
                    <option value="green">Green</option>
                    <option value="beige">Beige</option>
                </select>
                {/* <div className="setting">
                    <input type="color"/>
                    </div> */}
                </div>
                        {props.liveCount.current && <div className="online-count">
                        <div className="members" onClick={showMembers}>{`${members} Members`}</div>
                                <div className="online-count-dot">
                                </div>
                                <span>{online}</span>
                        </div>}
            </div>
    )
}