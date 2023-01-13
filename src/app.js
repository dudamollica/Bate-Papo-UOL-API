import express from "express";
import cors from "cors";
import {MongoClient} from "mongodb"
import dotenv from "dotenv"
dotenv.config()

const server = express()
const mongoClient = new MongoClient(process.env.DATABASE_URL)
let db;
console.log(mongoClient)

mongoClient.connect().then(()=>{
db= mongoClient.db()
console.log("deu certo")
}).catch(()=>console.log("nao deu certo"))

server.use(cors())
server.use(express.json()) 
server.listen(5002, () => console.log("Servidor Funfou"));

server.get("/participants", (req, res)=>{
db.collections("participants").find.toArray().then((dados)=>{
    return res.send(dados)
}).catch(()=>res.sendStatus(500).send("Não funcionou"))
})

server.post("/participants", (req, res)=>{
    const {name} = req.body
    db.collections("participants").insertOne({
        name, lastStatus: Date.now()
    }).then(()=> console.log("Participante entrou")).catch(()=> console.log("Partipante não entrou"))
})