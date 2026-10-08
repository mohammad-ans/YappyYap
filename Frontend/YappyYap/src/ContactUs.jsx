import "./ContactUs.css"
import { useRef} from "react"
import { Link } from "react-router-dom"
import useAxios from "../hooks/useAxios";
import useChatAuth from "../hooks/useChatAuth";
export default function ContactUs(props) {
    const issueRef = useRef(null);
    const axios = useAxios();
    const {setError, setTrigger} = useChatAuth();
    async function contactusSubmit(e) {
        e.preventDefault();
        try{
            const content = props.selectOption === "NewsLetter" ? props.footerEmail : issueRef.current?.value
            if (props.selectOption == "NewsLetter"){
                content = props.footerEmail;
            }
            let payload = {
                type : props.selectOption,
                content : content
            }
            const response = await axios.post("/contactus", payload);
            setError(response.data.msg);
            setTrigger(t => !t);
        }
        catch(e){
            if (e.response && e.response.data) {
                setError(e.response.data.detail[0].msg)
            }
            else{
                setError("An error occured");
            }
            setTrigger(t => !t);
        }
    }
    return(
        <section>
            <ul className="contact-us-nav">
                <li className="home"><Link to="/">Home</Link></li>
                <li className="contact-us"><Link to="/contactus">Contact Us</Link></li>
            </ul>
            <div className="contact-us-container">
                <h2>Contact Us</h2>
                <form onSubmit={contactusSubmit}>
                    <div className="input">
                        <ul className="ul-contactus">
                        
                    <li>
                        <label htmlFor="select-contact">Reason for Contact</label>
                    <select value={props.selectOption} onChange={(e)=> props.setOption(e.target.value)} id="select-contact">
                        <option value="NewsLetter">NewsLetter</option>
                        <option value="Bug">Bug Report</option>
                        <option value="other">Others</option>
                    </select>
                        </li>
                    <li>
                    {props.selectOption === "NewsLetter" ? (<input type="email" className="email-input email-contact" placeholder="Enter your email" value={props.footerEmail} onChange={(e)=> props.setFooterEmail(e.target.value)} />): (<textarea type="text"placeholder="Enter your problem here" ref={issueRef} className="text-contact"/>)}
                    </li>

                    <li>
                    <button type="submit" className="sign-button">Submit</button>
                    </li>
                        </ul>
                    </div>

                </form>
            </div>
        </section>
    )
}