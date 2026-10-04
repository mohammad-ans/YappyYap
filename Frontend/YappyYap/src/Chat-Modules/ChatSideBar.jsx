import { useContext, useEffect, useState } from "react"
import default_image from "./../assets/default_img.png"
import { Link, useNavigate } from "react-router-dom";
import { ChatContext } from "../ChatContext";
import useAxios from "../../hooks/useAxios";
import useChatAuth from "../../hooks/useChatAuth";
import RealmSettings from "../RealmSettings";

export default function ChatSideBar(props) {
    const [query, setQuery] = useState("");
    const [searchBy, setSearchBy] = useState(true);
    const {setError, setTrigger} = useChatAuth();
    const [searchResult, setSearchResults] = useState([])
    const {setDms, getDms, tempDM, realm, realmDetails, setRealm} = useContext(ChatContext);
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
        // setRealm()
        navigate("/chat/realms")
    }
    useEffect(()=>{
        async function search() {
            try{
                let response;
                if(query == ""){
                    setSearchResults([]);
                    return;
                }
                if(searchBy){
                    response = await axios.get(`http://localhost:8004/groups/${query}`)
                    // response = await axios.get(`https://groups.yappyyap.xyz/groups/${query}`)
                    setSearchResults(response.data)
                }
                else{
                    response = await axios.get(`http://localhost:8001/search/obj/${query}`)
                    // response = await axios.get(`https://auth.yappyyap.xyz/search/obj/${query}`)
                    setSearchResults(response.data)
                }
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
            navigate(`/chat/u/${username}`)
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
            await axios.post(`http://localhost:8004/realms/${realm}/groups/${el.groupId}/join`)
        }
        catch(err) {
            if(err.response && err.response.status !== 409) {
                if(err.response.data)
                    setError(err.response.data.msg)
                else
                    setError("Could not join channel")
                setTrigger(pre => !pre)
                return;
            }
        }
        navigate(`/chat/realms/${realm}/c/${element.name}`)
    }
    return(
        <div className="chat-sidearea" onClick={navbarSimulator}>
            <h2 className="chat-sidearea-heading" onClick={goToRealms}>
                <span className="realms-r-replacement">R</span>
            <span className="ealms">ealms</span>
            </h2>
            {realm && <>
            {realmDetails && (
                <p className="current-realm-name" onClick={endPropagation}><span>{priviliged && <span className="back-to-realms" onClick={()=> setSettingsOpen(true)}>Settings</span>}
                    <span className="back-to-realms" onClick={goToRealms}>Switch</span>
                </span></p>
            )}
            {settingsOpen && (
                <RealmSettings
                    realm={realm}
                    onClose={() => setSettingsOpen(false)}
                    onDelete={() => {
                        setSettingsOpen(false)
                        navigate("/chat/realms")
                    }}
                 />
            )}
            <hr />
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
                            <button className="join-group" onClick={e => openGroup(e, element)}></button>
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
                {props.groups["Groups"].map(element => <Link to={`/chat/realms/${realm}/c/${element["name"]}`} key={`${element["name"]}-realm`} className={`${element["name"]}-realm`} onClick={testfunc}><li><span className="dot-realm-style"></span><span className="channel-hashtag">#</span><span className="realm-button">{element["display"] || element["name"]}</span></li></Link>)}

            </ul>
            </>}
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