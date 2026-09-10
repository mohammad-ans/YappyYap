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
    const [removeUser, setRemoveUser] = useState(null)
    const [transferUser, setTransferUser] = useState(null)
    const [inviteUser, setInviteUser] = useState("")
    const [inviteLink, setInviteLink] = useState(null)
    const [addUser, setAddUser] = useState("")
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

    async function addMemDirect(e) {
        e.preventDefault()
        const user = addUser.trim()
        if(!user)
            return
        try{
            await axios.post(`http://localhost:8004/realms/${props.realm}/members/add`, {
                username: user
            })
            setStatus(`Added ${user} to the realm`)
            setAddUser("")
            load()
        }
        catch(err) {
            if(err.response && err.response.data)
                showStatus(err.response.data.detail[0].msg)
            showStatus("Adding user to realm failed, try again")
        }
    }

    async function sendInvite(e) {
        e.preventDefault()
        const user = inviteUser.trim()
        if(!user)
            return
        try{
            const res = await axios.post(`http://localhost:8004/invites/realm/${props.realm}`, {
                username: user
            })
            const link = `http://localhost:8004/invite/${res.data.token}`
            setInviteLink(link)
            setInviteUser("")
            const flag = sendInviteDm(user, details.name, link)
            showStatus(flag ? `Invite sent to ${user} as DM` :`Invite created for ${target}, could not dm so copy it and manually send them`)
        }
        catch(err) {
            if(err.response && err.response.data)
                showStatus(err.response.data.detail[0],msg)
            showStatus("Failed to create invite for the user, try again")
        }
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

    async function promote(name) {
        try{
            await axios.patch(`http://localhost:8004/realms/${props.realm}/members`, {name: name, role: "admin"})
            setMembers(pre => pre.map(mem => mem.username == name ? {...mem, role: "admin"}: mem))
            showStatus(`Promoted ${name} to admin`)
        }
        catch(err) {
            if(err.response && err.response.data)
                showStatus(err.response.data.detail[0].msg)
            showStatus("Promoting selected user failed, try again")
        }
    }

    async function demote(name) {
        try{
            await axios.patch(`http://localhost:8004/realms/${props.realm}/members`, {name: name, role: "member"})
            setMembers(pre => pre.map(mem => mem.username == name ? {...mem, role: "member"}: mem))
            showStatus(`Demoted ${name} to member`)
        }
        catch(err) {
            if(err.response && err.response.data)
                showStatus(err.response.data.detail[0].msg)
            showStatus("Demoting selected user failed, try again")
        }
    }

    async function transferOwner() {
        if(!transfer)
            return
        try{
            await axios.post(`http://localhost:8004/realms/${props.realm}/make-owner`, {
                username: transferUser
            })
            showStatus(`${transferUser} is now the new owner`)
            setTransferUser(null)
            load()
        }
        catch(err){
            if(err.response && err.response.data)
                showStatus(err.response.data.detail[0].msg)
            showStatus("Could not make the other user owner")
        }
    }

    async function remove(){
        if(!removeUser)
            return
        try{
            await axios.post(`http:localhost:8004/realms/${props.realm}/members/${removeUser}/remove`)
            setMembers(pre => pre.filter(mem => mem != removeUser))
            showStatus(`Removed user ${removeUser} from realm`)
        }
        catch(err) {
            if(err.response && err.response.data)
                showStatus(err.response.data.detail[0].msg)
            showStatus("Removing user from realm failed, try again")
        }
    }

    function sendInviteDm(recipient, realm, link) {
        if(!props.ws.current || props.ws.current.readyState != WebSocket.OPEN)
            return false
        try{
            const msg = {recipient: recipient, defaultExpiration: false, duration: 86400, msg: `You have been invite to the realm ${realm}. Invite Link:  <a href="${link}" target="_blank" rel="noopener"></a>`}
            props.ws.current.send(JSON.stringify(msg))
            return true
        }
        catch{
            return false
        }
    }

    function copyLink() {
        if(!inviteLink)
            return
        navigator.clipboard?.writeText(inviteLink)
        showStatus("Invite link copied")
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
                {priviliged && (
                    <div className="realm-setting">
                        <h3>Add Member directly</h3>
                        <form onSubmit={addMemDirect}>
                            <input type="text" placeholder="username" value={addUser} onChange={e => setAddUser(e.target.value)}/>
                            <button type="submit">Add</button>
                        </form>
                    </div>
                )}
                {priviliged && (
                    <div className="realm-setting">
                        <h3>Invite someone to Realm</h3>
                        <form onSubmit={sendInvite}>
                            <input type="text" placeholder="username" value={inviteUser} onChange={e => setInviteUser(e.target.value)}/>
                            <button type="submit">Create Invite</button>
                        </form>
                        {inviteLink && (
                            <div className="invite-action">
                                <code>{inviteLink}</code>
                                <button onClick={copyLink}>Copy</button>
                            </div>
                        )}
                    </div>
                )}
                <div className="realm-setting">
                    <h3>Members (members.length)</h3>
                    <ul>
                        {members.map(mem => (
                            <li key={mem.username} className="realm-member">
                                <span className="realm-member-name">{mem.username} {mem.username == username && "(you)"}</span>
                                <span className={`realm-member-role realm-member-role-${mem.role}`}>{mem.role}</span>
                                {details.role == "owner" && mem.role != "owner" && (
                                    <span className="realm-member-actions">
                                        {
                                            mem.role =="member"? 
                                            <button onClick={() => promote(mem.username)}>Promote to admin</button> : <button onClick={() => demote(mem.username)}>Demote to member</button>
                                        }
                                        <button onClick={()=> setTransferUser(mem.username)}></button>
                                        <button onClick={() => setRemoveUser(true)}>Remove User</button>
                                    </span>
                                )}
                            </li>
                        ))}
                    </ul>
                </div>
                {removeUser &&
                    <div className="realm-setting">
                        <p>Remove <b>{removeUser}</b> from everything in realm, delete their owned channel and remove them from every channel</p>
                        <button onClick={remove}>Remove</button>
                        <button onClick={() => setRemoveUser(null)}>Cancel</button>
                    </div>
                }
                {transferUser &&
                    <div className="realm-setting">
                        <p>Make <b>{transferUser} the new realm owner and demote yourself to admin?</b></p>
                        <button onClick={transferOwner}>Confirm</button>
                        <button onClick={() => setTransferUser(null)}>Cancel</button>
                    </div>
                }
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