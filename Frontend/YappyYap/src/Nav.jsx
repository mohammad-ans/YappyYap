import { Link } from "react-router-dom"
import "./Nav.css"
import { useEffect, useState } from "react"
import { gsap } from "gsap"
import useLogged from "../hooks/useChatAuth"
import logo from "./assets/logo.png"
import useChatAuth from "../hooks/useChatAuth"
export default function Nav(props) {
    const [navOpen, setnavOpen] = useState(false);
    const [animating, setAnimating] = useState(false);
    const {logged} = useChatAuth()
    
    function hoverEnter() {
        document.querySelector(".menubar").style.color = "rgb(95, 93, 93)";
        gsap.to(".hoverEff", {
            width : "100%",
            duration : 0.1,
        })
        setAnimating(true);
    }
    function hoverLeave() {
        document.querySelector(".menubar").style.color = "beige";
        gsap.to(".hoverEff", {
            width : "0%",
            duration : 0.1,
        })
        setAnimating(false);
    }
    function func() {
        const element = document.querySelector(".navbar-header");
        const helper = document.querySelector(".main-navbar-helper")
        if(window.innerWidth <= 600) {
            if (navOpen) {
                helper.style.display = "block";
                element.classList.add("main-nav-close");
                element.classList.remove("main-nav-open");
            }
            else{
                helper.style.display = "none";
                element.classList.add("main-nav-open");
                element.classList.remove("main-nav-close");
            }
            setnavOpen((n)=>!n);
        }
    }
    document.querySelectorAll(".navbar a").forEach(element => {
        element.addEventListener("click",() => {
            if (navOpen){
                func();
            }
        })
    })
    return (
        <nav className="navbar-header main-nav-close">
            <div className="navbar">

                <Link to="/"><img src={logo} alt="YappyYap" /></Link>
                
                <button className="menubar" onClick={() => {func(); animating ? hoverLeave(): hoverEnter();}} onMouseEnter={hoverEnter} onMouseLeave={hoverLeave}><span className="hoverEff"></span><span style={{ fontSize: "0.8rem" }}>Menu</span><span className="ham">≡</span> <span className="cross">X</span> </button>
                <ul className="navbar-items">
                    <li><Link to="/">Home</Link></li>
                    <li><Link to="/about">About</Link></li>
                    <li><Link to="/chat">Chat</Link></li>
                    <li className="nav-last-el-manage">{logged ? (<Link to="account">My Account</Link>) : (<><Link to="signin" >SignIn </Link><span>|</span><Link to="signup"> SignUp</Link></>)}</li>
                </ul>
            </div>
            <hr className="nav-hr"/>
        </nav>
    )
}