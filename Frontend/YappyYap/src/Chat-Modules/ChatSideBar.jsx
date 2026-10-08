import { useContext, useEffect, useState } from "react"
import default_image from "./../assets/default_img.png"
import { Link, useNavigate } from "react-router-dom";
import { ChatContext } from "../ChatContext";
import useAxios from "../../hooks/useAxios";
import useChatAuth from "../../hooks/useChatAuth";
import RealmSettings from "../RealmSettings";
import { AUTH_URL, GROUPS_URL } from "../config";

export default function ChatSideBar(props) {
    const [query, setQuery] = useState("");
    const [searchBy, setSearchBy] = useState(true);
    const {setError, setTrigger} = useChatAuth();
    const [searchResult, setSearchResults] = useState([])
    const {setDms, getDms, tempDM, realm, realmDetails, currGroup} = useContext(ChatContext);
    const navigate = useNavigate();
    const axios = useAxios();
    const [settingsOpen, setSettingsOpen] = useState(false)
    const priviliged = realmDetails && (realmDetails["role"] == "owner" || realmDetails["role"] == "admin")
    const groupResults = searchBy && query? props.groups["Groups"].filter(group => (group["display"] || group["name"]).toLowerCase().includes(query.toLowerCase())) : []
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
        }
    }
    function testfunc(e) {
        if (props.navOpen && window.innerWidth > 680){
            e.stopPropagation()
        }
    }
    function addGroup(e) {
        e.stopPropagation()
        props.setAddArea(true);
    }
    function goToRealms(e) {
        e.stopPropagation()
        let a = "";
        console.log(currGroup)
        console.log(a ? realm.charAt(0) : realm.slice(1))
        console.log(a ? realm.slice(1) : realm.charAt(0) )
        if(realm && realm != currGroup)
            navigate(`/chat/realms/${realm}`)
        else
            navigate("/chat/realms")
    }
    useEffect(()=>{
        async function search() {
            try{
                let response;
                // Group search filters the realm's own group list (groupResults), only user search hits the server
                if(query == "" || searchBy){
                    setSearchResults([]);
                    return;
                }
                response = await axios.get(`${AUTH_URL}/search/obj/${query}`)
                setSearchResults(response.data)
            }
            catch(err){
    
            }
        }
        search();
        
    },[searchBy, query])
    async function dmUser(e) {
        e.stopPropagation()
        try{
            const username = e.currentTarget.parentNode.children[0].innerHTML;
            let dms = getDms();
            tempDM.current = username;
            await setDms(dms);
            navigate(`/chat/u/${encodeURIComponent(username)}`)
        }
        catch{

        }
    }
    function endPropagation(e) {
        e.stopPropagation();
    }
    async function openGroup(e, el) {
        e.stopPropagation()
        e.preventDefault()
        try{
            await axios.post(`${GROUPS_URL}/realms/${realm}/groups/${el.groupId}/join`)
        }
        catch(err) {
            if(err.response && err.response.status !== 409) {
                if(err.response.data && err.response.data.detail)
                    setError(err.response.data.detail[0].msg)
                else
                    setError("Could not join channel")
                setTrigger(pre => !pre)
                return;
            }
        }
        navigate(`/chat/realms/${realm}/c/${el.name}`)
    }
    function openSettings(e) {
        e.stopPropagation();
        setSettingsOpen(true)
    }
    return(
        <>
        {realm && settingsOpen && (
            <RealmSettings
                realm={realm}
                onClose={() => setSettingsOpen(false)}
                onDelete={() => {
                    setSettingsOpen(false)
                    navigate("/chat/realms")
                }}
                />
        )}
        <div className="chat-sidearea" onClick={navbarSimulator}>
            {realm && realmDetails && (<>
            <span className="sidebar-section">
                    <span className="back-to-realms" onClick={goToRealms}><svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                        <path xmlns="http://www.w3.org/2000/svg" d="M4 8h15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                        <path xmlns="http://www.w3.org/2000/svg" d="m16 5 3 3-3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                        <path xmlns="http://www.w3.org/2000/svg" d="M20 16H5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                        <path xmlns="http://www.w3.org/2000/svg" d="m8 13-3 3 3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg> Realm</span>
                    {priviliged && <span className="open-realm-settings" onClick={openSettings}><svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx={12} cy={12} r={3}></circle>
                        <path d={"M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"}>
                        </path></svg></span>}
            </span>
                    </>
            )}
            <h2 className="chat-sidearea-heading" onClick={goToRealms}>
                {realm && realm != currGroup && realmDetails && realmDetails.name ? <><span className="realms-r-replacement">{realmDetails.name.charAt(0)}</span><span>{realmDetails.name.slice(1)}</span></>
                 : <><span className="realms-r-replacement">R</span><span className="ealms">ealms</span></>}
            </h2>
            <hr />
            {realm && <>
            <div className="search-users-groups">
                <div>
                    <input type="text" onClick={endPropagation} placeholder="Search" value={query} onChange={e => setQuery(e.target.value)}/>
                    <div><input type="checkbox" checked={searchBy} onClick={endPropagation} onChange={e => setSearchBy(pre => !pre)}/>
                    <span className="searchBy-label" onClick={e => {setSearchBy(pre => !pre); e.stopPropagation();}}>Search Groups</span>
                    </div>
                </div>
                <ul className="results-search">
                    {searchBy && groupResults.map(element => (
                        <li key={element["name"]}>
                            <span className="name">{element["display"] || element["name"]}</span>
                            <button className="join-group" onClick={e => openGroup(e, element)}>Join</button>
                        </li>
                    ))}
                    {!searchBy && searchResult.map(element => (
                        <li key={element["name"]}>
                            <span className="name">{element["name"]}</span>
                            <button className="message-user" onClick={dmUser}>Message</button>
                        </li>
                    ))}
                </ul>
            </div>
            </>}
            <div className="scroll-area">
            {realm && <>{realm != "global" && <button className="add-group" onClick={addGroup}>+ Add your own Group</button>}
            <ul className="realms-list">
                {props.groups["Groups"].map(element => <Link to={`/chat/realms/${realm}/c/${element["name"]}`} replace key={`${element["name"]}-realm`} className={`${element["name"]}-realm`} onClick={testfunc}><li><span className="dot-realm-style"></span><span className="channel-hashtag">#</span><span className="realm-button">{element["display"] || element["name"]}</span></li></Link>)}

            </ul>
            </>}
            {("Direct Messages" in props.groups) && (<><h3 className="personal-msg-heading">Personal Messages</h3><ul className="dms">
                {props.groups["Direct Messages"].map(element => <Link to={`/chat/u/${encodeURIComponent(element)}`} key={element} data-user={element} onClick={testfunc}><li><span className="dot-realm-style"></span><span className="realm-button">{element}</span></li></Link>)}
            </ul></>)}
            </div>
            <div className="user-profile">
                <Link to="/account">
                <img src={default_image} alt="user" className="user-profile-pic" />
                <p>{props.username}</p>
                </Link>
            </div>
        </div>
        </>
    )
}