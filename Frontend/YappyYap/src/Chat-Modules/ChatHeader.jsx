import "./ChatHeader.css"
import useAxios from "../../hooks/useAxios"
import { useEffect, useState, useCallback, useContext } from "react"
import useChatAuth from "../../hooks/useChatAuth";
import { useNavigate } from "react-router-dom";
import { ChatContext } from "../ChatContext";
import { DM_URL, GROUPS_URL, TEXTCHAT_URL, VOICECHAT_URL } from "../config";
export default function ChatHeader(props) {
    const [online, setOnline] = useState(0);
    const [members, setMembers] = useState(0);
    const axios = useAxios();
    const {setError, setTrigger} = useChatAuth();
    const [displayname, setDisplay] = useState("");
    const navigate = useNavigate();
    const {realmType, realm, currGroup, currGroupName, realmDetails} = useContext(ChatContext);
    const isDm = currGroup == "dms"
    const isGrp = realm && currGroup !== realm && !isDm
    const realmGlobal = !realm || realm == "global";
    const getOnline = useCallback(async ()=> {
        try{
            if(!isGrp && !isDm)
                return;
            let response;
            const membersEl = document.querySelector(".members");
            if (membersEl)
                membersEl.style.display = "none";
            if (isDm){
                response = await axios.get(`${DM_URL}/livecount/${encodeURIComponent(currGroupName)}`);
                // response = await axios.get(`https://chat.yappyyap.xyz/livecount/${props.user.current}`);
            }else{
                let initialPath;
                if (currGroup == "global-voice") {
                    initialPath = `${VOICECHAT_URL}/voice`;
                    // initialPath = "voice.yappyyap.xyz/voice";
                }
                else if (currGroup == "global-text") {
                    initialPath = `${TEXTCHAT_URL}/global`
                    // initialPath = "textchat.yappyyap.xyz/global"
                }
                else {
                    initialPath = `${GROUPS_URL}/${realmType.current}/${currGroup}`
                    // initialPath = `groups.yappyyap.xyz/${realmType.current}/${currGroup}`
                    if (membersEl)
                        membersEl.style.display = "block";
                    const tempMembers = await axios.get(`${GROUPS_URL}/groups/${currGroup}/numMembers`);
                    // const tempMembers = await axios.get(`https://groups.yappyyap.xyz/groups/${currGroup}/numMembers`);
                    setMembers(tempMembers.data);
                }
                response = await axios.get(`${initialPath}/livecount`);
                // response = await axios.get(`https://${initialPath}/livecount`);
            }
            if (response.data.msg === "Success") {
                setOnline(response.data.total)
            }
        }
        catch(err) {
                if(err.status == 403)
                    navigate("/signin")
        }
    }, [isGrp, isDm, currGroup, currGroupName])
    useEffect(()=>{
        let theme = localStorage.getItem("theme");
        if(theme)
            document.documentElement.setAttribute("data-theme", theme);
        let onlineInterval;
        // Clear the previous chat's numbers so they are not shown until the first poll returns
        setOnline(isDm ? "" : 0);
        setMembers(0);
        if(isGrp || isDm){
            getOnline()
            onlineInterval = setInterval(getOnline, 4000);
        }
        else
            clearInterval(onlineInterval)
        return ()=>{ 
            clearInterval(onlineInterval);
        }
    }, [getOnline])
    useEffect(()=>{
        if(isDm)
            setDisplay(pre => `Personal Msg: ${currGroupName}`)
        else if(isGrp && currGroupName)
            setDisplay(pre => currGroupName.toUpperCase())
        else
            setDisplay(pre => ((realmDetails && realmDetails.name) || props.realm || "").toUpperCase())

    }, [props.realm, isGrp, isDm, currGroupName, realmDetails])
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
                {realm != "global" && <div className="members">{`${members} Members`}</div>}
                        <div className="online-count-dot">
                        </div>
                        <span>{online}</span>
                </div>}
                {isDm && <div className="online-count">
                        <div className="online-count-dot">
                        </div>
                        <span>{online}</span>
                </div>}
            </div>
    )
}