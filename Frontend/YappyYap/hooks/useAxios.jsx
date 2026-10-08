import axios from "axios"
import { API_URL } from "../src/config"

export default function useAxios(){
    return axios.create({
        baseURL: API_URL,
        withCredentials: true,
    })
}
