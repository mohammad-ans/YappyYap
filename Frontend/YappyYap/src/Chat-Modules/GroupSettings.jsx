import {useEffect, useState} from "react"
import useAxios from "../../hooks/useAxios"
import useChatAuth from "../../hooks/useChatAuth"

export default function GroupSettings(props) {
    const [members, setMembers] = useState([])
    const [details, setDetails] = useState(null)
    const [description, setDescription] = useState("")
    const [status, setStatus] = useState("")
    const [delConfirm, setDelConfirm] = useState(false)
    const {username} = useChatAuth()
    const axios = useAxios()
    const priviliged = details.role && (details.role == "admin" || details.role == "owner")
    async function load() {
        try{
            const members = axios.get(`http://localhost:8004/realms/${props.realm}/groups/${props.group}/members`)
            const details = axios.get(`http://localhost:8004/realms/${props.realm}/groups/${props.group}/details`)
            setDetails(details.data)
            setDescription((await details).data.description || "")
            setMembers(members.data)
        }
        catch(err) {
            if(err.response && err.response.data)
                setStatus(err.response.data.detail[0].msg)
            setStatus("Could not load channel settings")
        }
    }
    useEffect(()=> {
        load()
    }, [props.group])

    return(
        <div className="grpsettings-overlay">
            <div className="grp-settings">
                <p className="cancel-cross">X</p>
                <h2>{details.name}</h2>
                <p className="mem-role">You: {details.role || "viewer"}</p>
                {status && <p className="group-settings-status">{status}</p>}
                <div className="single-setting">
                    <h3>Description</h3>
                    <textarea rows={2} maxLength={250} value={description} disabled={!priviliged} onChange={e => setDescription(e.target.value)}></textarea>
                    {priviliged && <button>Save</button>}
                </div>
                <div className="single-setting">
                    <h3>Who can Join</h3>
                    {priviliged ? (<select>
                        <option value="all">Any realm member can join</option>
                        <option value="invite">Only invited people can join</option>
                    </select>)
                        : (<p>{details.inviteType == "all" ? "Anyone in realm": "Invite only"}</p>)}
                </div>
                <div className="single-setting">
                    <h3>Members ({members.length}/{details.maxGrpSize})</h3>
                    <ul className="group-members-list">
                        {members.map(mem => <li key={mem.username} className="group-member">
                            <span className="group-member-name">{mem.username} {mem.username == username && "(you)"}</span>
                            <span className={`group-member-role role-${mem.role}`}>{mem.role}</span>
                            {details.owner == username && mem.role !== "owner" && (
                                <span className="group-member-settings">
                                    {mem.role == "member"? <button>Make Admin</button>: <button>Remove Admin</button>}
                                    <button>Make Owner</button>
                                    <button>Remove</button>
                                </span>
                            )}
                            {priviliged && details.owner != username && mem.role == "member" && <span className="group-member-settings">
                                    <button>Remove</button>
                                </span>}
                            </li>)}
                    </ul>
                </div>
                <div className="single-setting">
                    {details.role != "owner" && <button>Leave Channel</button>}
                    {details.role == "owner" && <button onClick={()=> setDelConfirm(true)}>Delete Channel</button>}
                    {details.role == "owner" && delConfirm && (<>
                        <p>Delete #{details.name}? This cannot be undone</p>
                        <button>Yes</button>
                        <button onClick={()=> setDelConfirm(false)}>Cancel</button>
                    </>)}
                </div>
            </div>
        </div>    
    )
}