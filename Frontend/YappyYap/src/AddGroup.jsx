import {useState} from "react"
import useAxios from "../hooks/useAxios";
import "./AddGroup.css"
export default function AddGroup(props){
    const [name, setName] = useState("");
    const [grpType, setGrpType] = useState("text");
    const [inviteType, setInvite] = useState("all");
    const [anonymity, setAnonymity] = useState(true);
    const [guestsAllowed, setGuests] = useState(true);
    const [liveCount, setLiveCount] = useState(true);
    const [grpSize, setSize] = useState("");
    const [maxDuration, setMaxDuration] = useState("");
    const [minDuration, setMinDuration] = useState("");
    const axios = useAxios()
    async function addGroup(e) {
        e.preventDefault();
        try{
            const response = await axios.post("http://localhost:8004/addgroup", {
                name : name,
                grpType : grpType
            })
        }
        catch{}
    }
    function removeGroupArea() {
        props.setAddArea(false);
    }
    return(
        <div className="add-groupoverlay">
                <form onSubmit={addGroup} className="group-add">
                <p className="cancel-cross" onClick={removeGroupArea}>X</p>
                <h2>Add your Group</h2>
                <input type="text" placeholder="Enter a unique Group Name" value={name} onChange={e => setName(e.target.value)} required/>
                <input type="number" value={grpSize} min={1} max={100} placeholder="Maximum size of Group" onChange={e => setSize(e.target.value)} required/>
                <input type="number" value={minDuration} min={10} max={250} placeholder="Minimum Duration of message(10, 250)" onChange={e => setMinDuration(e.target.value)} required/>
                <input type="number" value={maxDuration} min={minDuration ? Number(minDuration) + 10 : 50} max={300} placeholder="Maximum duration of message(minDuration + 10, 240)" onChange={e => setMaxDuration(e.target.value)} required/>
                <select value={grpType} onChange={e => setGrpType(e.target.value)}>
                    <option value="text">Text Messages</option>
                    <option value="voice">Voice Messages</option>
                </select>
                <select value={inviteType} onChange={e => setInvite(e.target.value)}>
                    <option value="all">Anyone can search and join</option>
                    <option value="invite">Join only by invitation(admin)</option>
                    <option value="invite-any">Join only by invitation(members)</option>
                </select>
                <select value={anonymity} onChange={e => setAnonymity(e.target.value)}>
                    <option value={true}>Anonymity feature allowed</option>
                    <option value={false}>Anonymity feature disabled</option>
                </select>
                <select value={guestsAllowed} onChange={e => setGuests(e.target.value)}>
                    <option value={true}>Guests can join</option>
                    <option value={false}>Only permanent users can join</option>
                </select>
                <select value={liveCount} onChange={e => setLiveCount(e.target.value)}>
                    <option value={true}>Online Count enabled</option>
                    <option value={false}>Online Count disabled</option>
                </select>
                <button type="submit">Add Group</button>
                </form>
            
        </div>
    )
}