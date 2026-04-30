import {useState, useRef, useEffect} from "react"
import useAxios from "../../hooks/useAxios";
import Play from "../assets/Play"
import {gsap} from "gsap/gsap-core"
import Pause from "../assets/Pause"
export default function TypeArea(props) {
   const recorderFreq = useRef()
   const recorderInterval = useRef()
   const barInterval = useRef()
    const [pauseState, setPause] = useState(false)
    const [timer, setTimer] = useState(0)
    const [start, setStart] = useState(false)
    const pause = useRef(false)
    const spaceFullCheck = useRef(false)
    const [yapDuration, setyapDuration] = useState(props.realm["minDuration"])
    const anonymity = useRef(false)
    const axios = useAxios()
    const recorder = useRef(null);
    useEffect(()=>{
        recorderFreq.current = document.querySelector(".recorder-freq")
        return ()=>{
            if(recorderInterval.current)
                clearInterval(recorderInterval.current)
            if(barInterval.current)
                clearInterval(barInterval.current)
        }
    },[])
    async function startRecord() {
        let data = []
            if (!start) {
                spaceFullCheck.current = false
                try{
                    const stream = await navigator.mediaDevices.getUserMedia({audio:{
                        noiseSuppression : false,
                        sampleRate : 16000,
                        channelCount : 1
                    }});
                    recorder.current = new MediaRecorder(stream)
                    recorder.current.start()
                    recorderInterval.current = setInterval(inputTimer, 1000);
                    barInterval.current = setInterval(barCreator, 600)
                    recorder.current.ondataavailable = (e)=>{
                        data.push(e.data)
                    }
                    recorder.current.onstop = async (e)=>{
                        clearInterval(recorderInterval.current)
                        clearInterval(barInterval.current)
                        setTimer(0);
                        recorderFreq.current.innerHTML = ""
                        let blob;
                        let type;
                        if (MediaRecorder.isTypeSupported("audio/webm")) {
                            type = "webm"
                            blob = new Blob(data, {
                                type: "audio/webm"
                            })
                        }
                        else{
                            type = "ogg"
                            blob = new Blob(data, {
                                type: "audio/ogg"
                            })
                        }
                        try{
                            if(props.websocket.current && props.websocket.current.readyState === WebSocket.OPEN){
                                let payloadDetails = {
                                    "expiry" : yapDuration
                                }
                                if (anonymity.current){
                                    payloadDetails["anonymity"] = true;
                                }
                                props.websocket.current.send(JSON.stringify(payloadDetails))
                                props.websocket.current.send(blob)
                            }
                            data = [];
                        }
                        catch (e) {
                            console.log(e)
                        }
                    }
                }
                catch(e){
                    console.log(e)
                }
            }
            else{
                if (recorder.current) {
                    setPause(false)
                    pause.current = false;
                    recorder.current.stop();
                }
            }
            setStart(n => !n);
        }
    async function pauseHandler() {
        if (recorder.current) {
            if (pause.current) {
                recorder.current.resume();
            }
            else{
                recorder.current.pause();
            }
            setPause(n => !n);
            pause.current = !pause.current
        }
    }
            
    function inputTimer() {
        if (!pause.current) {
            setTimer(t => {
                if (t === 19) {
                    spaceFullCheck.current = true;
                }
                return t + 1
            })
        }
        if (spaceFullCheck.current) {
                setPause(false)
                setStart(false)
                pause.current = false;
                recorder.current.stop()
        }
    }
    function barCreator(){
        if (!pause.current){
            // 2rem = 32px so 32px every 7s (1s for uncertainity) plus there is gap too 13.5px 7s = 10 total for 7s = 32 + 13.5=45.5px ~ 50 so ...... 7 is 7 and 7 * 7 is 49 so space will end at approx 45 - 50
            const element = document.createElement("div")
            element.style.height = `${Math.random() * 12 + 3}px `
            element.classList.add("bar")
            recorderFreq.current.append(element)
        }
    }
    function anonymityHandler() {
        let xTravel;
        const element = document.querySelector(".anonymity-off");
        if(anonymity.current) {
            xTravel = 0;
            element.classList.remove("anonymity-on");
        }
        else{
            xTravel = 27;
            element.classList.add("anonymity-on");
        }
        gsap.to(".anonymity-button-circle",{
            x : xTravel,
            duration : 0.2
        })
        anonymity.current = !anonymity.current;
    }
    return (
        <div className="type-area-overlay">
            <div className="recorder type-area">
                <div className="recorder-count">
                    <span>{`0:${String(timer).padStart(2, '0')}`}</span>
                </div>
                <div className="recorder-freq">
                    <div className="bar"></div>
                </div>
                <div className="chat-yap-duration">
                    {props.realm["anonymity"] && <div className="anonymity-button-area">
                    <span className="input-label">Anonymity: </span>
                    <button className="anonymity-off" onClick={anonymityHandler}><span className="anonymity-button-circle"></span></button>
                </div>}
                <div>
                    <span className="input-label">Duration: </span>
                    <input type="range" min={props.realm["minDuration"]} max={props.realm["maxDuration"]} step={5} value={yapDuration} onChange={(e) => setyapDuration(e.target.value)} />
                    <span id="chat-yap-duration">{`${yapDuration}s`}</span>
                </div>
                </div>

                <div className="recorder-buttons">
                    <button className="start-record send-button" onClick={startRecord}>{!start ? (<svg className="chat-sendsvg" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" version="1.1" viewBox="0 0 256 256" xmlSpace="preserve">
                        <g stroke="none" strokeWidth="0" strokeDasharray="none" strokeLinecap="butt" strokeLinejoin="miter" strokeMiterlimit="10" fill="none" fillRule="nonzero" opacity="1" transform="translate(1.4065934065934016 1.4065934065934016) scale(2.81 2.81)">
                            <path d="M 45 70.968 c -16.013 0 -29.042 -13.028 -29.042 -29.042 c 0 -1.712 1.388 -3.099 3.099 -3.099 c 1.712 0 3.099 1.388 3.099 3.099 C 22.157 54.522 32.404 64.77 45 64.77 c 12.595 0 22.843 -10.248 22.843 -22.843 c 0 -1.712 1.387 -3.099 3.099 -3.099 s 3.099 1.388 3.099 3.099 C 74.042 57.94 61.013 70.968 45 70.968 z" stroke="none" strokeWidth="1" strokeDasharray="none" strokeLinejoin="miter" strokeMiterlimit="10" fill="white" fillRule="nonzero" opacity="1" transform=" matrix(1 0 0 1 0 0) " strokeLinecap="round" />
                            <path d="M 45 60.738 L 45 60.738 c -10.285 0 -18.7 -8.415 -18.7 -18.7 V 18.7 C 26.3 8.415 34.715 0 45 0 h 0 c 10.285 0 18.7 8.415 18.7 18.7 v 23.337 C 63.7 52.322 55.285 60.738 45 60.738 z" stroke="none" strokeWidth="1" strokeDasharray="none" strokeLinejoin="miter" strokeMiterlimit="10" fill="white" fillRule="nonzero" opacity="1" transform=" matrix(1 0 0 1 0 0) " strokeLinecap="round" />
                            <path d="M 45 89.213 c -1.712 0 -3.099 -1.387 -3.099 -3.099 V 68.655 c 0 -1.712 1.388 -3.099 3.099 -3.099 c 1.712 0 3.099 1.387 3.099 3.099 v 17.459 C 48.099 87.826 46.712 89.213 45 89.213 z" stroke="none" strokeWidth="1" strokeDasharray="none" strokeLinejoin="miter" strokeMiterlimit="10" fill="white" fillRule="nonzero" opacity="1" transform=" matrix(1 0 0 1 0 0) " strokeLinecap="round" />
                            <path d="M 55.451 90 H 34.549 c -1.712 0 -3.099 -1.387 -3.099 -3.099 s 1.388 -3.099 3.099 -3.099 h 20.901 c 1.712 0 3.099 1.387 3.099 3.099 S 57.163 90 55.451 90 z" stroke="none" strokeWidth="1" strokeDasharray="none" strokeLinejoin="miter" strokeMiterlimit="10" fill="white" fillRule="nonzero" opacity="1" transform=" matrix(1 0 0 1 0 0) " strokeLinecap="round" /></g></svg>) :
                        (
                            <svg className="chat-sendsvg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M2 21L23 12L2 3L6 12L2 21Z" />
                                <path d="M6 12L23 12" />
                            </svg>)}</button>
                    <button className="pause-button" onClick={pauseHandler} >{start ? (pauseState ? (<Play />) : (<Pause />)) : ""}</button>
                </div>
            </div>
        </div>
    )
}