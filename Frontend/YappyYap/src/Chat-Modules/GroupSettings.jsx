import {useContext, useEffect, useRef, useState} from "react"
import useChatAuth from "../../hooks/useChatAuth"
import { ChatContext } from "../ChatContext"
import "./GroupSettings.css"
import axios from "axios"
export default function GroupSettings(props) {
    const [members, setMembers] = useState([])
    const [details, setDetails] = useState(null)
    const [description, setDescription] = useState("")
    const [status, setStatus] = useState("")
    const [delConfirm, setDelConfirm] = useState(false)
    const [loading, setLoading] = useState(true)
    const {username} = useChatAuth()
    const priviliged = details && (details.role == "admin" || details.role == "owner")
    const {setRealm, ws} = useContext(ChatContext)
    const [transferTarget, setTarget] = useState(null)
    const [inviteUsername, setInviteUsername] = useState("")
    const [inviteLink, setInviteLink] = useState(null)
    const [leaveConfirm, setLeaveConfirm] = useState(null)
    const [removeTarget, setRemove] = useState(null)
    const colorRef = useRef("red")
    const timeoutRef = useRef()
    async function load() {
        setLoading(true)
        try{
            const members = await axios.get(`http://localhost:8004/realms/${props.realm}/groups/${props.group}/members`)
            const details = axios.get(`http://localhost:8004/realms/${props.realm}/groups/${props.group}/details`)
            setDetails(details.data)
            setDescription((await details).data.description || "")
            setMembers(members.data)
        }
        catch(err) {
            if(err.response && err.response.data)
                setStatus(err.response.data.detail[0].msg)
            else
                setStatus("Could not load channel settings")
        }
        finally{
            setLoading(false)
        }
    }
    useEffect(()=> {
        load()
    }, [props.group])
    async function saveInviteType(value) {
        try{
            await axios.patch(`http://localhost:8004/realms/${props.realm}/groups/${props.group}`, {inviteType: value})
            setDetails(pre => ({...pre, inviteType: value}))
            showStatus("Updated invite type", false)
        }
        catch(err) {
            if(err.response && err.response.data)
                showStatus(err.response.data.detail[0].msg)
            else
                showStatus("Could not update invite type")
        }
    }
    function showStatus(msg, red=true) {
        setStatus(msg)
        colorRef.current = red ? "red" : "green"
        clearTimeout(timeoutRef.current)
        timeoutRef.current = setTimeout(() => setStatus(""), 5000)
    }
    async function saveDescription() {
        try{
            await axios.patch(`http://localhost:8004/realms/${props.realm}/groups/${props.group}`, {description})
            showStatus("Updated description", false)
        }
        catch(err) {
            if(err.response && err.response.data)
                showStatus(err.response.data.detail[0].msg)
            else
                showStatus("Could not update description")
        }
    }
    async function promote(name) {
        try{
            await axios.patch(`http://localhost:8004/realms/${props.realm}/groups/${props.group}/members`, {name: name, role: "admin"})
            setMembers(pre => pre.map(mem => mem.username == name ? {...mem, role: "admin"} : mem))
            showStatus(`${name} promoted to admin`, false)
        }
        catch(err){
            if(err.response && err.response.data)
                showStatus(err.response.data.detail[0].msg)
            else
                showStatus("Could not promote to admin")
        }
    }
    async function demote(name) {
        try{
            await axios.patch(`http://localhost:8004/realms/${props.realm}/groups/${props.group}/members`, {name: name, role: "member"})
            setMembers(pre => pre.map(mem => mem.username == name ? {...mem, role: "member"}: mem))
            showStatus(`${name} demoted to member`, false)
        }
        catch(err) {
            if (err.response && err.response.data)
                showStatus(err.response.data.detail[0].msg)
            else
                showStatus("Could not demote to member")
        }
    }
    async function leave() {
        try{
            await axios.post(`http://localhost:8004/realms/${props.realm}/groups/${props.group}/leave`)
            await setRealm(props.realm)
            props.onDeleted()
        }   
        catch(err) {
            if(err.response && err.response.data)
                showStatus(err.response.data.detail[0].msg)
            else
                showStatus("Could not leave channel")
        }
        finally{
            setLeaveConfirm(false)
        }
    }
    async function removeMember() {
        try{
            await axios.post(`http://localhost:8004/realms/${props.realm}/groups/${props.group}/members/remove`, {username: removeMember})
            setMembers(pre => pre.filter(pre => pre.username != removeMember))
            showStatus(`Removed ${removeMember}`)
        }
        catch(err) {
            if (err.response && err.response.data)
                showStatus(err.response.data.detail[0].msg)
            else
                showStatus("Could not remove member")
        }
        finally{
            setRemove(null)
        }
    }
    async function deleteChannel() {
        try{
             await axios.delete(`http://localhost/realms/${props.realm}/groups/${props.group}`)
             await setRealm(props.realm)
             props.onDeleted()
        }
        catch(err) {
            if (err.response && err.response.data)
                showStatus(err.response.data.detail[0].msg)
            else
                showStatus("Could not delete channel")
        }
        finally{
            setDelConfirm(false)
        }
    }
    async function sendInvite(e) {
        e.preventDefault()
        const target = inviteUsername.trim()
        if(!target)
            return
        try{
            const res = await axios.post(`http://localhost:8004/invites/group/${props.realm}/${props.group}`, {
                username: target
            })
            const link = `http://localhost:8004/invite/${res.data.token}/redeem`
            setInviteLink(link)
            setInviteUsername("")
            const delivered = sendInviteDM(target, `#${details.name}`, link)
            showStatus(delivered ? `Invite sent to ${target} as a DM, they can also use the link below`: `Invite created for ${target}, could not DM it automatically, so copy the link below and send it manually.`, false)
        }
        catch(err) {
            if(err.response && err.response.data)
                showStatus(err.response.data.detail[0].msg)
            else
                showStatus("Could not create invite")
        }
    }
    function sendInviteDM(username, grpName, link) {
        if(!ws.current || ws.current.readyState !== WebSocket.OPEN)
            return false
        try{
            const message = {recipient: username, expiration: false, duration: 86400, 
                msg: `You have been invited to ${grpName} <a href="${link}" target="_blank" rel="noopener" class="invite-link">Click to join</a>`
            }
        }
        catch{
            return false
        }
    }
    function copyLastInvite() {
        if(!inviteLink)
            return
        navigator.clipboard?.writeText(inviteLink)
        showStatus("Invite link copied")
    }

    async function makeOwner() {
        if(!transferTarget)
            return
        try{
            await axios.post(`http://localhost:8004/realms/${props.realm}/groups/${props.group}/make-owner`, {
                username: transferTarget
            })
            showStatus(`${transferTarget} is now the owner of the channel`, false)
            setTarget(null)
            load()
        }
        catch(err) {
            if(err.response && err.response.data)
                showStatus(err.response.data.detail[0].msg)
            else
                showStatus("Could not make the other user owner of the channel")
        }
    }

    if(loading)
        return(
            <div className="grpsettings-overlay">
                <div className="grp-settings">Loading...</div>
            </div>
        )
    if(!details)
        return(
            <div className="grpsettings-overlay">
                <div className="grp-settings">
                    <p className="cancel-cross" onClick={props.onClose}>X</p>
                    <p className="status">{status || "Could not load settings"}</p>
                </div>
            </div>
        )
    return(
        <div className="grpsettings-overlay">
            <div className="grp-settings">
                <p className="cancel-cross" onClick={props.onClose}>X</p>
                <h2>{details.name}</h2>
                <p className="mem-role">You: {details.role || "viewer"}</p>
                {status && <p className="group-settings-status" style={{color: colorRef.current}}>{status}</p>}
                <div className="single-setting">
                    <h3>Description</h3>
                    <textarea rows={2} maxLength={250} value={description} disabled={!priviliged} onChange={e => setDescription(e.target.value)}></textarea>
                    {priviliged && <button onClick={saveDescription}>Save</button>}
                </div>
                <div className="single-setting">
                    <h3>Who can Join</h3>
                    {priviliged ? (<select value={details.inviteType} onChange={e => saveInviteType(e.target.value)}>
                        <option value="all">Any realm member can join</option>
                        <option value="invite">Only invited people can join</option>
                    </select>)
                        : (<p>{details.inviteType == "all" ? "Anyone in realm": "Invite only"}</p>)}
                </div>
                {priviliged && <div className="single-setting">
                    <h3>Invite Someone</h3>
                    <p className="low-text">Invites can only be used by the person to whom they were intended to send, nobody else can use it</p>
                    <form className="invite-area" onSubmit={sendInvite}>
                        <input type="text" placeholder="username" value={inviteUsername} onChange={e => setInviteUsername(e.target.value)}/>
                        <button type="submit">Create Invite</button>
                    </form>
                    {inviteLink && (
                        <div className="invite-actions">
                            <code className="invite-code">{inviteLink}</code>
                            <button onClick={copyLastInvite}>Copy</button>
                        </div>
                    )}
                </div>
                }
                <div className="single-setting">
                    <h3>Members ({members.length}/{details.maxGrpSize})</h3>
                    <ul className="group-members-list">
                        {members.map(mem => <li key={mem.username} className="group-member">
                            <div className="member-details">
                            <span className="group-member-name">{mem.username} {mem.username == username && "(you)"}</span>
                            <span className={`group-member-role role-${mem.role}`}>{mem.role}</span>
                            </div>
                            {details.owner == username && mem.role !== "owner" && (
                                <span className="group-member-settings">
                                    {mem.role == "member"? <button onClick={()=> promote(mem.username)}>Make Admin</button>: <button>Remove Admin</button>}
                                    {mem.role == "admin" && <button onClick={()=> demote(mem.username)}>Demote</button>}
                                    <button onClick={() => setTarget(mem.username)}>Make Channel Owner</button>
                                    <button onClick={()=> setRemove(mem.username)}>Remove</button>
                                </span>
                            )}
                            {priviliged && details.owner != username && mem.role == "member" && <span className="group-member-settings">
                                    <button onClick={() => setRemove(mem.username)}>Remove</button>
                                </span>}
                            </li>)}
                    </ul>
                </div>
                {removeTarget && (<div className="confirm-overlay">
                    <p>Are you sure you want to remove {removeMember} from group?</p>
                    <div className="buttons">
                        <button onClick={removeMember}>Yes</button>
                        <button onClick={()=> setRemove(false)}>Cancel</button>
                    </div>
                </div>)}
                {transferTarget && (
                    <div className="confirm-overlay">
                        <p>Make <b>{transferTarget}</b> the new channel owner and demote yourself to an admin?</p>
                        <div className="buttons">
                        <button onClick={makeOwner}>Confirm</button>
                        <button onClick={()=> setTarget(null)}>Cancel</button>
                        </div>
                    </div>
                )}
                <div className="single-setting">
                    {details.role != "owner" && <button onClick={()=> setLeaveConfirm(true)}>Leave Channel</button>}
                    {details.role == "owner" && <button onClick={()=> setDelConfirm(true)}>Delete Channel</button>}
                    {details.role == "owner" && delConfirm && (
                    <div className="confirm-overlay">
                        <p>Delete #{details.name}? This cannot be undone</p>
                        <div className="buttons">
                        <button onClick={deleteChannel} className="confirm-button-red">Yes</button>
                        <button onClick={()=> setDelConfirm(false)}>Cancel</button>
                        </div>
                    </div>)}
                    {leaveConfirm && (<div className="confirm-overlay">
                        <p>Are you sure you want to leave group?</p>
                        <div className="buttons">
                            <button onClick={leave} className="confirm-button-red">Yes</button>
                            <button onClick={()=> setLeaveConfirm(false)}>Cancel</button>
                        </div>
                    </div>)
                    }
                </div>
            </div>
        </div>    
    )
}