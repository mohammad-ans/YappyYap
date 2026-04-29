import { useEffect, useState } from "react"
import default_image from "./../assets/default_img.png"
import { Link, useLocation } from "react-router-dom";
import AddGroup from "./../AddGroup";
export default function ChatSideBar(props) {
    // const [navOpen, setNavopen] = useState(false);
    const [addArea, setAddArea] = useState(false);
    function navbarSimulator() {
        if (window.innerWidth <= 1000){
            const element = document.querySelector(".chat-area")
            if(props.navOpen){
                element.classList.add("nav-close-styles");
                element.classList.remove("nav-open-styles");
            }
            else{
                element.classList.add("nav-open-styles");
                element.classList.remove("nav-close-styles")
            }
            props.setNavopen((n)=>!n);
            console.log("hi")
        }
    }
    function testfunc(e) {
        if (props.navOpen && window.innerWidth > 680){
            e.stopPropagation()
        }
    }
    function addGroup(e) {
        props.setAddArea(true);
    }
    return(
        <div className="chat-sidearea" onClick={navbarSimulator}>
            {addArea && <AddGroup/>}
            <h2 className="chat-sidearea-heading">
                <span className="realms-r-replacement">R</span>
            <span className="ealms">ealms</span>
            </h2>
            <hr />
            <div className="scroll-area">

            <button className="add-group" onClick={addGroup}>+ Add your own Realm</button>
            <ul className="realms-list">
                {props.groups["Realms"].map(element => <Link to={`/chat/${element["name"]}`} key={`${element["name"]}-realm`} className={`${element["name"]}-realm`} onClick={testfunc}><li><span className="dot-realm-style"></span><span className="channel-hashtag">#</span><span className="realm-button">{element["name"]}</span></li></Link>)}

            </ul>
            {("Direct Messages" in props.groups) && (<><h3 className="personal-msg-heading">Personal Messages</h3><ul className="dms">
                {props.groups["Direct Messages"].map(element => <Link to={`/chat/u/${element}`} key={element} className={element} onClick={testfunc}><li><span className="dot-realm-style"></span><span className="realm-button">{element}</span></li></Link>)}
            </ul></>)}
            </div>
            <div className="user-profile">
                <Link to="/account">
                <img src={default_image} alt="user" className="user-profile-pic" />
                <p>{props.username}</p>
                </Link>
            </div>
        </div>
    )
}