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
export default function Chat(props) {
    const {username} = useChatAuth();
    const [realm, setRealm] = useState("global-realm");
    const [navOpen, setNavopen] = useState(false);
    const [theme, setTheme ] = useState("blue");
    const [addArea, setAddArea] = useState(false);
    useEffect(()=>{
        let temp = localStorage.getItem("theme");
        if (temp){
            setTheme(pre => temp);
            props.setChatInstructions(false);
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
                <ChatSideBar username = {username} realm={realm} setRealm={setRealm} navOpen={navOpen} setNavopen={setNavopen} setAddArea={setAddArea}/>
                <div className="chat-mainarea">
                    <ChatHeader realm={realm} navOpen={navOpen} setNavopen={setNavopen} theme={theme} setTheme={setTheme}/>
                    <Routes>
                        <Route path="/" element={<DefaultRoot/>}/>
                        <Route path="/global" element={<Global setRealm={setRealm}/>} />
                        <Route path="/voice" element={<Voice setRealm={setRealm}/>} />
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