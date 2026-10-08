import { useCallback, useEffect, useRef, useState, useContext } from "react"
import "./Chat.css"
import { Link, useLocation, useNavigate, useParams } from "react-router-dom"
import { Routes, Route, Navigate } from "react-router-dom"
import ChatSideBar from "./Chat-Modules/ChatSideBar"
import ChatHeader from "./Chat-Modules/ChatHeader"
import useChatAuth from "../hooks/useChatAuth"
import Global from "./Global"
import Voice from "./Voice"
import AddGroup from "./AddGroup"
import useAxios from "../hooks/useAxios"
import Personal from "./Personal"
import { ChatContext } from "./ChatContext"
import AllRealmsPage from "./AllRealmsPage"
import GroupSettings from "./Chat-Modules/GroupSettings"
import { DM_URL, GROUPS_URL, TEXTCHAT_URL, VOICECHAT_URL, toWs } from "./config";

export default function Chat(props) {
    const { username } = useChatAuth();
    const usernameRef = useRef(username)
    usernameRef.current = username
    const [realm, setRealm] = useState("");
    const realmRef = useRef("");
    const realmType = useRef("global");
    const [navOpen, setNavopen] = useState(false);
    const [theme, setTheme] = useState("blue");
    const [addArea, setAddArea] = useState(false);
    const {setError, setTrigger} = useChatAuth();
    const globalChannels = [{ "name": "global-text", display: "Global Chat", "grpType": "text", "url": TEXTCHAT_URL, owner : "NA", anonymity : true, liveCount : true, minDuration : 10, maxDuration : 300, maxGrpSize : -1, inviteType : "all", channel: null, role: "member"}, { "name": "global-voice", display: "Global Voice","grpType": "voice", "url": `${VOICECHAT_URL}/voice`, owner : "NA", anonymity : false, liveCount : false, minDuration : 14, maxDuration : 267, maxGrpSize : -1, inviteType : "all", channel: null, role: "member" }]
    const [groups, setGroups] = useState({"Direct Messages": [], "Groups": []})
    // const [groups, setGroups] = useState()
    const dmUsersRef = useRef([]);
    const [dmMsgs, setDmMsgs] = useState({});
    // const [notifications, setNotifications] = useState([]);
    const user = useRef("");
    const dmSendOption = useRef();
    const tempDM = useRef("");
    const ws = useRef();
    const axios = useAxios();
    const location = useLocation();
    const liveCount = useRef(true);
    const navigate = useNavigate()
    const [currGroup, setCurrGroup] = useState("")
    const [currGroupName, setCurrGroupName] = useState("")
    const [realmDetails, setRealmDetails] = useState(null)
    const [grpSettings, setSettings] = useState(false);
    useEffect(() => {
        let temp = localStorage.getItem("theme");
        if (temp) {
            setTheme(pre => temp);
            props.setChatInstructions(false);
        }
    }, [])
    const setRealmGrps = useCallback(async (id) => {
        if(id == "global"){
            setRealmDetails({id: "global", name: "Global", role: "member", isGlobal: true})
            setGroups(pre => ({...pre, "Groups": globalChannels}))
            return globalChannels
        }
        try{
            const realm = await axios.get(`${GROUPS_URL}/realms/${id}`)
            const res = await axios.get(`${GROUPS_URL}/realms/${id}/groups`)
            setRealmDetails(realm.data)
            const groups = res.data.map(grp => ({
                name: grp.id, display: grp.name, groupId: grp.id, realmId: id, grpType: grp.grpType,
                url: grp.grpType == "text" ? GROUPS_URL : `${GROUPS_URL}/voice`,
                owner: grp.owner, liveCount: grp.liveCount, minDuration: grp.minDuration, maxDuration: grp.maxDuration, maxGrpSize: grp.maxGrpSize, inviteType: grp.inviteType, anonymity: grp.anonymity
            }))
            setGroups(pre => ({...pre, "Groups": groups}))
            return groups
        }
        catch(err){
            if (err.response && err.response.data) {
                setError(pre => err.response.data.detail[0].msg)
                setTrigger(t => !t)
            }
            return []
        }  
    }, [])
    const setCurrentGroup = useCallback(async (id) => {
        setRealm(id)
        return await setRealmGrps(id)
    }, [setRealmGrps])
    async function getDms() {
        try {
            // const response = await axios.get("https://chat.yappyyap.xyz/dms")
            const response = await axios.get(`${DM_URL}/dms`)
            let arr = {};
            response.data.forEach(element => {
                // let secondUser = 
                if (element["sender"] == username) {
                    if (!arr[element["receiver"]]) {
                        arr[element["receiver"]] = []
                    }
                    if(element["group"]) {
                        arr[element["receiver"]].push(
                            {
                                "group": element["group"],
                                "defaultExpiration": element["defaultExpiration"],
                                "duration": element["duration"],
                                "sent": true,
                                "sentTime": element["sentTime"]
                            }
                        )
                    }
                    else{
                        arr[element["receiver"]].push(
                            {
                                "msg": element["msg"],
                                "defaultExpiration": element["defaultExpiration"],
                                "duration": element["duration"],
                                "sent": true,
                                "sentTime": element["sentTime"]
                            }
                        )
                }
            }
                else {
                    if (!arr[element["sender"]]) {
                        arr[element["sender"]] = []
                    }
                    if(element["group"]) {
                        arr[element["sender"]].push(
                            {
                                "group": element["group"],
                                "defaultExpiration": element["defaultExpiration"],
                                "duration": element["duration"],
                                "sent": false,
                                "sentTime": element["sentTime"]
                            }
                        )
                    }
                    else{
                        arr[element["sender"]].push(
                            {
                                "msg": element["msg"],
                                "defaultExpiration": element["defaultExpiration"],
                                "duration": element["duration"],
                                "sent": false,
                                "sentTime": element["sentTime"]
                            }
                        )
                    }
                }
            })

            setDmMsgs(pre => arr)
            //  
            return Object.keys(arr)
        }
        catch (err) {
                if (err.response && err.response.data) {
                    setError(pre => err.response.data.detail[0].msg);
                    setTrigger(t => !t);
                    if (ws.current && ws.current.readyState == WebSocket.OPEN)
                        ws.current.close();
                    navigate("/signin")
                }
        }
    }
    function addDmMsg(otherUser, message) {
        setDmMsgs(pre => ({...pre, [otherUser]: [...(pre[otherUser] || []), message]}))
    }
    async function setDms(dmns) {

        let dms = (await dmns) || [];
        if (tempDM.current != "" && !(dms.includes(tempDM.current))){
            
            dms.push(tempDM.current)

        }
        setGroups((pre) => {
            return { ...pre, "Direct Messages": dms }
        })
        dmUsersRef.current = dms;
    }
    useEffect(() => {
        let isMounted = true;

        let webreconInterval = 2000;
        let reconnTimer = null;
        // let dms = getDms();
        function connect() {

            try {
                ws.current = new WebSocket(`${toWs(DM_URL)}/ws/main`);
                // ws.current = new WebSocket("wss://chat.yappyyap.xyz/ws/main");
                ws.current.onopen = () => {
                    webreconInterval = 2000
                    setDms(getDms());
                }
                ws.current.onclose = () => {
                    if (isMounted) {
                        reconnect();
                    }

                }
                ws.current.onmessage = (e) => {
                    try {
                        const element = JSON.parse(e.data)
                        if(element.type == "ping") {
                            ws.current.send(JSON.stringify({type: "pong"}))
                            return
                        }
                        if(element.type == "error") {
                            setError(element.msg)
                            setTrigger(t => !t)
                            return
                        }
                        if ("sender" in element) {
                            // The server sends every DM to both people, so a message we sent arrives here too.
                            // It is the only copy of a sent message, which keeps all of the sender's tabs in sync.
                            const sentByMe = element.sender == usernameRef.current
                            let tempUsername = sentByMe ? element["receiver"] : element["sender"];
                            // Store it so the DM page shows it now or whenever it is opened later
                            addDmMsg(tempUsername, {
                                "msg": element.msg,
                                "defaultExpiration": element.defaultExpiration,
                                "duration": element.duration,
                                "sent": sentByMe,
                                "sentTime": element.sentTime
                            })
                            if(!dmUsersRef.current.includes(tempUsername)) {
                                setGroups((pre) => {
                                    return {...pre, "Direct Messages" : [...pre["Direct Messages"], tempUsername]}
                                })
                                dmUsersRef.current = [...dmUsersRef.current, tempUsername];
                            }
                            if (!sentByMe && user.current != tempUsername) {
                                const domElement = document.querySelector(`[data-user="${CSS.escape(tempUsername)}"]`)
                                if(domElement)
                                    domElement.classList.add("new-msg-notification");
                            }
                        }
                        else{

                        }
                    }
                    catch (err) {
                if (err.response && err.response.data) {
                    setError(pre => err.response.data.detail[0].msg);
                    setTrigger(t => !t);
                    if (ws.current && ws.current.readyState == WebSocket.OPEN)
                        ws.current.close();
                    navigate("/signin")
                }
                    }
                }
                ws.current.onerror = (e) => {
                    if (ws.current && ws.current.readyState == WebSocket.OPEN) {
                        ws.current.close();
                    }
                }
            }
            catch {

            }
        }

        connect();
        function reconnect() {
            if(!isMounted)
                return
            reconnTimer = setTimeout(connect, webreconInterval);
            webreconInterval = Math.min(webreconInterval + 1000, 15000);
        }

        return () => {
            isMounted = false
            clearTimeout(reconnTimer)
            ws.current.onclose = null
            ws.current.close();
        }
    }, [])
    function removeInstructionsHeader() {
        props.setChatInstructions(pre => false);
        // const element = document.querySelector(".instructions-overlay");
        // if (element)
        //     element.style.display = "none"
    }
    function setThemeFunc(e) {
        let temp = e.target.value;
        localStorage.setItem("theme", temp);
        setTheme(pre => temp);
        document.documentElement.setAttribute("data-theme", temp);
    }
    function clearClick() {
        try {
            dmSendOption.current.style.display = "none"
        }
        catch { }
    }
    function getGroups() {
        return setCurrentGroup(realm)
    }
    return (
        <ChatContext.Provider value={{ realmType, liveCount, groups, setRealm, navOpen, setNavopen, setAddArea, realm, theme, setTheme, dmSendOption, tempDM, getDms, setGroups, setDms, user, realmRef, dmMsgs, addDmMsg, ws, getGroups, setRealm, realmDetails, setRealmDetails,setCurrentGroup, setCurrGroup, currGroup, currGroupName, setCurrGroupName}}>
            <main className="chat-area nav-close-styles" onClick={clearClick}>
                {props.chatInstructions ? <div className="instructions-overlay">
                    <div className="instructions">
                        <button className="instruction-cross" onClick={removeInstructionsHeader}>X</button>
                        <ul>
                            <li><span className="red-imp">Note:</span> The options feature for different text styles is under development and rn only shows animation.</li>
                            <li>There is an anonymity feature to even hide your current name.</li>
                            <li>Permanent users get 30 min login sessions while guest 5 minutes.</li>
                            <li>You will have to sign in again after this time period for true anonymity.</li>
                            <li>The message gets deleted after the n seconds specified.</li>
                            <li>Filters are applied on voice so that no one can recognize you.</li>
                            <li>We really advise to take a look at these detailed features <a href="https://github.com/mohammad-ans/YappyYap/blob/main/README.md" target="_blank">Learn more</a></li>
                        </ul>
                        <div className="default-theme-set">
                            <p>Select default theme</p>
                            <select className="select-theme-design" value={theme} onChange={setThemeFunc}>
                                <option value="blue">Blue</option>
                                <option value="green">Green</option>
                                <option value="beige">Beige</option>
                            </select>
                        </div>
                    </div>
                </div> : (<></>)}
                {addArea && <AddGroup setAddArea={setAddArea} realm={realm} />}
                {grpSettings && <GroupSettings realm={realm} group={currGroup} onClose={() => setSettings(false)} onDeleted={()=> {
                    setSettings(false)
                    navigate(`/chat/realms/${realm}`)
                }}/>}
                <ChatSideBar realmRef={realmRef} groups={groups} username={username} realm={realm} setCurrGroup={setCurrentGroup} navOpen={navOpen} setNavopen={setNavopen} setAddArea={setAddArea} />
                <div className="chat-mainarea">
                    <ChatHeader liveCount={liveCount} realmRef={realmRef} realm={realm} navOpen={navOpen} setNavopen={setNavopen} theme={theme} setTheme={setTheme} user={user} setSettings={setSettings} />
                    <Routes>
                        <Route path="/u/:dmUser" element={<DmRoute/>} />
                        <Route path="/realms/:realm" element={<RealmPage/>} />
                        <Route path="/realms" element={<AllRealmsPage setCurrRealm={setRealm} setCurrGroup={setCurrGroup}/>} />
                        <Route path="/realms/:realmP/c/:groupKey" element={<ChannelRoute/>} />
                        <Route path="*" element={<DefaultRoot />} />
                    </Routes>
                </div>
            </main>
        </ChatContext.Provider>
    )
}

