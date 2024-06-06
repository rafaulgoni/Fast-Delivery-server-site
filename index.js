const express = require('express');
const cors = require('cors');
require('dotenv').config();
const app = express()
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://go-parcel-book-store.web.app",
      "https://go-parcel-book-store.firebaseapp.com"
    ],
    credentials: true,
  })
);
app.use(express.json());



const uri = `mongodb+srv://${process.env.DB_user}:${process.env.DB_pass}@cluster0.63twi6v.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // await client.connect();
    const bookCollection = client.db("bookStoreDB").collection('book')
    const reviewsCollection = client.db("bookStoreDB").collection('reviews')

    app.put('/book/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const options = { upsert: true };
      const updatedCard = req.body;
      const Card = {
        $set: {
          ...updatedCard
        }
      }
      const result = await bookCollection.updateOne(filter, Card, options);
      res.send(result);
    });

    app.get('/books/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await bookCollection.findOne(query);
      res.send(result);
    });
    

    app.get('/book/:email', async (req, res) => {
      const result = await bookCollection.find({email: req.params.email}).toArray();
      res.send(result);
    })
    
    app.get('/book', async (req, res) => {
      const cursor = bookCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    app.post('/book', async (req, res) => {
      const newService = req.body;
      const result = await bookCollection.insertOne(newService);
      res.send(result);
    });

    app.delete('/book/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await bookCollection.deleteOne(query);
      res.send(result);
    });


    app.get('/reviews', async (req, res) => {
      const cursor = reviewsCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

   
    // await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('Assignment_category_00016')
});

app.listen(port, () => {
  console.log(`Assignment_category_00016 server is running on port: ${port}`);
})