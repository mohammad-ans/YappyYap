import BoxMain from "./BoxMain";
import { useEffect } from "react";
import { Link } from "react-router-dom";
import { gsap} from "gsap/gsap-core";
import {useGSAP} from "@gsap/react"
import { ScrollTrigger } from "gsap/all";
import { horizontalLoop } from "@andresclua/infinite-marquee-gsap";
import "./Home.css"
import img1 from "./assets/dummy1.jpg"
import img2 from "./assets/dummy2.jpg"
import img3 from "./assets/dummy3.jpg"
import logo from "./assets/logo.png"
import useAxios from "../hooks/useAxios";
import useHomeComps from "../hooks/useHomeComps";
export default function Home(props) {
    let {headings, contents, urls, loading} = useHomeComps();
    gsap.registerPlugin(ScrollTrigger);
    // useGSAP(()=>{
    //     gsap.to(".scroll-pin-text", {
    //         transform: "translateX(-1990vh)",
    //         scrollTrigger:{
    //             trigger:".scroll-pin",
    //             start: "top 0vh",
    //             end: "top -8000vh",
    //             scrub: 4,
    //             pin: ".scroll-pin",
    //         },
    //         ease: "sine.inOut"
    //     })
    // }, [headings])
    useGSAP(()=>{
    let timeline1 = gsap.timeline();
    let timeline2 = gsap.timeline();
    let upsideTimeline = gsap.timeline();
    upsideTimeline.from(".upside-down",{
        opacity: 0,
        scaleY: -1,
        translateY: 20,
        duration:1,
        stagger: 0.2,
        ease: "sine.inOut"
    });
    upsideTimeline.to(".invert-infinite", {
        scaleY: -1,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
        repeatDelay: 2,
        delay: 2,
    });
    timeline1.from(".left-side-rotating", {
        x: -20,
        scale: 0.5,
        opacity:0,
        stagger: 0.2,
        rotate: "500deg",
        ease: "sine.inOut"
    });
    timeline1.from(".left-side", {
        scale: 0.5,
        translateX: -30,
        opacity: 0,
        stagger: 0.2,  
        ease: "sine.inOut"
    });
    timeline2.from(".down-rotating", {
        scale: 0.5,
        translateY: 30,
        opacity: 0,
        rotate: "600deg",
        ease: "sine.inOut",
        stagger: 0.2
    });
    timeline2.from(".down", {
        opacity: 0,
        translateY: 20,
        stagger: 0.2,
        ease: "sine.inOut"
    });
    gsap.to(".svg-rotate", {
        rotate: 180,
        repeat: -1,
        duration: 0.5,
        repeatDelay: 2,
        stagger: 1,
        ease: "sine.inOut"
    })
    const ribbon1 = document.querySelector("#scroll-msg-p1");
    const ribbon2 = document.querySelector("#scroll-msg-p2");
    const items = gsap.utils.toArray([ribbon1, ribbon2]);

    gsap.set(items, {xPercent:0});
    horizontalLoop(items, {
        repeat: -1,
        speed: 1,
        paused: false
    });
    const colorLine = gsap.timeline({repeat: -1, repeatDelay: 2, delay: 3});
    colorLine.to(".animation-line", {
        color: "rgb(89, 221, 89)",
        duration: 0.8,
        stagger: 0.2,
        ease: "power1.inOut"
    })
    colorLine.to(".animation-line", {
        color: "beige",
        duration: 0.8,
        stagger: 0.2,
        ease: "power1.inOut"
    }, "-=4.2")
    
},[])
    return (
        <main>
            <div className="view-helper">
            <h1 className="main-h1">
                <div className="first-part">
<span className="animation-line"><span className="upside-down">A</span></span>
            <span className="animation-line"><span className="left-side-rotating">n</span></span>
            <span ><svg className="svg-rotate svg-rotate-style" viewBox="0 0 137 135" fill="none" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" aria-hidden="true">
<path d="M84.1148 67.3453H136.194C136.637 67.3453 137 67.7028 137 68.1397V134.043C137 134.484 136.633 134.845 136.186 134.841C99.0222 134.416 68.9737 104.827 68.502 68.2191V134.206C68.502 134.643 68.1392 135 67.6958 135H0.814284C0.366822 135 -2.06673e-05 134.639 0.00401052 134.198C0.439379 97.2879 30.9354 67.5042 68.498 67.5002H0.806238C0.362807 67.5002 0 67.1427 0 66.7057V0.802561C0 0.361644 0.366822 0.000171863 0.814284 0.00414409C37.9778 0.429172 68.0263 30.0183 68.498 66.6263V0.794617C68.498 0.357672 68.8608 0.000171819 69.3042 0.000171819H136.186C136.633 0.000171819 137 0.361644 136.996 0.802561C136.621 32.4969 114.079 58.94 83.9334 65.7802C83.0022 65.9907 83.1594 67.3453 84.1189 67.3453H84.1148Z" fill="url(#paint0_linear_1655_45397)"></path>
<path d="M84.1148 67.3453H136.194C136.637 67.3453 137 67.7028 137 68.1397V134.043C137 134.484 136.633 134.845 136.186 134.841C99.0222 134.416 68.9737 104.827 68.502 68.2191V134.206C68.502 134.643 68.1392 135 67.6958 135H0.814284C0.366822 135 -2.06673e-05 134.639 0.00401052 134.198C0.439379 97.2879 30.9354 67.5042 68.498 67.5002H0.806238C0.362807 67.5002 0 67.1427 0 66.7057V0.802561C0 0.361644 0.366822 0.000171863 0.814284 0.00414409C37.9778 0.429172 68.0263 30.0183 68.498 66.6263V0.794617C68.498 0.357672 68.8608 0.000171819 69.3042 0.000171819H136.186C136.633 0.000171819 137 0.361644 136.996 0.802561C136.621 32.4969 114.079 58.94 83.9334 65.7802C83.0022 65.9907 83.1594 67.3453 84.1189 67.3453H84.1148Z" fill="url(#pattern-home-hero-windmill-0)" fillOpacity="0.6" style={{mixBlendMode:"multiply"}}></path>
<defs>
<pattern id="pattern-home-hero-windmill-0" patternContentUnits="objectBoundingBox" width="1.45985" height="1.48148">
<use xlinkHref="#svg-noise" transform="scale(0.00291971 0.00296296)"></use>
</pattern>
<linearGradient id="paint0_linear_1655_45397" x1="-76.6791" y1="-15.6157" x2="165.682" y2="81.0082" gradientUnits="userSpaceOnUse">
<stop offset="0.427083" stopColor="#FF8709"></stop>
<stop offset="0.791667" stopColor="#F7BDF8"></stop>
</linearGradient>
</defs>
</svg></span>
            <span className="left-side"><svg className = "svg-rotate"width="8vw" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" fill="none" viewBox="0 0 124 124" aria-hidden="true">
  <path fill="#fff" fillRule="evenodd" d="m43.184 54.206-35.557.137a7.656 7.656 0 0 0 0 15.313l35.557.138-25.045 25.24a7.657 7.657 0 0 0 10.828 10.827l25.24-25.045.136 35.557a7.657 7.657 0 0 0 15.313 0l.138-35.557 25.24 25.045a7.656 7.656 0 0 0 10.827-10.828l-25.045-25.24 35.557-.137a7.657 7.657 0 0 0 0-15.313l-35.557-.137 25.045-25.24a7.657 7.657 0 0 0-10.828-10.828l-25.24 25.046-.137-35.557a7.657 7.657 0 0 0-15.313 0l-.137 35.557-25.24-25.045a7.657 7.657 0 0 0-10.828 10.828l25.046 25.24Z" clipRule="evenodd"></path>
  <path fill="url(#paint0_radial_2080_57111)" fillRule="evenodd" d="m43.184 54.206-35.557.137a7.656 7.656 0 0 0 0 15.313l35.557.138-25.045 25.24a7.657 7.657 0 0 0 10.828 10.827l25.24-25.045.136 35.557a7.657 7.657 0 0 0 15.313 0l.138-35.557 25.24 25.045a7.656 7.656 0 0 0 10.827-10.828l-25.045-25.24 35.557-.137a7.657 7.657 0 0 0 0-15.313l-35.557-.137 25.045-25.24a7.657 7.657 0 0 0-10.828-10.828l-25.24 25.046-.137-35.557a7.657 7.657 0 0 0-15.313 0l-.137 35.557-25.24-25.045a7.657 7.657 0 0 0-10.828 10.828l25.046 25.24Z" clipRule="evenodd"></path>
  <path fill="url(#pattern-home-animate-asterisk-0)" fillRule="evenodd" d="m43.184 54.206-35.557.137a7.656 7.656 0 0 0 0 15.313l35.557.138-25.045 25.24a7.657 7.657 0 0 0 10.828 10.827l25.24-25.045.136 35.557a7.657 7.657 0 0 0 15.313 0l.138-35.557 25.24 25.045a7.656 7.656 0 0 0 10.827-10.828l-25.045-25.24 35.557-.137a7.657 7.657 0 0 0 0-15.313l-35.557-.137 25.045-25.24a7.657 7.657 0 0 0-10.828-10.828l-25.24 25.046-.137-35.557a7.657 7.657 0 0 0-15.313 0l-.137 35.557-25.24-25.045a7.657 7.657 0 0 0-10.828 10.828l25.046 25.24Z" clipRule="evenodd" style={{mixBlendMode:"multiply"}}></path>
  <defs>
    <radialGradient id="paint0_radial_2080_57111" cx="0" cy="0" r="1" gradientTransform="rotate(-90 63.541 25.385) scale(97.6761)" gradientUnits="userSpaceOnUse">
      <stop stopColor="#FFEBE7"></stop>
      <stop offset=".672" stopColor="#FF9C7C"></stop>
      <stop offset=".816" stopColor="#FF9983"></stop>
      <stop offset=".901" stopColor="#FF774B"></stop>
      <stop offset="1" stopColor="#E76F00"></stop>
    </radialGradient>
    <pattern id="pattern-home-animate-asterisk-0" width=".806" height=".806" patternContentUnits="objectBoundingBox">
      <use xlinkHref="#svg-noise" transform="scale(.00161)"></use>
    </pattern>
  </defs>
</svg></span>
            <span className="animation-line"><span className="left-side-rotating">n</span></span>
            <span className="animation-line"><span className="down">y</span></span>
            <span className="animation-line"><span className="left-side">m</span></span>
            <span className="animation-line"><span className="down-rotating">i</span></span>
            <span className="animation-line"><span className="upside-down">t</span></span>
            <span className="animation-line"><span className="down">y</span></span>
            <span className="animation-line"><span className="left-side">,</span></span>
                </div>
                
            <div className="second-part">
            <span className="animation-line"><span className="upside-down">N</span></span>
            <span className="animation-line"><span className="left-side">o</span></span> <span className="animation-line"><span className="down">R</span></span>
<span className="animation-line"><span className="left-side-rotating">e</span></span>
            <span className="animation-line"><span className="left-side-rotating">s</span></span>
            <span className="animation-line"><span className="invert-infinite upside-down">t</span></span>
            <span className="animation-line"><span className="left-side-rotating">r</span></span>
            <span className="animation-line"><span className="down-svg">i</span></span>
            <span className="animation-line"><span className="down-rotating">c</span></span>
           
            <span className="animation-line"><span className="invert-infinite upside-down">t</span></span>
            <span className="animation-line"><span className="down">i</span></span>
            <span className="animation-line"><span className="left-side">o</span></span>
            <span className="animation-line"><span className="left-side-rotating">n</span></span>
            <span className="animation-line"><span className="down-rotating">s</span></span>
            </div>
</h1>
<div className="curly-bracket-txt">
    <span className="curly-bracket">{"{"}</span>
            <span className="main-text">Yap as much as you want on YappyYap. Say whatever you want.
                </span><span className="curly-bracket">{"}"}</span>
            <Link to="/signup"><button className="main-join-button">Join Now</button></Link>
            </div>
            </div>
            <hr />
            <div className="scroll-msg">
                <p id="scroll-msg-p1">Yap <img src={logo}></img> Make Jokes <img src={logo}></img> Be Free <img src={logo}></img> Be Anonymous <img src={logo}></img></p>
                <p id="scroll-msg-p2">Yap <img src={logo}></img> Make Jokes <img src={logo}></img> Be Free <img src={logo}></img> Be Anonymous <img src={logo}></img></p>
            </div>
            <div className="boxes">
                {loading ? (<div className="error-msg">Loading...</div>) : (<>{
                    headings.map((heading, index) => <BoxMain key={heading} heading={heading} content={contents[index]} display_stuff={urls[index]}/>)
                }</>)}
            </div>
            {/* <BoxMain key={"hi"} heading = {"fjaeoifjaoijfa"} content = {"wfajoeiwjfwejfo"} display_stuff={img1}/> */}
            {/* <div className="scroll-pin">
                <p className="scroll-pin-text">Chat in an environment with no restrictions and anonymity.</p>
            </div> */}
            {/* {box_heading.map((heading) => document.createElement)} */}
        </main>
    );
}