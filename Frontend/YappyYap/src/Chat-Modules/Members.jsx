import { useContext, useEffect, useState } from "react";
import useAxios from "../../hooks/useAxios";
import "./ChatHeader.css"
import "../Chat.css"
import { ChatContext } from "../ChatContext";

export default function Members(props) {
    const axios = useAxios();
    const [members, setMembers] = useState([{ "name": "Chaman" }, { "name": "Chaan" }]);
    const [user, setUser] = useState("");
    const { realmRef } = useContext(ChatContext);

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
            const parent = document.querySelector(".confirm-delete-helper");
            parent.style.display = "block";
            parent.children[0].style.display = "block";
        }
        catch (err) { }
    }
    function cancelRemoveMem() {
        try {
            const parent = document.querySelector(".confirm-delete-helper");
            parent.style.display = "none";
            parent.children[0].style.display = "none";
        }
        catch (err) { }
    }
    async function confirmRemoveMem() {
        try {
            const grpName = realmRef.current.slice(0, -6);
            const response = await axios.post("http://localhost:8004/delmem", {
                name: user,
                grpName: grpName
            })
            getMembers();
            cancelRemoveMem();
        }
        catch (err) { }
    }
    return (
        <div className="members-area">
            <div className="cancel-members" onClick={closeMembers}>
                X
            </div>
            <h3>Members:</h3>
            <ul className="members-list">
                <li className="add-new-member">Add a new Member&emsp;+</li>
                {members.map((element) => <li key={element.name} className="single-member">
                    <span className="member-name">{element.name}</span>
                    <span className="member-remove" onClick={removeMember}>-</span>
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