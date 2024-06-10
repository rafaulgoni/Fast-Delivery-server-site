const express = require('express');
const cors = require('cors');
require('dotenv').config();
const app = express()
const jwt = require('jsonwebtoken');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
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
    const usersCollection = client.db("bookStoreDB").collection('users')
    const reviewsCollection = client.db("bookStoreDB").collection('reviews')
    const deliveryMenCollection = client.db("bookStoreDB").collection('deliveryMen')
    const paymentCollection = client.db("bookStoreDB").collection('payments')

    app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '23h' });
      res.send({ token });
    })

    // middlewares 
    const verifyToken = (req, res, next) => {
      if (!req.headers.authorization) {
        return res.status(401).send({ message: 'unauthorized access' });
      }
      const token = req.headers.authorization.split(' ')[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: 'unauthorized access' })
        }
        req.decoded = decoded;
        next();
      })
    }

    // use verify admin after verifyToken
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      const isAdmin = user?.Role === 'admin';
      if (!isAdmin) {
        return res.status(403).send({ message: 'forbidden access' });
      }
      next();
    }

    // use verify delivery after verifyToken
    const verifyDeliveryMen = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      const isAdmin = user?.Role === 'deliveryMen';
      if (!isAdmin) {
        return res.status(403).send({ message: 'forbidden access' });
      }
      next();
    }
    
    app.post('/create-payment-intent', async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: ['card']
      });
      res.send({
        clientSecret: paymentIntent.client_secret
      })
    });

    app.post('/payments', async (req, res) => {
      const payment = req.body;
      const paymentResult = await paymentCollection.insertOne(payment);
      const query = {
        _id: {
          $in: payment.cartIds.map(id => new ObjectId(id))
        }
      };

      const deleteResult = await cartCollection.deleteMany(query);

      res.send({ paymentResult, deleteResult });
    })

    app.get('/deliveryMen', async (req, res) => {
      const cursor = deliveryMenCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    app.post('/deliveryMen', async (req, res) => {
      const newBook = req.body;
      const result = await deliveryMenCollection.insertOne(newBook);
      res.send(result);
    });

    app.put('/users/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const options = { upsert: true };
      const updatedCard = req.body;
      const Card = {
        $set: {
          ...updatedCard
        }
      }
      const result = await usersCollection.updateOne(filter, Card, options);
      res.send(result);
    });

    app.get('/users', async (req, res) => {
      const cursor = usersCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get('/userDeliveryMen', async (req, res) => {
      let query = {}
      if (req.query?.Role) {
        query = { Role: req.query.Role }
      }
      const result = await usersCollection.find(query).toArray();
      res.send(result)
    })

    app.get('/users/user/:email', async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      let publicUser = false;
      if (user) {
        publicUser = user?.Role === 'publicUser';
      }
      res.send({ publicUser });
    })

    app.get('/users/deliveryMen/:email', async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      let deliveryMen = false;
      if (user) {
        deliveryMen = user?.Role === 'deliveryMen';
      }
      res.send({ deliveryMen });
    })

    app.get('/users/admin/:email', async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.Role === 'admin';
      }
      res.send({ admin });
    })

    app.post('/users', async (req, res) => {
      const user = req.body;
      const query = { email: user.email }
      const existingUser = await usersCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: 'user already exists', insertedId: null })
      }
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

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
      const newBook = req.body;
      const result = await bookCollection.insertOne(newBook);
      res.send(result);
    });

    app.delete('/book/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await bookCollection.deleteOne(query);
      res.send(result);
    });

    app.get('/booking', async (req, res) => {
      let query = {}
      if (req.query?.BookingStatus) {
        query = { BookingStatus: req.query.BookingStatus }
      }
      const result = await bookCollection.find(query).toArray();
      res.send(result)
    })


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