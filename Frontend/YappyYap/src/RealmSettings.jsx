import { useState, useEffect } from "react";
import useAxios from "../hooks/useAxios";
import useChatAuth from "../hooks/useChatAuth"
export default function RealmSettings(props) {
    const {username} = useChatAuth()
    const [status, setStatus] = useState()
    const [details, setDetails] = useState(null)
    const [description, setDescription] = useState("")
    const [name, setName] = useState()
    const [members, setMembers] = useState([])
    const [confirmDel, setDelete] = useState(false)
    const [loading, setLoading] = useState(true)
    const axios = useAxios()
    const priviliged = details.role && (details.role == "owner" || details.role == "admin")
    async function load() {
        setLoading(true)
        try{
            const details = await axios.get(`http://localhost:8004/realms/${props.realm}`)
            const members = await axios.get(`http://localhost:8004/realms/${props.realm}/members`)
            setMembers(members)
            setDetails(details.data)
            setDescription(details.data.description)
        }
        catch(err) {
            if(err.response && err.response.data)
                showStatus(err.response.data)
            showStatus("Could not load realm settings")
        }
        finally{
            setLoading(false)
        }
    }
    useEffect(()=> {
        load()
    }, [props.realm])

    function showStatus(msg) {
        setStatus(msg)
        setTimeout(() => setStatus(""), 3000)
    }

    async function delRealm() {
        try{
            await axios.delete(`http://localhost:8004/realms/${props.realm}`)
            props.onDelete()
        }
        catch(err) {
            if(err.response && err.response.data)
                showStatus(err.response.data.detail[0].msg)
            showStatus("Could not delete the realm, try again in a while")
        }
    }

    async function leaveRealm() {
        try{
            await axios.post(`http://localhost:8004/realms/${props.realm}/leave`)
            props.onDelete()
        }
        catch(err) {
            if(err.response && err.response.data)
                showStatus(err.response.data.detail[0].msg)
            showStatus("Could not leave the realm, try again later")
        }
    }
    if(loading)
        return (
            <div className="realm-settings-overlay">
                <div className="realm-settings">
                    Loading...
                </div>
            </div>        
        )
    if(!details)
        return(
            <div className="realm-settings-overlay">
                <div className="realm-settings">
                    <p className="cancel-cross" onClick={props.onClose}>X</p>
                    <p>{status || "Could not load the realm's settings"}</p>
                </div>
            </div>
        )
    return (
        <div className="realm-settings-overlay">
            <div className="realm-settings">
                <p className="cancel-cross" onClick={props.onClose}>X</p>
                <h2>Realm Settings</h2>
                <p>You: {details.role}</p>
                {status && <p>{status}</p>}
                <div className="realm-setting">
                    <h3>Name and description</h3>
                    <input type="text" value={name} disabled={!priviliged} maxLength={40} minLength={1} onChange={e => setName(e.target.value)}/>
                    <textarea rows={2} value={description} disabled={!priviliged} maxLength={250} onChange={e => setDescription(e.target.value)} />
                        {priviliged && <button>Save</button>}
                </div>
                <div className="realm-setting">
                    <h3>Who can join</h3>
                    {priviliged ? <select value={details.inviteType}>
                            <option value="invite">Invited individuals only</option>
                            <option value="all">Anyone can join without any invitation</option>
                        </select>: <p>{details.inviteType == "all"? "Open realm": "Invite only"}</p>}
                </div>
                <div className="realm-setting">
                    <h3>Members (members.length)</h3>
                    <ul>
                        {members.map(mem => (
                            <li key={mem.username} className="realm-member">
                                <span className="realm-member-name">{mem.username} {mem.username == username && "(you)"}</span>
                                <span className={`realm-member-role realm-member-role-${mem.role}`}>{mem.role}</span>
                                {details.role == "owner" && mem.role != "owner" && (
                                    <span className="realm-member-actions">
                                        {mem.role =="member"? <button>Promote to admin</button>: <button>Demote to member</button>}
                                        <button>Remove User</button>
                                    </span>
                                )}
                            </li>
                        ))}
                    </ul>
                </div>
                <div className="realm-setting">
                    {details.role != "owner" && <button onClick={leaveRealm}>Leave Realm</button>}
                    {details.role == "owner" && !confirmDel && <button onClick={()=> setDelete(true)}>Delete Realm</button>}
                    {details.role == "owner" && confirmDel && 
                        <>
                            <p>Delete {details.name}. Everything in the whole realm will be deleted</p>
                            <button onClick={delRealm}>Delete it</button>
                            <button onClick={()=> setDelete(false)}>Cancel</button>
                        </>
                    }
                </div>
            </div>
        </div>
    )
}