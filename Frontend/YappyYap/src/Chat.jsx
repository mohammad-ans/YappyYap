import { useEffect, useRef, useState } from "react"
import "./Chat.css"
import { Link, useLocation, useNavigate } from "react-router-dom"
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
import default_image from "./assets/default_img.png"

export default function Chat(props) {
    const { username } = useChatAuth();
    const [realm, setRealm] = useState("global-realm");
    const realmRef = useRef("global-realm");
    const realmType = useRef("global");
    const [navOpen, setNavopen] = useState(false);
    const [theme, setTheme] = useState("blue");
    const [addArea, setAddArea] = useState(false);
    const {setError, setTrigger} = useChatAuth();
    // const [groups, setGroups] = useState({ "Realms": [{ "name": "global", "grpType": "text", "url": "localhost:8002", owner : "NA", anonymity : true, liveCount : true, minDuration : 10, maxDuration : 300, maxGrpSize : -1, inviteType : "all"}, { "name": "voice", "grpType": "voice", "url": "localhost:8003/voice", owner : "NA", anonymity : false, liveCount : false, minDuration : 14, maxDuration : 267, maxGrpSize : -1, inviteType : "all" }], "Direct Messages" : [] })
    const [groups, setGroups] = useState({ "Realms": [{ "name": "global", "grpType": "text", "url": "textchat.yappyyap.xyz", owner : "NA", anonymity : true, liveCount : true, minDuration : 10, maxDuration : 300, maxGrpSize : -1, inviteType : "all"}, { "name": "voice", "grpType": "voice", "url": "voice.yappyyap.xyz/voice", owner : "NA", anonymity : true, liveCount : true, minDuration : 10, maxDuration : 300, maxGrpSize : -1, inviteType : "all" }], "Direct Messages" : [] })
    const dmUsersRef = useRef([]);
    const [dmMsgs, setDmMsgs] = useState([]);
    // const [notifications, setNotifications] = useState([]);
    const user = useRef("");
    const dmSendOption = useRef();
    const tempDM = useRef("");
    const ws = useRef();
    const axios = useAxios();
    const location = useLocation();
    const liveCount = useRef(true);
    const navigate = useNavigate()
    useEffect(() => {
        let temp = localStorage.getItem("theme");
        if (temp) {
            setTheme(pre => temp);
            props.setChatInstructions(false);
        }
    }, [])
    async function getGroups() {
        try {
            // const response = await axios.get("http://localhost:8004/groups");
            const response = await axios.get(`https://groups.yappyyap.xyz/groups/all/${username}`);
            // console.log(response.data)
            const tempGroups = response.data;
            tempGroups.map((element) => {
                if (element.grpType == "text")
                    // element["url"] = "localhost:8004";
                    element["url"] = "groups.yappyyap.xyz";
                else
                    // element["url"] = "localhost:8004/voice";
                    element["url"] = "groups.yappyyap.xyz/voice";

                return element
            })
            
            // const realms = [{ "name": "global", "grpType": "text", "url": "localhost:8002", owner : "NA", anonymity : true, liveCount : true, minDuration : 10, maxDuration : 300, maxGrpSize : -1, inviteType : "all"}, { "name": "voice", "grpType": "voice", "url": "localhost:8003/voice", owner : "NA", anonymity : false, liveCount : false, minDuration : 14, maxDuration : 267, maxGrpSize : -1, inviteType : "all" }].concat(tempGroups)
            const realms = [{ "name": "global", "grpType": "text", "url": "textchat.yappyyap.xyz", owner : "NA", anonymity : true, liveCount : true, minDuration : 10, maxDuration : 300, maxGrpSize : -1, inviteType : "all"}, { "name": "voice", "grpType": "voice", "url": "voice.yappyyap.xyz/voice", owner : "NA", anonymity : true, liveCount : true, minDuration : 10, maxDuration : 300, maxGrpSize : -1, inviteType : "all" }].concat(tempGroups)
            setGroups((pre) => {
                return { ...pre, "Realms": realms }
            })
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
    useEffect(() => {
        getGroups()
    }, [])
    async function getDms() {
        try {
            const response = await axios.get("https://chat.yappyyap.xyz/dms")
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
    async function setDms(dmns) {

        let dms = await dmns;
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
        // let dms = getDms();
        function connect() {

            try {
                // ws.current = new WebSocket("ws://localhost:8005/ws");
                ws.current = new WebSocket("wss://chat.yappyyap.xyz/ws/main");
                ws.current.onopen = () => {
                    setDms(getDms());
                }
                ws.current.onclose = () => {
                    if (ws.current.readyState == 0 && isMounted) {
                        reconnect();
                    }

                }
                ws.current.onmessage = (e) => {
                    try {
                        const element = JSON.parse(e.data)
                        if ("sender" in element) {
                            let tempUsername = element["sender"];
                            const locationTemp = useLocation();
                            console.log(locationTemp.pathname);
                            console.log(`/chat/u/${tempUsername}`);
                            if (locationTemp.pathname == `/chat/u/${tempUsername}`) {
                                console.log("here");
                                const parent_element = document.querySelector(".msgs");
                                let time = new Date(element["sentTime"]);
                                let expiry = new Date(element.defaultExpiration);
                                
                                if (expiry - new Date() > 500) {
                                    let text = element.msg;
                                    time = time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                                    let new_element = document.createElement("li");
                                    expiry = expiry.toString().replace(/\s+/g, "-").replace(/[:+().]/g, "-");
                                    new_element.classList.add(expiry, "chat-message-block")
                                    new_element.innerHTML = (`<img src=${default_image} alt="user" class="chat-message-img" /><span><span class="chat-message-header"><h3 class="username">${tempUsername}</h3> <p class="timestamp">${time}</p></span><p class="chat-message">${text}</p></span>`)
                                    parent_element.append(new_element);
                                    console.log("here2");
                                }
                            }
                            else{
                                if(!dmUsersRef.current.includes(tempUsername)) {
                                    setGroups((pre) => {
                                        return {...pre, "Direct Messages" : [...pre["Direct Messages"], tempUsername]}
                                    })
                                    dmUsersRef.current = [...dmUsersRef.current, tempUsername];
                                }
                                    
                                const domElement = document.querySelector(`.${tempUsername}`)
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
            setTimeout(connect, webreconInterval);
            webreconInterval += 1000;
        }

        return () => {
            isMounted = false
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
    return (
        <ChatContext.Provider value={{ realmType, liveCount, groups, setRealm, navOpen, setNavopen, setAddArea, realm, theme, setTheme, dmSendOption, tempDM, getDms, setGroups, setDms, user, realmRef, dmMsgs, ws, getGroups }}>
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
                {addArea && <AddGroup setAddArea={setAddArea} />}
                <ChatSideBar realmRef={realmRef} groups={groups} username={username} realm={realm} setRealm={setRealm} navOpen={navOpen} setNavopen={setNavopen} setAddArea={setAddArea} />
                <div className="chat-mainarea">
                    <ChatHeader liveCount={liveCount} realmRef={realmRef} realm={realm} navOpen={navOpen} setNavopen={setNavopen} theme={theme} setTheme={setTheme} user={user} />
                    <Routes>
                        {
                            groups["Direct Messages"].map(element => <Route path={`/u/${element}`} element={<Personal key={`${element}-personal`} setRealm={setRealm} secondUser={element} ws={ws} />} />)
                        }
                        {
                            groups["Realms"].map(element => <Route
                                key={`${element["name"]}-realm`} path={`/${element["name"]}`} element={element["grpType"] == "text" ? (<Global key={`${element["name"]}-realm`} url={element["url"]} realm={element} />) : (<Voice key={`${element["name"]}-realm`} url={element["url"]} realm={element} />)}
                            />)
                        }
                        <Route path="*" element={<DefaultRoot />} />
                    </Routes>
                    {/* {realm === "global-realm" ? <Global/> : <Voice/>} */}
                </div>
            </main>
        </ChatContext.Provider>
    )
}
function DefaultRoot() {
    return (
        <Navigate to="/chat/global" replace />
    )
}