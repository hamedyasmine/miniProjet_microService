const express = require('express');
const { ApolloServer } = require('@apollo/server');
const { expressMiddleware } = require('@apollo/server/express4');
const bodyParser = require('body-parser');
const cors = require('cors');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const dotenv = require('dotenv');
const { Kafka } = require('kafkajs');
const resolvers = require('./resolvers');
const typeDefs = require('./schema');

dotenv.config();

const userProtoPath = './user.proto';
const productProtoPath = './product.proto';

const userProtoDefinition = protoLoader.loadSync(userProtoPath, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});
const productProtoDefinition = protoLoader.loadSync(productProtoPath, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const userProto = grpc.loadPackageDefinition(userProtoDefinition).UserService;
const productProto = grpc.loadPackageDefinition(productProtoDefinition).ProductService;

const userClient = new userProto('localhost:50051', grpc.credentials.createInsecure());
const productClient = new productProto('localhost:50052', grpc.credentials.createInsecure());

const kafka = new Kafka({
  clientId: 'api-gateway',
  brokers: [process.env.KAFKA_BROKER],
});

const consumer = kafka.consumer({ groupId: 'api-gateway-group' });

const app = express();
app.use(cors());
app.use(bodyParser.json());

const server = new ApolloServer({ typeDefs, resolvers });

server.start().then(() => {
  app.use('/graphql', expressMiddleware(server));
});


app.post('/users', (req, res) => {
  const { username, email } = req.body;
  userClient.CreateUser({ username, email }, (err, response) => {
    if (err) {
      res.status(500).send(err);
    } else {
      res.json(response);
    }
  });
});

app.get('/users', (req, res) => {
  userClient.GetUsers({}, (err, response) => {
    if (err) {
      res.status(500).send(err);
    } else {
      res.json(response.users);
    }
  });
});

app.get('/users/:id', (req, res) => {
  const { id } = req.params;
  userClient.GetUser({ userId: id }, (err, response) => {
    if (err) {
      res.status(500).send(err);
    } else {
      res.json(response.user);
    }
  });
});

app.put('/users/:id', (req, res) => {
  const { id } = req.params;
  const { username, email } = req.body;
  userClient.UpdateUser({ userId: id, username, email }, (err, response) => {
    if (err) {
      res.status(500).send(err);
    } else {
      res.json(response.user);
    }
  });
});

app.delete('/users/:id', (req, res) => {
  const { id } = req.params;
  userClient.DeleteUser({ userId: id }, (err, response) => {
    if (err) {
      res.status(500).send(err);
    } else {
      res.json({ message: response.message });
    }
  });
});

app.post('/products', (req, res) => {
  const { name, price } = req.body;
  productClient.CreateProduct({ name, price }, (err, response) => {
    if (err) {
      res.status(500).send(err);
    } else {
      res.json(response);
    }
  });
});

app.get('/products', (req, res) => {
  productClient.GetProducts({}, (err, response) => {
    if (err) {
      res.status(500).send(err);
    } else {
      res.json(response.products);
    }
  });
});

app.get('/products/:id', (req, res) => {
  const { id } = req.params;
  productClient.GetProduct({ productId: id }, (err, response) => {
    if (err) {
      res.status(500).send(err);
    } else {
      res.json(response.product);
    }
  });
});

app.put('/products/:id', (req, res) => {
  const { id } = req.params;
  const { name, price } = req.body;
  productClient.UpdateProduct({ productId: id, name, price }, (err, response) => {
    if (err) {
      res.status(500).send(err);
    } else {
      res.json(response.product);
    }
  });
});

app.delete('/products/:id', (req, res) => {
  const { id } = req.params;
  productClient.DeleteProduct({ productId: id }, (err, response) => {
    if (err) {
      res.status(500).send(err);
    } else {
      res.json({ message: response.message });
    }
  });
});

consumer.connect().then(() => {
  return consumer.subscribe({ topic: 'users-topic', fromBeginning: true });
}).then(() => {
  return consumer.subscribe({ topic: 'products-topic', fromBeginning: true });
}).then(() => {
  return consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      const event = JSON.parse(message.value.toString());
      console.log(`Received event: ${event.type}`, event);
      // Traitez les événements selon vos besoins
    },
  });
}).catch(error => {
  console.error(`Error connecting Kafka consumer: ${error.message}`);
  process.exit(1); // Exit the process with failure code
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`API Gateway en cours d'exécution sur le port ${port}`);
});
