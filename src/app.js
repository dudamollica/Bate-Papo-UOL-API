import express from "express";
import cors from "cors";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";
import dayjs from "dayjs";
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
server.listen(5001, () => console.log("Servidor Funfou"));

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
      time: dayjs().format('HH:mm:ss'),
    });

    res.sendStatus(201);
  }
});

server.get("/messages", (req, res) => {
  db.collection("messages")
    .find()
    .toArray()
    .then((dados) => {
      const user = req.headers.user;
      return res.send(dados);
    })
    .catch(() => res.sendStatus(500).send("Não funcionou"));
});

server.post("/messages", async (req, res) => {
  const { to, text, type } = req.body;
  try{
  await db.collection("messages").insertOne({
    from: req.headers.user,
    to,
    text,
    type,
    time: dayjs().format('HH:mm:ss'),
  });
  res.sendStatus(201);
} catch {
  res.sendStatus(500);
}
});

// server.status('/messages', (req,res)=>{
//
// })
