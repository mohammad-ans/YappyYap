import { useNavigate, useParams } from "react-router-dom";
import useAxios from "../hooks/useAxios";
import useChatAuth from "../hooks/useChatAuth";
import { useEffect, useState } from "react";
import { GROUPS_URL } from "./config";

export default function Invite() {
    const {token} = useParams()
    const axios = useAxios()
    const navigate = useNavigate()
    const {logged, loading} = useChatAuth()
    const [preview, setPreview] = useState(null)
    const [error, setError] = useState("")
    const [joining, setJoining] = useState(false)
    const[loadingSc, setLoading] = useState(true)

    useEffect(() => {
        if(loading)
            return
        if(!logged) {
            navigate(`/signin?next=/invite/${token}`)
            return
        }
        async function loadPreview() {
            try{
                const res = await axios.get(`${GROUPS_URL}/invites/${token}/preview`)
                setPreview(res.data)
            }
            catch(err) {
                if(err.response && err.response.data)
                    setError(err.response.data.detail[0].msg)
                else
                    setError("Invite link not valid")
            }
            finally{
                setLoading(false)
            }
        }
        loadPreview()
    }, [token, loading, logged])

    async function joinNow() {
        setJoining(true)
        try{
            const res = await axios.post(`${GROUPS_URL}/invites/${token}/redeem`)
            if(preview.scope == "group" && res.data.grpId)
                navigate(`/chat/realms/${res.data.realm_id}/c/${res.data.grpId}`)
            else
                navigate(`/chat/realms/${res.data.realm_id}`)
        }
        catch(err) {
            if(err.response && err.response.data)
                setError(err.response.data.detail[0].msg)
            else
                setError("Joining failed...")
        }
        finally{
            setJoining(false)
        }
    }

    if(loadingSc || loading)
        return(
            <div className="accept-invite-page">
                <p>Loading invite...</p>
            </div>
        )

    if(error || !preview)
        return(
            <div className="accept-invite-page">
                <div className="accept-invite-area">
                    <p className="accept-invite-error">{error || "Invite link not valid"}</p>
                    <button onClick={() => navigate("/chat/realms")}>Back to realms</button>
                </div>
            </div>
        )

    if(!preview.valid_user)
        return(
            <div className="accept-invite-page">
                <div className="accept-invite-area">
                    <p className="accept-invite-error">This invite was sent to someone else, only they can use it</p>
                    <button onClick={() => navigate("/chat/realms")}>Back to realms</button>
                </div>
            </div>
        )
    
    if(!preview.valid)
        return(
            <div className="accept-invite-page">
                <div className="accept-invite-area">
                    <p className="accept-invite-error">{preview.reason}</p>
                    <button onClick={() => navigate("/chat/realms")}>Back to realms</button>
                </div>
            </div>
        )

    return(
        <div className="accept-invite-page">
            <div className="accept-invite-area">
                <h2>{preview.scope == "group" ? `#${preview.name}`: preview.realm_name}</h2>
                {preview.scope == "group" && <p>in {preview.realm_name}</p>}
                <p>Invited by {preview.invitedBy}</p>
                <button onClick={joinNow} disabled={joining}>{joining ? "Joining..." : `Join ${preview.scope == "group" ? "channel" : "realm"}`}</button>
            </div>
        </div>
    )
}
