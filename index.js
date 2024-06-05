const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.MONGODB_USER}:${process.env.MONGODB_PASSWORD}@cluster0.ieahvtz.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const createToken = (user) =>
  jwt.sign(
    {
      email: user.email,
    },
    process.env.ACCESS_TOKEN,
    { expiresIn: "7d" }
  );

const verifyToken = (req, res, next) => {
  const authToken = req.headers.authorization.split(" ")[1];
  const decoded = jwt.verify(authToken, process.env.ACCESS_TOKEN);
  if (!decoded.email) {
    return res.send({ message: "Access Denied!" });
  }
  req.user = decoded.email;
  next();
};

async function run() {
  try {
    await client.connect();
    console.log("Connected to MongoDB!");

    const poppysPremiumDB = client.db("poppysPremiumDB");

    const usersCollection = poppysPremiumDB.collection("usersCollection");
    const shoesCollection = poppysPremiumDB.collection("shoesCollection");

    //users
    app.post("/users", async (req, res) => {
      const user = req.body;
      const token = createToken(user);
      const userExist = await usersCollection.findOne({ email: user.email });
      if (userExist) {
        return res.send({ message: "user already exists", token });
      }
      await usersCollection.insertOne(user);
      return res.send({ token });
    });

    app.get("/users", async (req, res) => {
      const users = usersCollection.find();
      const result = await users.toArray();
      return res.send(result);
    });

    app.get("/users/email/:email", async (req, res) => {
      const email = req.params.email;
      const user = await usersCollection.findOne({ email: email });
      return res.send(user);
    });

    app.get("/users/:id", async (req, res) => {
      const id = new ObjectId(req.params.id);
      const result = await usersCollection.findOne({ _id: id });
      console.log(result);
      return res.send(result);
    });

    app.patch("/users/:id", async (req, res) => {
      const id = new ObjectId(req.params.id);
      const updatedInfo = req.body;
      const result = await usersCollection.updateOne(
        { _id: id },
        { $set: updatedInfo }
      );
      return res.send(result);
    });

    // products
    app.post("/shoes", verifyToken, async (req, res) => {
      const shoe = req.body;
      const result = await shoesCollection.insertOne(shoe);
      return res.send(result);
    });

    app.get("/shoes", async (req, res) => {
      const shoes = shoesCollection.find();
      const result = await shoes.toArray();
      return res.send(result);
    });

    app.get("/shoes/:id", async (req, res) => {
      const id = req.params.id;
      const shoe = await shoesCollection.findOne({ _id: new ObjectId(id) });
      return res.send(shoe);
    });

    app.patch("/shoes/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const updatedData = req.body;
      const result = await shoesCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updatedData }
      );
      return res.send(result);
    });

    app.delete("/shoes/:id", verifyToken, async (req, res) => {
      const id = new ObjectId(req.params.id);
      const result = await shoesCollection.deleteOne({ _id: id });
      return res.send(result);
    });
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`App is listening on port ${port}`);
});
