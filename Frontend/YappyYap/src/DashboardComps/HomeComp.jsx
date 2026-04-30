import { useEffect, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import "./HomeComp.css"
import useAxios from "../../hooks/useAxios";
import useChatAuth from "../../hooks/useChatAuth";
import useHomeComps from "../../hooks/useHomeComps";
import Delete from "./../assets/Delete"
export default function HomeComp() {
    const [heading, setHeading] = useState("");
    const [content, setContent] = useState("");
    const {setError, setTrigger} = useChatAuth()    
    const [file, setFile] = useState("No file choosen");
    const file_ref = useRef();
    const axios = useAxios()
    const {headings, contents, urls, loading, setCompsCheck} = useHomeComps();
    async function send() {
        try{
            const payload = new FormData();
            payload.append("file", file_ref.current.files[0]);
            payload.append("heading", heading);
            payload.append("content", content);
            const response = await axios.post("https://dashboard.yappyyap.xyz/homecomps", payload, {
                headers : {
                    "Content-Type" : "multipart/formd-data"
                }
            });
            setError(response.data.msg);
            setTrigger(t => !t);
            setCompsCheck(c => !c);
        }
        catch(e){
            setError("An error occured while sendng data to backend.");
            setTrigger(t => !t);
        }
    }
    async function deleteComp(e) {
        const data = e.currentTarget.dataset.key;
        try{
            const response = await axios.post("https://dashboard.yappyyap.xyz/delete/homecomps", {
                heading : data
            });
            setError(response.data.msg)
            setTrigger(t => !t);
            setCompsCheck(t => !t);
        }
        catch(e){
            setError(e.message)
            setTrigger(t => !t);
        }
    }
    return(
        <section className="dashboard-section">
            <h1>
                Fill the contents to add a box on the home page.
            </h1>
            <div className="boxmain-add">
                <textarea placeholder="Heading" value={heading} onChange={e => setHeading(e.target.value)} className="heading"/>
                <textarea placeholder="Content" value={content} onChange={e => setContent(e.target.value)} className="content"/>
                <label htmlFor="file" className="sign-button" id="file-chose">{file}</label>
                <input type="file" ref={file_ref} onChange={(e)=> setFile(e.target.files[0].name)} id="file"/>
                <button onClick={send} className="sign-button">Add</button>
            </div>
            <div className="active-boxes">
                {loading ? (<div className="error-msg">Loading...</div>) :
                (<>
                    {headings.map((heading, index) => {
                        return (
                            <div className="active-box" key={heading}>
                                <img src={urls[index]} alt="img" />
                                <div><h2>{heading}</h2><p>{contents[index]}</p></div>
                                <button data-key={heading} className="delete-button-svg" onClick={deleteComp}><Delete/></button>
                            </div>
                        )
                    })}
                </>)
                }
            </div>
        </section>
    );
}