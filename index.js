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
  const authToken = req?.headers?.authorization?.split(" ")[1];
  try {
    const decoded = jwt.verify(authToken, process.env.ACCESS_TOKEN);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(403).send({ message: "Access Denied!" });
  }
};

async function run() {
  try {
    // await client.connect();
    console.log("Connected to MongoDB!");

    const poppysPremiumDB = client.db("poppysPremiumDB");

    //collections
    const usersCollection = poppysPremiumDB.collection("usersCollection");
    const productsCollection = poppysPremiumDB.collection("productsCollection");
    const ordersCollection = poppysPremiumDB.collection("ordersCollection");

    app.get("/", (req, res) => {
      res.send("Welcome to Poppy's Premium's Server");
    });

    // Users
    app.post("/users", async (req, res) => {
      const user = req.body;
      user.createdAt = new Date();
      const token = createToken(user);
      const userExist = await usersCollection.findOne({ email: user.email });
      if (userExist) {
        return res.send({ message: "User already exists", token });
      }
      await usersCollection.insertOne(user);
      return res.send({ token });
    });

    app.get("/users", verifyToken, async (req, res) => {
      const users = usersCollection.find();
      const result = await users.toArray();
      return res.send(result);
    });

    app.get("/users/email", verifyToken, async (req, res) => {
      const email = req.user.email; // Extract the email from the verified token
      const user = await usersCollection.findOne({ email: email });
      if (!user) {
        return res.status(404).send({ message: "User not found" });
      }
      return res.send(user);
    });

    app.get("/users/email/:email", async (req, res) => {
      const email = req.params.email;
      const user = await usersCollection.findOne({ email: email });
      return res.send(user);
    });

    app.get("/users/:id", async (req, res) => {
      const id = new ObjectId(req.params.id);
      const result = await usersCollection.findOne({ _id: id });
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

    // Update user role
    app.patch("/users/:id/role", verifyToken, async (req, res) => {
      const { id } = req.params;
      const { role } = req.body;
      const result = await usersCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { role } }
      );
      res.send(result);
    });

    // Products
    app.post("/products", verifyToken, async (req, res) => {
      const product = req.body;
      const result = await productsCollection.insertOne(product);
      return res.send(result);
    });

    app.get("/products", async (req, res) => {
      const products = productsCollection.find();
      const result = await products.toArray();
      return res.send(result);
    });

    app.get("/products/:id", async (req, res) => {
      const id = req.params.id;
      const product = await productsCollection.findOne({
        _id: new ObjectId(id),
      });
      return res.send(product);
    });

    app.patch("/products/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const updatedData = req.body;
      const result = await productsCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updatedData }
      );
      return res.send(result);
    });

    app.delete("/products/:id", verifyToken, async (req, res) => {
      const id = new ObjectId(req.params.id);
      const result = await productsCollection.deleteOne({ _id: id });
      return res.send(result);
    });

    // Orders
    app.post("/orders", verifyToken, async (req, res) => {
      const order = req.body;
      order.userEmail = req.user.email;
      const result = await ordersCollection.insertOne(order);
      return res.send(result);
    });

    app.get("/orders/user", verifyToken, async (req, res) => {
      const userEmail = req.user.email;
      const orders = await ordersCollection.find({ userEmail }).toArray();
      return res.send(orders);
    });

    app.get("/orders", verifyToken, async (req, res) => {
      const orders = ordersCollection.find();
      const result = await orders.toArray();
      return res.send(result);
    });

    app.get("/orders/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const order = await ordersCollection.findOne({
        _id: new ObjectId(id),
      });
      return res.send(order);
    });

    app.patch("/orders/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const updatedData = req.body;
      const result = await ordersCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updatedData }
      );
      return res.send(result);
    });

    app.delete("/orders/:id", verifyToken, async (req, res) => {
      const id = new ObjectId(req.params.id);
      const result = await ordersCollection.deleteOne({ _id: id });
      return res.send(result);
    });

    // Endpoint to order status data
    app.get("/reports/order-status", verifyToken, async (req, res) => {
      try {
        const orderStatusReport = await ordersCollection
          .aggregate([
            {
              $group: {
                _id: "$status",
                count: { $sum: 1 },
              },
            },
          ])
          .toArray();
        res.json(orderStatusReport);
      } catch (error) {
        console.error("Error fetching order status report:", error);
        res.status(500).json({ error: "Failed to fetch order status report" });
      }
    });

    // Monthly user registrations
    app.get("/reports/monthly-registrations", async (req, res) => {
      try {
        const data = await usersCollection
          .aggregate([
            {
              $group: {
                _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
                count: { $sum: 1 },
              },
            },
            { $sort: { _id: 1 } },
          ])
          .toArray();
        res.json(data);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    // Weekly user registrations
    app.get("/reports/weekly-registrations", async (req, res) => {
      try {
        const data = await usersCollection
          .aggregate([
            {
              $group: {
                _id: { $isoWeek: "$createdAt" },
                count: { $sum: 1 },
              },
            },
            { $sort: { _id: 1 } },
          ])
          .toArray();
        res.json(data);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`App is listening on port ${port}`);
});
