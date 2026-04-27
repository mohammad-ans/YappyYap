import "./ChatHeader.css"
import useAxios from "../../hooks/useAxios"
import { useEffect, useState, useCallback } from "react"
import useChatAuth from "../../hooks/useChatAuth";
import { useNavigate } from "react-router-dom";
export default function ChatHeader(props) {
    const [online, setOnline] = useState(0);
    const axios = useAxios();
    const {setError, setTrigger} = useChatAuth();
    const [displayname, setDisplay] = useState("")
    const navigate = useNavigate();
    const getOnline = useCallback(async ()=> {
        try{
            let response;
            if (props.realm == "dms"){
                response = await axios.get(`http://localhost:8005/${props.user}`)
            }else{
                let initialPath;
                if (props.realm == "voice-realm") {
                    initialPath = "3/voice";
                }
                else if (props.realm == "global-realm") {
                    initialPath = "2/global"
                }
                else 
                    initialPath = `4/${props.realm}`
    
                response = await axios.get(`http://localhost:800${initialPath}/livecount`);
            }
            if (response.data.msg === "Success") {
                setOnline(response.data.total)
            }
        }
        catch(e) {
            if (e.response && e.response.data) {
                setError(err => e.response.data.detail[0].msg);
                setTrigger(t => !t);
                navigate("/signin");
            }
        }
    })
    useEffect(()=>{
        let theme = localStorage.getItem("theme");
        if(theme)
            document.documentElement.setAttribute("data-theme", theme);
        const onlineInterval = setInterval(getOnline, 4000);
        return ()=> clearInterval(onlineInterval);
    }, [])
    useEffect(()=>{
        if(props.realm == "dms") {
            setDisplay(`Personal Msg: ${props.user}`)
        }
        else {
            setDisplay(props.realm.toUpperCase())
        }
    }, [props.realm, props.user])
    function changeTheme(e) {
        let temp = e.target.value;
        localStorage.setItem("theme", temp);
        document.documentElement.setAttribute("data-theme", temp);
        props.setTheme(pre => temp);
    }
    function navBarSimulator(){
        const element = document.querySelector(".chat-area");
        // if (props.navOpen){
        //     element.classList.add("nav-close-styles");
        //     element.classList.remove("nav-open-styles");
        // }
        element.classList.remove("nav-close-styles");
        element.classList.add("nav-open-styles");
        props.setNavopen(n => true);
    }
    return(
            <div className="chat-header">
                <div className="chat-menu-bar" onClick={navBarSimulator}>≡</div>
                <div className="active-realm">

                    <h2>{displayname}
                        </h2>
                </div>
                <div className="chat-theme">
                <select className="select-theme-design" value = {props.theme} onChange={changeTheme}>
                    <option value="blue">Blue</option>
                    <option value="green">Green</option>
                    <option value="beige">Beige</option>
                </select>
                {/* <div className="setting">
                    <input type="color"/>
                </div> */}
                </div>
                        <div className="online-count">
                                <div className="online-count-dot">
                                </div>
                                <span>{online}</span>
                        </div>
            </div>
    )
}