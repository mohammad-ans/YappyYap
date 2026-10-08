import "./About.css"
import AboutComp from "./AboutComp";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap/gsap-core";
import { ScrollTrigger } from "gsap/all";
import useAboutComps from "../hooks/useAboutComps";
export default function About() {
    const {contents, loading} = useAboutComps()
    useGSAP(()=>{
        gsap.registerPlugin(ScrollTrigger);
        gsap.utils.toArray(".vr-circle-fill").forEach(element => {
            gsap.to(element, {
                opacity: 1,
                scrollTrigger:{
                    trigger: element,
                    start: "top 40%",
                    scrub: true,
                    end: "bottom 30%"
                }
            })
        });
        gsap.utils.toArray(".vr-fill").forEach(element => {
            gsap.to(element,{
                height: "100%",
                scrollTrigger: {
                    trigger: element,
                    scrub: true,
                    start: "top 40%",
                    end: "bottom 30%"
                }
            })
        });
    }, [contents])
    if(loading)
        return (
            <div>Loading...</div>
    )
    return (
        <section>
            <div className="about-heading">
                <h1>About YappyYap</h1>
                <p>YappyYap is the perfect place to yap as much as you want as we GenZ are yappers, no offense.(with anonymity ofcourse)</p>
            </div>
            <div className="about-components">
            <h1>
                Our Story
            </h1>

            {loading ? (<div className="error-msg">Loading...</div>) : (
            contents.map((content, index) => {
                let left = false;
                if (index % 2)
                    left = true;
                return <AboutComp key={content} content={content} left={left}/>
            }))
            }
            <div className="about-end-content">
            <h1>Development Onwards...</h1>
            <p className="about-end-para">YappyYap is making progress by each day due to continuous efforts and we are trying our best to make use of this platform an ease for you.</p>

            </div>
            </div>
        </section>
    );
}