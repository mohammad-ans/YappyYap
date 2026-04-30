import { useContext, useEffect, useState } from "react";
import useAxios from "../../hooks/useAxios";
import "./ChatHeader.css"
import "../Chat.css"
import { ChatContext } from "../ChatContext";
import useChatAuth from "../../hooks/useChatAuth";

export default function Members(props) {
    const axios = useAxios();
    const [members, setMembers] = useState([]);
    const [user, setUser] = useState("");
    const { realmRef, ws } = useContext(ChatContext);
    const [searchQuery, setSearchQuery] = useState("");
    const [users, setUsers] = useState([]);
    const {username} = useChatAuth();

    async function getMembers() {
        try {
            const response = await axios.get(`http://${props.url}/members`);
            setMembers(response.data);
        }
        catch (err) {

        }
    }
    useEffect(() => {
        getMembers()
    }, [])
    function closeMembers(e) {
        e.target.parentNode.style.display = "none";
        document.querySelector(".msg-typearea").style.display = "block";

    }
    function removeMember(e) {
        try {
            const username = e.target.parentNode.children[0].innerText;
            const parent = document.querySelector(".confirm-delete-helper");
            parent.style.display = "block";
            setUser(username);
            // parent.children[0].style.display = "block";
        }
        catch (err) { }
    }
    function cancelRemoveMem() {
        try {
            const parent = document.querySelector(".confirm-delete-helper");
            parent.style.display = "none";
            // parent.children[0].style.display = "none";
        }
        catch (err) { }
    }
    async function confirmRemoveMem() {
        try {
            const grpName = realmRef.current.slice(0, -6);
            console.log(grpName)
            console.log(user)
            // const response = await axios.post("http://localhost:8004/delmem", {
            const response = await axios.post("https://groups.yappyyap.xyz/delmem", {
                name: user,
                grpName: grpName
            })
            getMembers();
            cancelRemoveMem();
        }
        catch (err) { 
            console.log(err)
        }
    }
    function addMember(e) {
            document.querySelector(".add-search-members-overlay").style.display = "block"
            // setUsers() add dm users 
    }
    async function searchUsers(e) {
        // await axios.get("http://localhost:8001/users");
        const usernameQuery = e.target.value;
        setSearchQuery(usernameQuery);
        if(usernameQuery == "") {
            setUsers([]);
            return;
        }
        try{
            // const response = await axios.get(`http://localhost:8001/search/${usernameQuery}`);
            const response = await axios.get(`https://auth.yappyyap.xyz/search/${usernameQuery}`);
            setUsers(response.data)
        }
        catch(err) {
        }
    }
    function cancelAddMember(e) {
        e.target.parentNode.parentNode.style.display = "none"
    }
    async function addToGroup(e) {
        const element = e.target;
        try{
            let username = element.parentNode.children[0].innerText;
            let message = {
                "recipient" : username,
                "defaultExpiration" : false,
                "msg" : `${realmRef.current.slice(0, -6)}`,
                "duration" : 3600,
                "type" : "invite"
            }
            ws.current.send(JSON.stringify(message));
            element.innerHTML = "&#10003; sent"
            element.style.color = "#22ee3a";
        }
        catch(err) {
            console.log(err)
            element.innerHTML = "Not sent"
            element.style.color = "red";
        }
        element.style.cursor = "text";
        element.style.fontSize = "1rem";
    }
    return (
        <div className="members-area">
            <div className="cancel-members" onClick={closeMembers}>
                X
            </div>
            <h3>Members:</h3>
            <div className="add-search-members-overlay">
                <div className="add-search-members">
                    <span className="cancel-add-mem" onClick={cancelAddMember}>X</span>
                    <input type="text" placeholder="Enter Username" value={searchQuery} onChange={searchUsers}/>
                    <ul className="members-to-add">
                        {users.map((element) => {
                            if(members.includes(element)) {
                            return (<li key={element}>
                                <span className="searched-mem-name">{element}</span>
                                <span className="already-in-group" >Already in Group</span>
                            </li> )
                            }
                            return (<li key={element}>
                                <span className="searched-mem-name">{element}</span>
                                <span className="add-to-group" onClick={addToGroup}>+</span>
                            </li> )
                        })}
                    </ul>
                </div>
            </div>
            <ul className="members-list">
                {(username == props.owner || props.inviteType != "invite") && <li className="add-new-member" onClick={addMember}>Add a new Member&emsp;+</li>}
                {members.map((element) => <li key={element} className="single-member">
                    <span className="member-name">{element}</span>
                    {props.owner == username && <span className="member-remove" onClick={removeMember}>-</span>}
                </li>)}
            </ul>
            <div className="confirm-delete-helper">
                <div className="confirm-delete">
                    <p>Are you sure you want to delete this user</p>
                    <div className="confirm-delete-buttons">
                        <button className="confirm-delete-option" onClick={confirmRemoveMem}>Yes</button>
                        <button className="confirm-delete-option" onClick={cancelRemoveMem}>No</button>
                    </div>
                </div>
            </div>
        </div>
    )
}