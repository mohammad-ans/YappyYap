import { useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import "./HomeComp.css"
import useAxios from "../../hooks/useAxios";
import useChatAuth from "../../hooks/useChatAuth";
import useHomeComps from "../../hooks/useHomeComps";
import Delete from "./../assets/Delete"
import useAboutComps from "../../hooks/useAboutComps";
export default function AboutComp() {
    const [content, setContent] = useState("");
    const {setError, setTrigger} = useChatAuth()
    const axios = useAxios()
    const {contents, loading, setCompsCheck} = useAboutComps()
    async function send() {
        try{
            const response = await axios.post("https://dashboard.yappyyap.xyz/aboutcomps", {
                content : content
            });
            setCompsCheck(c => !c);
            setError(response.data.msg);
            setTrigger(t => !t);
        }
        catch(e){
            setError("An error occured while sendng data to backend.");
            setTrigger(t => !t);
        }
    }
    async function deleteComp(e) {
        const data = e.currentTarget.dataset.key;
        try{
            const response = await axios.post("https://dashboard.yappyyap.xyz/delete/aboutcomps", {
                content : data
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
                Fill the contents to add a box on the about page.
            </h1>
            <div className="boxmain-add">
                <textarea placeholder="Content" value={content} onChange={e => setContent(e.target.value)} className="content"/>
                <button onClick={send} className="sign-button">Add</button>
            </div>
            <div className="active-boxes">
                {loading ? (<div className="error-msg">Loading...</div>) :
                (<>
                    {contents.map((content, index) => {
                        return (
                            <div className="active-box" key={content}>
                                <div><h2>{index + 1}.</h2><p>{content}</p></div>
                                <button data-key={content} className="delete-button-svg" onClick={deleteComp}><Delete/></button>
                            </div>
                        )
                    })}
                </>)
                }
            </div>
        </section>
    );
}