import { useNavigate, useParams } from "react-router-dom";
import useAxios from "../hooks/useAxios";
import useChatAuth from "../hooks/useChatAuth";
import { useEffect, useState } from "react";

export default function Invite() {
    const {token} = useParams()
    const axios = useAxios()
    const navigate = useNavigate()
    const {logged, loading} = useChatAuth()
    const [preview, setPreview] = useState(null)
    const [error, setError] = useState("")
    const [joining, setJoining] = useState(false)
    useEffect(() => {
        if(loading)
            return
        if(!logged) {
            navigate(`/signin?next=/invite/${token}`)
            return
        }
        async function loadPreview() {
            try{
                const res = await axios.get(`http://localhost:8004/invites/${token}/preview`)
                setPreview(res.data)
            }
            catch(err) {
                if(err.response && err.response.data)
                    setError(err.response.data.detail[0].msg)
                setError("Invite link not valid")
            }
        }
        loadPreview(false)
    }, [token, loading, logged])
    async function joinNow() {
        setJoining(true)
        try{
            const res = await axios.post(`http://localhost:8004/invites/${token}/redeem`)
            if(preview.scope == "channel" && res.data.grpId)
                navigate(`/chat/realms/${res.data.realm_id}/c/${res.data.grpId}`)
            else
                navigate(`/chat/realms/${res.data.realm_id}`)
        }
        catch(err) {
            if(err.response && err.response.data)
                setError(response.data.detail[0].msg)
            setError("Joining failed...")
        }
    }
    if(error)
        return(
            <div className="accept-invite-page">
                <div className="accept-invite-area">
                    <p className="accept-invite-error">{error}</p>
                    <button onClick={() => navigate("/chat/realms")}>Back to realms</button>
                </div>
            </div>
    )
    return(
        <div className="accept-invite-page">
            <div className="accept-invite-area">
                <h2>{preview.scope == "channel" ? `#${preview.name}`: preview.realm_name}</h2>
                {preview.scope == "channel" && <p>in {preview.realm_name}</p>}
                <p>Invited by ${preview.invitedBy}</p>
                <button onClick={joinNow} disabled={joining}>{joining ? "Joining..." : `Join ${preview.scope == "channel" ? "channel" : "realm"}`}</button>
            </div>
        </div>
    )
}