function RealmPage(){
    // Landing page of a realm: shows the realm and its channels, the user picks one
    const {realm} = useParams()
    const {setCurrentGroup, setRealm, setCurrGroup, setCurrGroupName, realmDetails} = useContext(ChatContext)
    const [loading, setLoading] = useState(true)
    const [channels, setChannels] = useState([])
    useEffect(()=> {
        async function load() {
            setLoading(true)
            const grps = await setCurrentGroup(realm)
            setRealm(realm)
            setCurrGroup(realm)
            setCurrGroupName("")
            setChannels(grps || [])
            setLoading(false)
        }
        load()
    }, [realm])
    if(loading)
        return(
            <div className="realm-empty">
                Loading Groups...
            </div>
        )
    return (
        <div className="realm-page">
            {realmDetails && <div className="realm-page-header">
                <h2>{realmDetails.name}</h2>
                {realmDetails.description && <p>{realmDetails.description}</p>}
                {!realmDetails.isGlobal && <p className="realm-page-counts">{realmDetails.members} members · {realmDetails.groups} channels</p>}
            </div>}
            {channels.length == 0 ? (
                <p className="realm-page-empty">This realm has no groups yet, you can create one from the sidebar.</p>
            ) : (
                <ul className="realm-page-channels">
                    {channels.map(channel => (
                        <li key={channel.name}>
                            <Link to={`/chat/realms/${realm}/c/${channel.name}`}>
                                <span className="realm-page-hashtag">#</span>{channel.display || channel.name}
                                <span className="realm-page-type">{channel.grpType}</span>
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}
function ChannelRoute() {
    const {realmP, groupKey} = useParams()
    const {groups, realm, setCurrentGroup, setRealm} = useContext(ChatContext)
    const [group, setGroup] = useState(null)
    const [notFound, setFound] = useState(false)

    useEffect(()=> {
        async function setGrp() {
            let list = groups["Groups"]
            let refetched = false
            if(realm !== realmP) {
                list = await setCurrentGroup(realmP)
                refetched = true
            }
            let found = (list || []).find(grp => grp.name === groupKey)
            if (!found && !refetched) {
                // The cached list can be stale, e.g. right after a group was created
                list = await setCurrentGroup(realmP)
                found = (list || []).find(grp => grp.name === groupKey)
            }
            if (found){
                setGroup(found)
                setFound(false)
            }
            else
                setFound(true)
        }
        setRealm(realmP);
        setGrp()
    }, [realmP, groupKey])
    if (notFound)
        return (<div className="realm-empty">
            <p>Group Not Found</p>
        </div>)
    if (!group)
        return (<div>
            <p>Loading...</p>
        </div>)
    return group.grpType == "text" ? <Global key={`${group.name}-realm`} url={group.url} realm={group}/> : <Voice key={`${group.name}-realm`} url={group.url} realm={group} />

}
function DmRoute() {
    // One route for every DM, so links work before the DM list has loaded
    const {dmUser} = useParams()
    return <Personal key={`${dmUser}-personal`} secondUser={dmUser} />
}
function DefaultRoot() {
    const {setRealm} = useContext(ChatContext);
    useEffect(()=> {
        setRealm("global");
    })
    // /chat opens Global Chat directly; the realm page only shows when a realm is opened on purpose
    return (
        <Navigate to="/chat/realms/global/c/global-text" replace />
    )
}