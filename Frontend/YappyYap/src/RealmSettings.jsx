import { useState, useEffect, useRef, useContext } from "react";
import useChatAuth from "../hooks/useChatAuth"
import "./RealmSettings.css"
import axios from "axios";
import { ChatContext } from "./ChatContext";
import { GROUPS_URL } from "./config";
export default function RealmSettings(props) {
    const {username} = useChatAuth()
    const {ws, setRealmDetails} = useContext(ChatContext)
    const [status, setStatus] = useState("")
    const colorRef = useRef("red")
    const [details, setDetails] = useState(null)
    const [description, setDescription] = useState("")
    const [name, setName] = useState("")
    const [members, setMembers] = useState([])
    const [confirmDel, setDelete] = useState(false)
    const [loading, setLoading] = useState(true)
    const [removeUser, setRemoveUser] = useState(null)
    const [transferUser, setTransferUser] = useState(null)
    const [inviteUser, setInviteUser] = useState("")
    const [inviteLink, setInviteLink] = useState(null)
    const [invites, setInvites] = useState([])
    const [inviteType, setInviteType] = useState("");
    const [addUser, setAddUser] = useState("")
    const [leave, setLeave]  = useState(false);
    const timeOutRef = useRef();
    const priviliged = details && details.role && (details.role == "owner" || details.role == "admin")
    async function load() {
        setLoading(true)
        try{
            const details = await axios.get(`${GROUPS_URL}/realms/${props.realm}`)
            const members = await axios.get(`${GROUPS_URL}/realms/${props.realm}/members`)
            setMembers(members.data)
            setDetails(details.data)
            setName(details.data.name)
            setDescription(details.data.description || "")
            setInviteType(details.data.inviteType)
            if (details.data.role == "owner" || details.data.role == "admin")
                await loadInvites()
        }
        catch(err) {
            if(err.response && err.response.data)
                showStatus(err.response.data.detail[0].msg)
            else
                showStatus("Could not load realm settings")
        }
        finally{
            setLoading(false)
        }
    }
    async function loadInvites() {
        try{
            const res = await axios.get(`${GROUPS_URL}/realms/${props.realm}/invites`)
            setInvites(res.data)
        }
        catch(err) {
            if(err.response && err.response.data)
                showStatus(err.response.data.detail[0].msg)
            else
                showStatus("Could not load pending invites")
        }
    }
    async function cancelInvite(token, invitedUser) {
        try{
            await axios.post(`${GROUPS_URL}/invites/${token}/cancel`)
            setInvites(pre => pre.filter(invite => invite.token != token))
            showStatus(`Cancelled invite for ${invitedUser}`, false)
        }
        catch(err) {
            if(err.response && err.response.data)
                showStatus(err.response.data.detail[0].msg)
            else
                showStatus("Could not cancel the invite")
        }
    }
    useEffect(()=> {
        load()
    }, [props.realm])

    function showStatus(msg, red = true) {
        setStatus(msg)
        if(red)
            colorRef.current = "red"
        else
            colorRef.current = "green"
        clearTimeout(timeOutRef.current)
        timeOutRef.current = setTimeout(() => setStatus(""), 5000)
    }

    async function addMemDirect(e) {
        e.preventDefault()
        const user = addUser.trim()
        if(!user)
            return
        try{
            await axios.post(`${GROUPS_URL}/realms/${props.realm}/members/add`, {
                username: user
            })
            showStatus(`Added ${user} to the realm`, false)
            setRealmDetails(pre => {return {...pre, "members": pre["members"] + 1}})
            setAddUser("")
            load()
        }
        catch(err) {
            if(err.response && err.response.data)
                showStatus(err.response.data.detail[0].msg)
            else
                showStatus("Adding user to realm failed, try again")
        }
    }

    async function sendInvite(e) {
        e.preventDefault()
        const user = inviteUser.trim()
        if(!user)
            return
        try{
            const res = await axios.post(`${GROUPS_URL}/invites/realm/${props.realm}`, {
                username: user
            })
            const link = `${window.location.origin}/invite/${res.data.token}`
            setInviteLink(link)
            setInviteUser("")
            loadInvites()
            const flag = sendInviteDm(user, details.name, link)
            showStatus(flag ? `Invite sent to ${user} as DM` :`Invite created for ${user}, could not dm so copy it and manually send them`, false)
        }
        catch(err) {
            if(err.response && err.response.data)
                showStatus(err.response.data.detail[0].msg)
            else
                showStatus("Failed to create invite for the user, try again")
        }
    }

    async function delRealm() {
        try{
            await axios.delete(`${GROUPS_URL}/realms/${props.realm}`)
            props.onDelete()
        }
        catch(err) {
            if(err.response && err.response.data)
                showStatus(err.response.data.detail[0].msg)
            else
                showStatus("Could not delete the realm, try again in a while")
        }
        finally{
            setDelete(false)
        }
    }

    async function leaveRealm() {
        try{
            await axios.post(`${GROUPS_URL}/realms/${props.realm}/leave`)
            props.onDelete()
        }
        catch(err) {
            if(err.response && err.response.data)
                showStatus(err.response.data.detail[0].msg)
            else
                showStatus("Could not leave the realm, try again later")
        }
        finally{
            setLeave(false)
        }
    }

    async function promote(name) {
        try{
            await axios.patch(`${GROUPS_URL}/realms/${props.realm}/members`, {name: name, role: "admin"})
            setMembers(pre => pre.map(mem => mem.username == name ? {...mem, role: "admin"}: mem))
            showStatus(`Promoted ${name} to admin`, false)
        }
        catch(err) {
            if(err.response && err.response.data)
                showStatus(err.response.data.detail[0].msg)
            else
                showStatus("Promoting selected user failed, try again")
        }
    }

    async function demote(name) {
        try{
            await axios.patch(`${GROUPS_URL}/realms/${props.realm}/members`, {name: name, role: "member"})
            setMembers(pre => pre.map(mem => mem.username == name ? {...mem, role: "member"}: mem))
            showStatus(`Demoted ${name} to member`, false)
        }
        catch(err) {
            if(err.response && err.response.data)
                showStatus(err.response.data.detail[0].msg)
            else
                showStatus("Demoting selected user failed, try again")
        }
    }

    async function transferOwner() {
        if(!transferUser)
            return
        try{
            await axios.post(`${GROUPS_URL}/realms/${props.realm}/make-owner`, {
                username: transferUser
            })
            showStatus(`${transferUser} is now the new owner`, false)
            setRealmDetails(pre => {return {...pre, "owner": transferUser}})
            load()
        }
        catch(err){
            if(err.response && err.response.data)
                showStatus(err.response.data.detail[0].msg)
            else
                showStatus("Could not make the other user owner")
        }
        finally{
            setTransferUser(null)
        }
    }

    async function remove(){
        if(!removeUser)
            return
        try{
            await axios.post(`${GROUPS_URL}/realms/${props.realm}/members/${removeUser}/remove`)
            setMembers(pre => pre.filter(mem => mem.username != removeUser))
            setRealmDetails(pre => {return {...pre, "members": pre["members"] - 1}})
            showStatus(`Removed user ${removeUser} from realm`, false)
        }
        catch(err) {
            if(err.response && err.response.data)
                showStatus(err.response.data.detail[0].msg)
            else
                showStatus("Removing user from realm failed, try again")
        }
        finally{
            setRemoveUser(null)
        }
    }

    function sendInviteDm(recipient, realm, link) {
        if(!ws || !ws.current || ws.current.readyState != WebSocket.OPEN)
            return false
        try{
            const msg = {recipient: recipient, defaultExpiration: false, duration: 86400, msg: `You have been invited to the realm ${realm}. <a href="${link}" target="_blank" rel="noopener" class="invite-link">Click to join</a>`}
            ws.current.send(JSON.stringify(msg))
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
        showStatus("Invite link copied", false)
    }

    async function updateRealm(data) {
        try{
            await axios.patch(`${GROUPS_URL}/realms/${props.realm}`, data)
            showStatus(`Updated ${Object.keys(data).join(" and ")} of realm successfully`, false)
            setRealmDetails(pre => {return {...pre, ...data}})
        }
        catch(err) {
            if(err.response && err.response.data)
                showStatus(err.response.data.detail[0].msg)
            else
                showStatus(`Updating ${Object.keys(data)} of realm failed`)
        }

    }
    function setInvite(e) {
        setInviteType(e.target.value)
        updateRealm({"inviteType": e.target.value})
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
                    <p className="realm-settings-status">{status || "Could not load the realm's settings"}</p>
                </div>
            </div>
        )
    return (
        <div className="realm-settings-overlay">
            <div className="realm-settings">
                <p className="cancel-cross" onClick={props.onClose}>X</p>
                <h2>Realm Settings</h2>
                <p>You: {details.role}</p>
                {status && <p className="realm-settings-status" style={{color: colorRef.current}}>{status}</p>}
                <div className="realm-setting">
                    <h3>Name and description</h3>
                    <input type="text" value={name} disabled={!priviliged} maxLength={40} minLength={1} onChange={e => setName(e.target.value)}/>
                    <textarea rows={2} value={description} disabled={!priviliged} maxLength={250} onChange={e => setDescription(e.target.value)} />
                        {priviliged && <button onClick={() => updateRealm({"name": name, "description": description})}>Save</button>}
                </div>
                <div className="realm-setting">
                    <h3>Who can join</h3>
                    {priviliged ? <select value={inviteType} onChange={e => setInvite(e)}>
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
                        <h3>Pending invites - {invites.length}</h3>
                        <ul className="realm-settings-members pending-invites">
                            {invites.map(invite => (
                                <li key={invite.token} className="realm-member">
                                    <p className="member-details">
                                        <span className="realm-member-name">{invite.username}</span>
                                        <span className="realm-member-role">by {invite.invitedBy}{invite.expiresAt ? `, expires ${new Date(invite.expiresAt).toLocaleString()}` : ""}</span>
                                    </p>
                                    <span className="realm-member-actions">
                                        <button onClick={() => cancelInvite(invite.token, invite.username)}>Cancel</button>
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
                <div className="realm-setting">
                    <h3>Members - {members.length}</h3>
                    <ul className="realm-settings-members">
                        {members.map(mem => (
                            <li key={mem.username} className="realm-member">
                                <p className="member-details">
                                <span className="realm-member-name">{mem.username} {mem.username == username && "(you)"}</span>
                                <span className={`realm-member-role realm-member-role-${mem.role}`}>{mem.role}</span>
                                </p>
                                {details.role == "owner" && mem.role != "owner" && (
                                    <span className="realm-member-actions">
                                        {
                                            mem.role =="member"? 
                                            <button onClick={() => promote(mem.username)}>Promote to admin</button> : <button onClick={() => demote(mem.username)}>Demote to member</button>
                                        }
                                        <button onClick={()=> setTransferUser(mem.username)}>Make Owner</button>
                                        <button onClick={() => setRemoveUser(mem.username)}>Remove User</button>
                                    </span>
                                )}
                            </li>
                        ))}
                    </ul>
                </div>
                {removeUser &&
                    <div className="realm-setting remove-user-confirm realm-settings-confirmation">
                        <p>Remove <b>{removeUser}</b> from everything in realm, delete their owned channel and remove them from every channel?</p>
                        <div className="buttons">
                        <button onClick={remove}>Remove</button>
                        <button onClick={() => setRemoveUser(null)}>Cancel</button>
                        </div>
                    </div>
                }
                {transferUser &&
                    <div className="transfer-user-confirm realm-settings-confirmation">
                        <p>Make <b>{transferUser} the new realm owner and demote yourself to admin?</b></p>
                        <div className="buttons">
                        <button onClick={transferOwner}>Confirm</button>
                        <button onClick={() => setTransferUser(null)}>Cancel</button>
                        </div>
                    </div>
                }
                <div className="realm-setting realm-settings-red">
                    {details.role != "owner" && <button onClick={() =>  setLeave(true)}>Leave Realm</button>}
                    {details.role == "owner" && !confirmDel && <button onClick={()=> setDelete(true)}>Delete Realm</button>}
                </div>
                {details.role == "owner" && confirmDel && 
                    <div className="delete-realm-confirmation realm-settings-confirmation">
                        <p>Delete {details.name}?Everything in the whole realm will be deleted. This action cannot be undone once confirmed.</p>
                        <div className="buttons">
                            <button onClick={delRealm} className="realm-delete-confirm realm-settings-dngr">Delete it</button>
                            <button onClick={()=> setDelete(false)}>Cancel</button>
                        </div>
                    </div>
                }
                {leave &&
                    <div className="leave-realm-confirmation realm-settings-confirmation">
                        <p>Leave Realm. If you leave realm all groups will be left too. Are you sure you want to leave?</p>
                        <div className="buttons">
                            <button onClick={leaveRealm} className="leave-realm-confirm-btn realm-settings-dngr">Sure</button>
                            <button onClick={() => setLeave(false)}>Nope</button>
                        </div>
                    </div>
                }
            </div>
        </div>
    )
}