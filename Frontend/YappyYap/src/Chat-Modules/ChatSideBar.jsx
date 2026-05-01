import { useContext, useEffect, useState } from "react"
import default_image from "./../assets/default_img.png"
import { Link, useLocation, useNavigate } from "react-router-dom";
import AddGroup from "./../AddGroup";
import { ChatContext } from "../ChatContext";
import useAxios from "../../hooks/useAxios";
import useChatAuth from "../../hooks/useChatAuth";
export default function ChatSideBar(props) {
    // const [navOpen, setNavopen] = useState(false);
    const [addArea, setAddArea] = useState(false);
    const [query, setQuery] = useState("");
    const [searchBy, setSearchBy] = useState(true);
    const {setError, setTrigger} = useChatAuth();
    const [searchResult, setSearchResults] = useState([])
    const {setDms, getDms, tempDM, getGroups} = useContext(ChatContext);
    const navigate = useNavigate();
    const axios = useAxios();
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
        props.setAddArea(true);
    }
    async function joinGroup(e) {
        e.stopPropagation()
        const group = e.target.parentNode.children[0].innerText;
        try{
            // const response = await axios.get(`http://localhost:8004/addmem/${group}`)
            const response = await axios.get(`https://groups.yappyyap.xyz/addmem/${group}`)
            getGroups();
            e.target.innerText = "Joined"   
        }
        catch(err){
            if(err.response.status == 406){
                setError(err.response.data.detail[0].msg);
                setTrigger(pre => !pre)
            }
            else{
                e.target.innerText = "Could not join"   
            }
        }
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
                    // response = await axios.get(`http://localhost:8004/groups/${query}`)
                    response = await axios.get(`https://groups.yappyyap.xyz/groups/${query}`)
                    setSearchResults(response.data)
                }
                else{
                    // response = await axios.get(`http://localhost:8001/search/obj/${query}`)
                    response = await axios.get(`https://auth.yappyyap.xyz/search/obj/${query}`)
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
    return(
        <div className="chat-sidearea" onClick={navbarSimulator}>
            {addArea && <AddGroup/>}
            <h2 className="chat-sidearea-heading">
                <span className="realms-r-replacement">R</span>
            <span className="ealms">ealms</span>
            </h2>
            <hr />
            <div className="search-users-groups">
                <div>
                    <input type="text" onClick={endPropagation} placeholder="Search" value={query} onChange={e => setQuery(e.target.value)}/>
                    <div><input type="checkbox" checked={searchBy} onClick={endPropagation} onChange={e => setSearchBy(pre => !pre)}/>
                    <span className="searchBy-label" onClick={e => {setSearchBy(pre => !pre); e.stopPropagation();}}>Search Groups</span>
                    </div>
                </div>
                <ul className="results-search">
                    {searchResult.map(element => {
                        if(searchBy)
                            return (
                                <li key={element["name"]}>
                                    <span className="name">{element["name"]}</span>
                                    {element["inviteType"] == "all" ? 
                                    (<button className="join-group" onClick={joinGroup}>Join Group</button>)
                                    : (<button className="join-group" style={{cursor : "text"}} disabled={true}>Invite only</button>)
                                    }
                                </li>
                            )
                        return (
                            <li key={element["name"]}>
                                <span className="name">{element["name"]}</span>
                                <button className="message-user" onClick={dmUser}>Message</button>
                            </li>
                        )
                    })}
                </ul>
            </div>
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