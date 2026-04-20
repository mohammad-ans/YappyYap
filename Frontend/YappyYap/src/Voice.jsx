import { useEffect, useRef, useState } from "react"
import default_img from "./assets/default_img.png"
import Play from "./assets/Play"
import Pause from "./assets/Pause"
import {unzipSync} from "fflate";
import "./Voice.css"
import { gsap } from "gsap/gsap-core";
import { useGSAP } from "@gsap/react";
import useAxios from "../hooks/useAxios";
import TypeArea from "./Voice/TypeArea"
import useChatAuth from "../hooks/useChatAuth";
import { useNavigate } from "react-router-dom";
export default function Voice(props) {
    const duration = useRef(0);
    const moveBarAnimation = useRef(new Map())
    const moveBarMover = useRef(new Map())
    const barMover = useRef()
    const dotMover = useRef()
    const websocket = useRef()
    const msgRemoverInterval = useRef();
    const {setError, setTrigger} = useChatAuth();
    const navigate = useNavigate();
    useGSAP(() => {
        gsap.ticker.lagSmoothing(0)
        barMover.current = (cls, d, id) => {
            let animation = gsap.to(`.${cls}`, {
                width: "100%",
                stagger: d,
                ease: "linear",
                paused: true
            })
            moveBarAnimation.current.set(id, animation)
        }
        dotMover.current = (cls, d, id) => {
            let animation = gsap.to(`.${cls}`, {
                transform: "translate3d(8.8rem, 0, 0)",
                duration: d,
                ease: "linear",
                paused: true
            })
            moveBarMover.current.set(id, animation)
        }
    }, [])
    useEffect(() => {
        const element = document.querySelector(".voice-realm");
        element.classList.add("current-realm")
        props.setRealm("voice-realm")
        const axios = useAxios();
        async function getmsgs() {
            try{
                const response = await axios.get("http://localhost:8003/voice/getmsgs", {
                    responseType : "arraybuffer"
                })
                const zip = new Uint8Array(response.data)
                const files = unzipSync(zip)
                document.querySelector(".msgs").innerHTML = "";
                for (let filename in files){
                    const file = files[filename]
                    const buffer = file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength)
                    const vw = new DataView(buffer);
                    const timeSent = new Date(vw.getFloat64(0, false) * 1000).toLocaleTimeString([], {"hour" : "2-digit", "minute" : "2-digit"});
                    let expiry = new Date(vw.getFloat64(8, false) * 1000);
                    if (expiry - new Date() < 1500){
                        continue;
                    }
                    expiry = expiry.toString().replace(/[\s.:()+]+/g, "");
                    const msg = document.createElement("li")
                    msg.classList.add("chat-message-block", expiry);
                    const usernameLength = vw.getUint32(16, false) + 20;
                    const username = new TextDecoder("utf-8").decode(file.slice(20, usernameLength));
                    const blobBytes = file.slice(usernameLength);
                    const blob = new Blob([blobBytes], {type : "audio/webm"});
                    msg.innerHTML = `
                    <img src=${default_img} alt="user" class="chat-message-img" />
                    <span>
                    <span class="chat-message-header"><h3 class="username">${username}</h3><span class="timestamp">${timeSent}</span></span>
                    ${helperFunction()}
                    </span>`
                    document.querySelector(".msgs").append(msg);
                    msg.querySelector(".audio-play-button").addEventListener("click", play_pause_audio);
                    msg.querySelector(".audio-play").src = window.URL.createObjectURL(blob);
                }
            }
            catch(e){
                if(e.response && e.response.data){
                    setError(err => e.response.data.detail[0].msg);
                    setTrigger(t => !t);
                    if(websocket.current && websocket.current.readyState == WebSocket.OPEN)
                        websocket.current.close();
                    navigate("/signin");
                }

            }
        }
        const interval1 = setInterval(getmsgs, 20000)
        msgRemoverInterval.current = setInterval(removeMsg, 1000);
        let webreconInterval  = 2000;
        function connect() {
            // websocket.current = new WebSocket("wss://api.yappyyap.xyz/voice/ws")
            websocket.current = new WebSocket("ws://localhost:8003/voice/ws")
            websocket.current.binaryType = "arraybuffer"
            websocket.current.onopen = () => {
                getmsgs()
            }
            websocket.current.onclose = () => {
                if (websocket.current.readyState == 0)
                    reconnect();
            }
            websocket.current.onmessage = (e) => {
                try{
                        const msg = document.createElement("li");
                        const vw = new DataView(e.data);
                        const timeSent = new Date(vw.getFloat64(0, false) * 1000).toLocaleTimeString([], {"hour" : "2-digit", "minute" : "2-digit"});
                        let expiry = new Date(vw.getFloat64(8, false) * 1000).toString();
                        expiry = expiry.replace(/[\s:+().]+/g, "");
                        msg.classList.add("chat-message-block", expiry);
                        const usernameLength = vw.getUint32(16, false) + 20;
                        const unsigned8bit = new Uint8Array(e.data);
                        const username = new TextDecoder("utf-8").decode(unsigned8bit.slice(20, usernameLength));
                        const blobBytes = unsigned8bit.slice(usernameLength);
                        const blob = new Blob([blobBytes], {type : "audio/webm"});
                        msg.innerHTML = `
                            <img src=${default_img} alt="user" class="chat-message-img" />
                            <span>
                                <span class="chat-message-header"><h3 class="username">${username}</h3><span class="timestamp">${timeSent}</span></span>
                                ${helperFunction()}
                            </span>`
                        document.querySelector(".msgs").append(msg);
                        msg.querySelector(".audio-play-button").addEventListener("click", play_pause_audio);
                        msg.querySelector(".audio-play").src = window.URL.createObjectURL(blob);
                    }
                catch(e){
                    console.log(e);
                }
    
            }
            
        websocket.current.onerror = () => {
            if (websocket.current.OPEN) {
                websocket.current.close();
            }
            reconnect()
            console.warn("An error occured, websocket connection failed");
        }
        }
        connect();
    function reconnect() {
        setTimeout(connect, webreconInterval);
        webreconInterval += 1000;
    }
        return () => {
            clearInterval(msgRemoverInterval.current);
            clearInterval(interval1);
            element.classList.remove("current-realm")
            if(websocket.current && websocket.current.readyState == WebSocket.OPEN)
                websocket.current.close()
        }

    }, [])
    async function removeMsg() {
        let date = new Date();
        date = date.toString().replace(/[\s+:().]+/g, "")
        const elements = document.querySelectorAll(`.${date}`)
        if (elements.length > 0) {
            gsap.to(`.${date}`, {
                opacity : 0,
                duration : 2,
            })
            setTimeout(()=>{
                for(let element of elements) {
                    element.remove()
                }
            }, 2000)
        }
    }
    async function play_pause_audio(e) {
        // const element = 
        const children = e.currentTarget.parentNode.children;
        const id = children[0].parentNode.dataset.id
        const element = children[0];
        element.addEventListener("loadedmetadata", () => {
        })
        const movingDot = children[2].style.transform
        if (movingDot == "") {
            dotMover.current(`msg-bars-mover-${id}`, element.duration, id)
            barMover.current(`msg-bar-underlay-${id}`, element.duration / 30, id)
        }
        if (element.paused) {
            children[1].innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 96 96" xml:space="preserve">
                    <path d="M0 0 C0.66 -0.0103125 1.32 -0.020625 2 -0.03125 C5.13341854 0.8010643 6.07865886 1.84316082 8 4.5 C8.61584573 8.07768499 8.56010028 11.62720889 8.53125 15.25 C8.5350769 16.30026367 8.53890381 17.35052734 8.54284668 18.43261719 C8.54556696 20.65170247 8.53819777 22.87081974 8.52148438 25.08984375 C8.50007745 28.48770595 8.52128325 31.88345361 8.546875 35.28125 C8.54423175 37.43750467 8.53910682 39.59375802 8.53125 41.75 C8.53934692 42.76674805 8.54744385 43.78349609 8.55578613 44.83105469 C8.46226768 51.86077417 8.46226768 51.86077417 6.09179688 55.13867188 C3.83648136 56.60641689 2.66961743 57.04171277 0 57 C-0.99 57.01546875 -0.99 57.01546875 -2 57.03125 C-5.13341854 56.1989357 -6.07865886 55.15683918 -8 52.5 C-8.61584573 48.92231501 -8.56010028 45.37279111 -8.53125 41.75 C-8.5350769 40.69973633 -8.53890381 39.64947266 -8.54284668 38.56738281 C-8.54556696 36.34829753 -8.53819777 34.12918026 -8.52148438 31.91015625 C-8.50007745 28.51229405 -8.52128325 25.11654639 -8.546875 21.71875 C-8.54423175 19.56249533 -8.53910682 17.40624198 -8.53125 15.25 C-8.53934692 14.23325195 -8.54744385 13.21650391 -8.55578613 12.16894531 C-8.46226768 5.13922583 -8.46226768 5.13922583 -6.09179688 1.86132812 C-3.83648136 0.39358311 -2.66961743 -0.04171277 0 0 Z " fill="white" transform="translate(64,19.5)"/>
                    <path d="M0 0 C0.66 -0.0103125 1.32 -0.020625 2 -0.03125 C5.13341854 0.8010643 6.07865886 1.84316082 8 4.5 C8.61584573 8.07768499 8.56010028 11.62720889 8.53125 15.25 C8.5350769 16.30026367 8.53890381 17.35052734 8.54284668 18.43261719 C8.54556696 20.65170247 8.53819777 22.87081974 8.52148438 25.08984375 C8.50007745 28.48770595 8.52128325 31.88345361 8.546875 35.28125 C8.54423175 37.43750467 8.53910682 39.59375802 8.53125 41.75 C8.53934692 42.76674805 8.54744385 43.78349609 8.55578613 44.83105469 C8.46226768 51.86077417 8.46226768 51.86077417 6.09179688 55.13867188 C3.83648136 56.60641689 2.66961743 57.04171277 0 57 C-0.99 57.01546875 -0.99 57.01546875 -2 57.03125 C-5.13341854 56.1989357 -6.07865886 55.15683918 -8 52.5 C-8.61584573 48.92231501 -8.56010028 45.37279111 -8.53125 41.75 C-8.5350769 40.69973633 -8.53890381 39.64947266 -8.54284668 38.56738281 C-8.54556696 36.34829753 -8.53819777 34.12918026 -8.52148438 31.91015625 C-8.50007745 28.51229405 -8.52128325 25.11654639 -8.546875 21.71875 C-8.54423175 19.56249533 -8.53910682 17.40624198 -8.53125 15.25 C-8.53934692 14.23325195 -8.54744385 13.21650391 -8.55578613 12.16894531 C-8.46226768 5.13922583 -8.46226768 5.13922583 -6.09179688 1.86132812 C-3.83648136 0.39358311 -2.66961743 -0.04171277 0 0 Z " fill="white" transform="translate(32,19.5)"/>
                    </svg>`
            moveBarAnimation.current.get(id).play();
            moveBarMover.current.get(id).play();
            element.play()
        }
        else {
            children[1].innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 96 96" xmlSpace="preserve">
        <path d="M0 0 C4.70362174 0.50357681 7.48195529 2.58049538 11.3046875 5.2421875 C12.80074456 6.25588489 14.29817735 7.26755443 15.796875 8.27734375 C16.55838867 8.79312988 17.31990234 9.30891602 18.10449219 9.84033203 C20.38691677 11.3391018 22.70364272 12.73853322 25.0625 14.11328125 C25.7961377 14.54592285 26.52977539 14.97856445 27.28564453 15.42431641 C28.68691336 16.24478148 30.09656084 17.05114422 31.51513672 17.84130859 C34.68951593 19.73006827 36.25678193 20.92411698 37.6171875 24.41015625 C37.4296875 27.3671875 37.4296875 27.3671875 36.0234375 29.4140625 C32.47438901 32.08653877 28.75248051 34.35923651 24.9296875 36.6171875 C18.4163065 40.50490274 12.13888353 44.53109274 6.0078125 49.00390625 C2.92184948 50.63572609 0.87376598 50.70667524 -2.5703125 50.3671875 C-4.17082914 48.76667086 -3.69762722 47.07872628 -3.69970703 44.86328125 C-3.70285919 43.90558838 -3.70601135 42.94789551 -3.70925903 41.96118164 C-3.7072348 40.91953857 -3.70521057 39.87789551 -3.703125 38.8046875 C-3.70408173 37.74306396 -3.70503845 36.68144043 -3.70602417 35.58764648 C-3.70670614 33.33805278 -3.70485069 31.08845713 -3.70068359 28.83886719 C-3.6953356 25.38211679 -3.70062804 21.92549633 -3.70703125 18.46875 C-3.70637047 16.28906221 -3.70508932 14.1093745 -3.703125 11.9296875 C-3.70514923 10.88804443 -3.70717346 9.84640137 -3.70925903 8.77319336 C-3.70610687 7.81550049 -3.70295471 6.85780762 -3.69970703 5.87109375 C-3.69891144 5.02361572 -3.69811584 4.1761377 -3.69729614 3.30297852 C-3.50129542 0.31506261 -2.98834304 0.42690615 0 0 Z " fill="white" transform="translate(35.5703125,22.6328125)"/>
        </svg>`
            moveBarMover.current.get(id).pause()
            moveBarAnimation.current.get(id).pause()
            element.pause()
        }
        element.onended = () => {
            children[1].innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 96 96" xmlSpace="preserve">
        <path d="M0 0 C4.70362174 0.50357681 7.48195529 2.58049538 11.3046875 5.2421875 C12.80074456 6.25588489 14.29817735 7.26755443 15.796875 8.27734375 C16.55838867 8.79312988 17.31990234 9.30891602 18.10449219 9.84033203 C20.38691677 11.3391018 22.70364272 12.73853322 25.0625 14.11328125 C25.7961377 14.54592285 26.52977539 14.97856445 27.28564453 15.42431641 C28.68691336 16.24478148 30.09656084 17.05114422 31.51513672 17.84130859 C34.68951593 19.73006827 36.25678193 20.92411698 37.6171875 24.41015625 C37.4296875 27.3671875 37.4296875 27.3671875 36.0234375 29.4140625 C32.47438901 32.08653877 28.75248051 34.35923651 24.9296875 36.6171875 C18.4163065 40.50490274 12.13888353 44.53109274 6.0078125 49.00390625 C2.92184948 50.63572609 0.87376598 50.70667524 -2.5703125 50.3671875 C-4.17082914 48.76667086 -3.69762722 47.07872628 -3.69970703 44.86328125 C-3.70285919 43.90558838 -3.70601135 42.94789551 -3.70925903 41.96118164 C-3.7072348 40.91953857 -3.70521057 39.87789551 -3.703125 38.8046875 C-3.70408173 37.74306396 -3.70503845 36.68144043 -3.70602417 35.58764648 C-3.70670614 33.33805278 -3.70485069 31.08845713 -3.70068359 28.83886719 C-3.6953356 25.38211679 -3.70062804 21.92549633 -3.70703125 18.46875 C-3.70637047 16.28906221 -3.70508932 14.1093745 -3.703125 11.9296875 C-3.70514923 10.88804443 -3.70717346 9.84640137 -3.70925903 8.77319336 C-3.70610687 7.81550049 -3.70295471 6.85780762 -3.69970703 5.87109375 C-3.69891144 5.02361572 -3.69811584 4.1761377 -3.69729614 3.30297852 C-3.50129542 0.31506261 -2.98834304 0.42690615 0 0 Z " fill="white" transform="translate(35.5703125,22.6328125)"/>
        </svg>`
            // gsap.set(`.msg-bars-mover-${id}`, { x: 0 })
            // document.querySelectorAll(`.msg-bar-underlay-${id}`).forEach(bar => {
            //     bar.style.width = "0"
            // })
            const tempMoveBarAnimation = moveBarAnimation.current.get(id);
            const tempMoveBarMover = moveBarMover.current.get(id);
            tempMoveBarAnimation.restart();
            tempMoveBarAnimation.pause();
            tempMoveBarMover.restart();
            tempMoveBarMover.pause();
        }
    }
    return (
        <>
            <div className="voice">
                <ul className="msgs">
                </ul>
                <TypeArea websocket={websocket} />
            </div>
        </>
    )
    function helperFunction() {
        let arr = Array(30);
        for (let i = 0; i < 30; i++) {
            arr[i] = `${Math.random() * 12 + 3}px`
        }
        let id = crypto.randomUUID();
        const bars = arr.map((element, index) =>
            `<div class='bar' key=${index + 3} style=" height: ${element}; "><div class="msg-bar-underlay-${id} msg-bar-underlay"></div></div>`).join("")
        return `<div class='audio' data-id=${id}><audio class='audio-play'></audio><button class='audio-play-button' ><svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 96 96" xmlSpace="preserve">
        <path d="M0 0 C4.70362174 0.50357681 7.48195529 2.58049538 11.3046875 5.2421875 C12.80074456 6.25588489 14.29817735 7.26755443 15.796875 8.27734375 C16.55838867 8.79312988 17.31990234 9.30891602 18.10449219 9.84033203 C20.38691677 11.3391018 22.70364272 12.73853322 25.0625 14.11328125 C25.7961377 14.54592285 26.52977539 14.97856445 27.28564453 15.42431641 C28.68691336 16.24478148 30.09656084 17.05114422 31.51513672 17.84130859 C34.68951593 19.73006827 36.25678193 20.92411698 37.6171875 24.41015625 C37.4296875 27.3671875 37.4296875 27.3671875 36.0234375 29.4140625 C32.47438901 32.08653877 28.75248051 34.35923651 24.9296875 36.6171875 C18.4163065 40.50490274 12.13888353 44.53109274 6.0078125 49.00390625 C2.92184948 50.63572609 0.87376598 50.70667524 -2.5703125 50.3671875 C-4.17082914 48.76667086 -3.69762722 47.07872628 -3.69970703 44.86328125 C-3.70285919 43.90558838 -3.70601135 42.94789551 -3.70925903 41.96118164 C-3.7072348 40.91953857 -3.70521057 39.87789551 -3.703125 38.8046875 C-3.70408173 37.74306396 -3.70503845 36.68144043 -3.70602417 35.58764648 C-3.70670614 33.33805278 -3.70485069 31.08845713 -3.70068359 28.83886719 C-3.6953356 25.38211679 -3.70062804 21.92549633 -3.70703125 18.46875 C-3.70637047 16.28906221 -3.70508932 14.1093745 -3.703125 11.9296875 C-3.70514923 10.88804443 -3.70717346 9.84640137 -3.70925903 8.77319336 C-3.70610687 7.81550049 -3.70295471 6.85780762 -3.69970703 5.87109375 C-3.69891144 5.02361572 -3.69811584 4.1761377 -3.69729614 3.30297852 C-3.50129542 0.31506261 -2.98834304 0.42690615 0 0 Z " fill="white" transform="translate(35.5703125,22.6328125)"/>
        </svg></button><div class='msg-bars-mover-${id} msg-bars-mover'></div><div class='msg-bars'>${bars}</div></div>`

        // REACT COMPONENT FOR TEST USAGE WITH EASE
        // return (
        //     <div className="audio" data-id={id}><audio className="audio-play" src={audio2} />
        //         <button className="audio-play-button" onClick={play_pause_audio}>
        //             <Play />
        //         </button>
        //         <div className={`msg-bars-mover-${id} msg-bars-mover`}></div>
        //         <div className="msg-bars">
        //             {arr.map((element, index) =>
        //                 <div className="bar" key={index + 3} style={{ height: element }}>
        //                     <div className={`msg-bar-underlay-${id} msg-bar-underlay`} />
        //                 </div>
        //             )}
        //         </div>
        //     </div>
        // )
    }
}