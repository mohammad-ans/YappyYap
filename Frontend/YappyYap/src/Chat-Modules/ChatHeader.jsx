import "./ChatHeader.css"
import useAxios from "../../hooks/useAxios"
import { useEffect, useState, useCallback, useContext } from "react"
import useChatAuth from "../../hooks/useChatAuth";
import { useNavigate } from "react-router-dom";
import { ChatContext } from "../ChatContext";
import GroupSettings from "./GroupSettings";
export default function ChatHeader(props) {
    const [online, setOnline] = useState(0);
    const [members, setMembers] = useState(0);
    const axios = useAxios();
    const {setError, setTrigger} = useChatAuth();
    const [displayname, setDisplay] = useState("");
    const navigate = useNavigate();
    const {realmType, realm, groups, currGroup} = useContext(ChatContext);
    const isGrp = realm && currGroup !== realm && currGroup !== "dms"
    const realmGlobal = !realm || realm == "global";
    const [settingsOpen, setSettingsOpen] = useState(false)
    const getOnline = useCallback(async ()=> {
        try{
            if(!isGrp)
                return;
            let response;
            document.querySelector(".members").style.display = "none";
            if (currGroup == "dms"){
                response = await axios.get(`http://localhost:8005/${props.user.current}`);
                // response = await axios.get(`https://chat.yappyyap.xyz/livecount/${props.user.current}`);
            }else{
                let initialPath;
                if (currGroup == "voice-realm") {
                    initialPath = "3/voice";
                    // initialPath = "voice.yappyyap.xyz/voice";
                }
                else if (currGroup == "global-realm") {
                    initialPath = "2/global"
                    // initialPath = "textchat.yappyyap.xyz/global"
                }
                else {
                    initialPath = `4/${realmType.current}/${currGroup.slice(0,-6)}`
                    // initialPath = `groups.yappyyap.xyz/${realmType.current}/${currGroup.slice(0,-6)}`
                    document.querySelector(".members").style.display = "block";
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
    }, [])
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
    }, [realm, currGroup])
    useEffect(()=>{
        const display = (groups["Groups"].find(grp => grp["name"] == currGroup) || {})["display"]
        if(props.realm == "dms") 
            setDisplay(pre => `Personal Msg: ${props.user.current}`)
        else if(display)
            setDisplay(pre => display.toUpperCase())
        else
            setDisplay(pre => (props.realm || "").toUpperCase())
        
    }, [props.realm, currGroup])
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
                <select className="select-theme-design" value = {props.theme} onChange={changeTheme}>
                    <option value="blue">Blue</option>
                    <option value="green">Green</option>
                    <option value="beige">Beige</option>
                </select>
                {!realmGlobal && <div className="realm-settings" onClick={() => setSettingsOpen(true)}>
                    Settings
                    </div>}
                </div>
                {isGrp && props.liveCount.current && <div className="online-count">
                {realm != "global" && <div className="members" onClick={showMembers}>{`${members} Members`}</div>}
                        <div className="online-count-dot">
                        </div>
                        <span>{online}</span>
                </div>}
                {settingsOpen && isGrp && <GroupSettings realm={realm} group={currGroup} onClose={() => setSettingsOpen(false)} onDeleted={()=> {
                    setSettingsOpen(false)
                    navigate(`/chat/realms/${realm}`)
                }}/>}
            </div>
    )
}