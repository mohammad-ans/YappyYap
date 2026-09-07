
import { useState } from "react"
import useAxios from "../hooks/useAxios"
import useChatAuth from "../hooks/useChatAuth"
import { useNavigate } from "react-router-dom"

export default function AllRealmsPage() {
    const [loading, setLoading] = useState(true)
    const {setError, setTrigger} = useChatAuth()
    const [realms, setRealms] = useState([])
    const [openRealms, setOpenRealms] = useState([])
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
            if(err.response && err.response.data) {
                setError(err.response.data.detail[0].msg)
                setTrigger(pre => !pre)
            }
        }
        finally{
            setLoading(false)
        }
    }
    useEffect(()=> {
        loadrealms()
    }, [])

    return (
        <div className="realms-page">
            <div className="realms-page-header">
                <h2>Your Realms</h2>
                <button>New Realm</button>
            </div>
            <ul className="realms-list">
                <li className="realm-card">
                    <h3>Global</h3>
                    <p>The public global realm with global voice and text chat channels.</p>
                </li>
                {loading && <li className="realm-card realms-loading">Loading...</li>}
                {realms.map(realm => (
                    <li className="realm-card" key={realm.id} onClick={()=> navigate(`/chat/realms/${realm.id}`)}>
                        <h3>{realm.name}</h3>
                        <div className="realm-details">
                            <span>{realm.members} members</span>
                            <span>{realm.groups} channels</span>
                            <span className="realm-role">{realm.role}</span>
                        </div>
                    </li>
                ))}
                {!loading && realms.length == 0 && (
                    <li className="realm-card realms-empty">
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
                                <button>Join</button>
                            </li>
                        ))}
                    </ul>
                    </>
                )}
        </div>
    )
}