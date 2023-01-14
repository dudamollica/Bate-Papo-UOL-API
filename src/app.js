import express from "express";
import cors from "cors";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";
import dayjs from "dayjs"
dotenv.config();

const server = express();
const mongoClient = new MongoClient(process.env.DATABASE_URL);
let db;

mongoClient
  .connect()
  .then(() => {
    db = mongoClient.db();
    console.log("deu certo");
  })
  .catch(() => console.log("nao deu certo"));

server.use(cors());
server.use(express.json());
server.listen(5000, () => console.log("Servidor Funfou"));

server.get("/participants", (req, res) => {
  db.collection("participants")
    .find()
    .toArray()
    .then((dados) => {
      return res.send(dados);
    })
    .catch(() => res.sendStatus(500).send("Não funcionou"));
});

server.post("/participants", async (req, res) => {
  const { name } = req.body;

  if (name) {
    const userExist = await db.collection("participants").findOne({ name });

    if (userExist) return res.status(409);

    await db
      .collection("participants")
      .insertOne({ name, lastStatus: Date.now() });

    db.collection("messages").insertOne({
      from: name,
      to: "Todos",
      text: "entra na sala...",
      type: "status",
      time: `${dayjs().hour()}:${dayjs().minute()}:${dayjs().second()}`,
    });

    res.sendStatus(201);
  }
});

// server.get('/messages', (req,res)=>{
//
// })

// server.post('/messages', (req,res)=>{
//
// })

// server.status('/messages', (req,res)=>{
//
// })
