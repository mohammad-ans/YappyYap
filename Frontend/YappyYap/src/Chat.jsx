import { useEffect, useRef, useState } from "react"
import "./Chat.css"
import { Link } from "react-router-dom"
import { Routes, Route, Navigate } from "react-router-dom"
import ChatSideBar from "./Chat-Modules/ChatSideBar"
import ChatHeader from "./Chat-Modules/ChatHeader"
import useChatAuth from "../hooks/useChatAuth"
import Global from "./Global"
import Voice from "./Voice"
import AddGroup from "./AddGroup"
import useAxios from "../hooks/useAxios"
import Personal from "./Personal"
export default function Chat(props) {
    const {username} = useChatAuth();
    const [realm, setRealm] = useState("global-realm");
    const [navOpen, setNavopen] = useState(false);
    const [theme, setTheme ] = useState("blue");
    const [addArea, setAddArea] = useState(false);
    const [groups, setGroups] = useState({"Realms" : [{"name" : "global", "grpType" : "text", "url" : "localhost:8002"}, {"name": "voice", "grpType" : "voice", "url" : "localhost:8003/voice"}]})
    const [user, setUser] = useState("");
    const ws = useRef();
    const axios = useAxios();
    useEffect(()=>{
        let temp = localStorage.getItem("theme");
        if (temp){
            setTheme(pre => temp);
            props.setChatInstructions(false);
        }
    }, [])
    useEffect(()=>{
        async function getGroups(){
            try{
                const response = await axios.get("http://localhost:8004/groups")
                console.log(response.data)
                const tempGroups = response.data;
                tempGroups.map((element)=> {
                    if (element.grpType == "text")
                        element["url"] = "localhost:8004"
                    else
                        element["url"] = "localhost:8004/voice"

                    return element
                })
                const realms = [...groups["Realms"]].concat(tempGroups)
                const realms2 = groups["Realms"].concat(response.data)
                console.log(realms)
                console.log(realms2)
                setGroups((pre) => {
                    return {...pre, "Realms" : realms}
                })
            }
            catch(err){
                console.log(err)
            }
        }
        getGroups()
    }, [])
    useEffect(()=>{
    },[])
    useEffect(()=>{
        let isMounted = true;
        
    let webreconInterval  = 2000;
        async function getDms() {
            try{
                const response = await axios.get("http://localhost:8005/dms")
                setGroups((pre) => {
                    return {...pre, "Direct Messages" : response.data}
                })
            }
            catch{
                setGroups((pre) => {
                    return {...pre, "Direct Messages" : {"A" : ["msg1", "msg2"], "B" : ["msg"] } }
                })
            }
        }

        function connect(){

            try{
                ws.current = new WebSocket("ws://localhost:8005/ws");
                ws.current.onopen = () => {
                    getDms();
                }
                ws.current.onclose = () => {
                    if(ws.current.readyState == 0 && isMounted){

                    }
                        
                }
                ws.current.onmessage = (e) => {
                    try{
                        let res = JSON.parse(e.data)
                    }
                    catch{
    
                    }
                }
                ws.current.onerror = (e) => {   
                    if(ws.current && ws.current.readyState == WebSocket.OPEN){
                        ws.current.close();
                    }
                }
            }
            catch{
    
            }
        }
        
        connect();
        function reconnect() {
        setTimeout(connect, webreconInterval);
        webreconInterval += 1000;
        }

        return ()=>{
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
    return(
        <main className="chat-area nav-close-styles">
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
                        <li>We really advise to take a look at these detailed features <Link>Learn more</Link></li>
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
                {addArea && <AddGroup setAddArea={setAddArea}/>} 
                <ChatSideBar groups = {groups} username = {username} realm={realm} setRealm={setRealm} navOpen={navOpen} setNavopen={setNavopen} setAddArea={setAddArea}/>
                <div className="chat-mainarea">
                    <ChatHeader realm={realm} navOpen={navOpen} setNavopen={setNavopen} theme={theme} setTheme={setTheme} user={user}/>
                    <Routes>
                        {("Direct Messages" in groups) ?(
                            groups["Direct Messages"].map(element => <Route path={`/u/${element}`} element={<Personal key={`${element}-personal`} setRealm={setRealm} secondUser = {element} setUser={setUser}/>} />)
                        ) : (<></>)}
                        {
                            groups["Realms"].map(element => <Route 
                                key={`${element["name"]}-realm`} path={`/${element["name"]}`} element={element["grpType"] == "text" ? (<Global key={`${element["name"]}-realm`} url={element["url"]} setRealm={setRealm} realm={element["name"]}/>) : (<Voice key={`${element["name"]}-realm`} url={element["url"]} setRealm={setRealm} realm={element["name"]}/>)}
                            />)
                        }
                        <Route path="*" element={<DefaultRoot/>}/>
                    </Routes>
                    {/* {realm === "global-realm" ? <Global/> : <Voice/>} */}
                </div>
        </main>
    )
}
function DefaultRoot() {
    return(
        <Navigate to="/chat/global" replace/>
    )
}