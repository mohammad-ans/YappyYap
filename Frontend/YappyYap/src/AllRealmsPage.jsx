
import { useState, useEffect } from "react"
import useAxios from "../hooks/useAxios"
import useChatAuth from "../hooks/useChatAuth"
import { useNavigate } from "react-router-dom"
import "./AllRealms.css"

export default function AllRealmsPage(props) {
    const [loading, setLoading] = useState(true)
    const {setError, setTrigger} = useChatAuth()
    const [realms, setRealms] = useState([])
    const [joinId, setJoinId] = useState()
    const [submitting, setSubmitting] = useState(false)
    const [openRealms, setOpenRealms] = useState([])
    const [name, setName] = useState("")
    const [description, setDescription] = useState("")
    const [inviteType, setInviteType] = useState("")
    const [creating, setCreating] = useState(false)
    const axios = useAxios()
    const navigate = useNavigate()
    async function loadrealms() {
        setLoading(true)
        try{
            const joined = await axios.get(`http://localhost:8004/realms/mine`)
            const all = await axios.get(`http://localhost:8004/realms`)
            setRealms(joined.data)
            const joinedIds = new Set(joined.data.map(realm => realm.id))
            setOpenRealms(all.data.filter(realm => !joinedIds.has(realm.id)))
        }
        catch(err) {
            if(err.response && err.response.data)
                setError(err.response.data.detail[0].msg)
            else
                setError(pre => "An error occured while loading realms")
            setTrigger(pre => !pre)
        }
        finally{
            setLoading(false)
        }
    }
    useEffect(()=> {
        props.setCurrRealm("");
        loadrealms()
    }, [])
    async function joinOpenRealms(id) {
        setJoinId(id)        
        try{
            await axios.post(`http://localhost:8004/realms/${id}/join`)
            navigate(`/chat/realms/${id}`)
        }
        catch(err) {
            if(err.response && err.response.data)
                setError(err.response.data.detail[0].msg)
            else
                setError("Error occured while joining realm")
            setTrigger(pre => !pre)
        }
        finally{
            setJoinId(null)
        }
    }
    async function createRealm(e) {
        e.preventDefault()
        if (submitting)
            return
        setSubmitting(true)
        try{
            const res = await axios.post("http://localhost:8004/realm", {
                name: name.trim(),
                description: description.trim(),
                inviteType: inviteType
            })
            setCreating(false)
            setName("")
            setDescription("")
            setInviteType("invite")
            navigate(`/chat/realms/${res.data.id}`)
        }
        catch(err) {
            if(err.response && err.response.data)
                setError(err.response.data.detail[0].msg)
            else
                setError("An error occured while creating the realm")
            setTrigger(pre => !pre)
        }
        finally{
            setSubmitting(false)
        }
    }
    function navigateRealm(realmId, realm) {
        props.setCurrRealm(realm);
        navigate(`chats/realms/${realmId}`);
    }

    return (
        <div className="realms-page">
            <div className="realms-page-header">
                <h2>Your Realms</h2>
                <button onClick={() => setCreating(true)}>New Realm</button>
            </div>
            <ul className="realms-list">
                <li className="realm-card" onClick={()=> navigateRealm("global", "global")}>
                    <div><h3>Global :</h3>
                    <p>The public global realm with global voice and text chat channels.</p>
                    </div>
                </li>
                {loading && <li className="realm-card realms-loading">Loading...</li>}
                {!loading && realms.map(realm => (
                    <li className="realm-card" key={realm.id} onClick={()=> navigateRealm(realm.id, realm.name)}>
                        <h3>{realm.name} :</h3>
                        <div className="realm-details">
                            <span>{realm.members} members</span>
                            <span>{realm.groups} channels</span>
                            <span className="realm-role">Role: {realm.role}</span>
                        </div>
                    </li>
                ))}
                {!loading && realms.length == 0 && (
                    <li className="realm-card realms-empty" style={{cursor: "text"}}>
                        You are not in any realms yet. Create, join or ask someone to invite you.
                    </li>
                )}
            </ul>
            {openRealms.length > 0 && (
                <>
                <h3 className="new-realms-heading">Discover open realms</h3>
                <ul className="realms-list">
                    {openRealms.map(realm => (
                        <li className="realm-card">
                            <h3>{realm.name}</h3>
                            <button onClick={() => joinOpenRealms(realm.id)} disabled={joinId == realm.id}> {joinId == realm.id ? "Joining..." : "Join"} </button>
                        </li>
                    ))}
                </ul>
                </>
            )}
            {(creating && <div className="realms-page-overlay">
                    <form className="realms-create-form" onSubmit={createRealm}>
                        <p className="cancel-cross" onClick={() => setCreating(false)}>X</p>
                        <h2>Create a Realm</h2>
                        <input type="text" placeholder="Realm name" value={name} minLength={2} maxLength={40} required onChange={e => setName(e.target.value)}/>
                        <textarea placeholder="Realm Description" value={description} maxLength={250} rows={2} onChange={e => setDescription(e.target.value)}/>
                        <select value={inviteType} onChange={e => setInviteType(e.target.value)}>
                            <option value="invite">Invited people can join only</option>
                            <option value="all">Everyone can join</option>
                        </select>
                        <button type="submit" disabled={submitting}>{submitting ? "Creating...": "Create Realm"}</button>
                    </form>
                </div>
            )}
        </div>
    )
}