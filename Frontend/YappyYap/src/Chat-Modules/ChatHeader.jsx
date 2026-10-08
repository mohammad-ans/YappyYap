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
    const {realmType, realm, currGroup, currGroupName, realmDetails} = useContext(ChatContext);
    const isGrp = realm && currGroup !== realm && currGroup !== "dms"
    const realmGlobal = !realm || realm == "global";
    const getOnline = useCallback(async ()=> {
        try{
            if(!isGrp)
                return;
            let response;
            const membersEl = document.querySelector(".members");
            if (membersEl)
                membersEl.style.display = "none";
            if (currGroup == "dms"){
                response = await axios.get(`http://localhost:8005/${props.user.current}`);
                // response = await axios.get(`https://chat.yappyyap.xyz/livecount/${props.user.current}`);
            }else{
                let initialPath;
                if (currGroup == "global-voice") {
                    initialPath = "3/voice";
                    // initialPath = "voice.yappyyap.xyz/voice";
                }
                else if (currGroup == "global-text") {
                    initialPath = "2/global"
                    // initialPath = "textchat.yappyyap.xyz/global"
                }
                else {
                    initialPath = `4/${realmType.current}/${currGroup}`
                    // initialPath = `groups.yappyyap.xyz/${realmType.current}/${currGroup}`
                    if (membersEl)
                        membersEl.style.display = "block";
                    const tempMembers = await axios.get(`http://localhost:8004/groups/${currGroup}/numMembers`);
                    // const tempMembers = await axios.get(`https://groups.yappyyap.xyz/groups/${currGroup}/numMembers`);
                    setMembers(tempMembers.data);
                }
                response = await axios.get(`http://localhost:800${initialPath}/livecount`);
                // response = await axios.get(`https://${initialPath}/livecount`);
            }
            if (response.data.msg === "Success") {
                setOnline(response.data.total)
            }
        }
        catch(err) {
            if(err.response && err.response.data) {
                    setError(pre => err.response.data.detail[0].msg);
                    setTrigger(t => !t);
                    if(err.status == 403)
                        navigate("/signin")
                }
        }
    }, [isGrp, currGroup])
    useEffect(()=>{
        let theme = localStorage.getItem("theme");
        if(theme)
            document.documentElement.setAttribute("data-theme", theme);
        let onlineInterval;
        if(isGrp)
            onlineInterval = setInterval(getOnline, 4000);
        else
            clearInterval(onlineInterval)
        return ()=>{ 
            clearInterval(onlineInterval);
        }
    }, [getOnline])
    useEffect(()=>{
        if(props.realm == "dms")
            setDisplay(pre => `Personal Msg: ${props.user.current}`)
        else if(isGrp && currGroupName)
            setDisplay(pre => currGroupName.toUpperCase())
        else
            setDisplay(pre => ((realmDetails && realmDetails.name) || props.realm || "").toUpperCase())

    }, [props.realm, isGrp, currGroupName, realmDetails])
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
                    {displayname == "" ? <h2 style={{color: "#D00000"}}>{"No Realm Selected"}</h2> : <h2>{displayname}</h2>}
                </div>
                <div className="chat-theme">
                {isGrp && !realmGlobal && <div className="group-settings" onClick={() => props.setSettings(true)}>
                    <svg width={20} height={20} viewBox="0 0 24 24" fill="none"stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx={12} cy={12} r={3}></circle>
                        <path d={"M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"}>
                    </path></svg>
                    </div>}
                <select className="select-theme-design" value = {props.theme} onChange={changeTheme}>
                    <option value="blue">Blue</option>
                    <option value="green">Green</option>
                    <option value="beige">Beige</option>
                </select>
                </div>
                {isGrp && props.liveCount.current && <div className="online-count">
                {realm != "global" && <div className="members" onClick={showMembers}>{`${members} Members`}</div>}
                        <div className="online-count-dot">
                        </div>
                        <span>{online}</span>
                </div>}
            </div>
    )
}