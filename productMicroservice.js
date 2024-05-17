const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const dotenv = require('dotenv');
const { Kafka } = require('kafkajs');

dotenv.config();

const PROTO_PATH = './product.proto';
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});
const productProto = grpc.loadPackageDefinition(packageDefinition).ProductService;

let products = [];

const kafka = new Kafka({
  clientId: 'product-service',
  brokers: [process.env.KAFKA_BROKER],
});

const producer = kafka.producer();

const server = new grpc.Server();

server.addService(productProto.service, {
  CreateProduct: async (call, callback) => {
    const { name, price } = call.request;
    const product = { id: products.length + 1, name, price };
    products.push(product);
    await producer.send({
      topic: 'products-topic',
      messages: [{ value: JSON.stringify({ type: 'ProductCreated', product }) }],
    });
    callback(null, { message: 'Product created!', product });
  },
  GetProducts: (_, callback) => {
    callback(null, { products });
  },
  GetProduct: (call, callback) => {
    const product = products.find(p => p.id == call.request.productId);
    if (product) {
      callback(null, { product });
    } else {
      callback({
        code: grpc.status.NOT_FOUND,
        details: 'Product not found',
      });
    }
  },
  UpdateProduct: async (call, callback) => {
    const product = products.find(p => p.id == call.request.productId);
    if (product) {
      if (call.request.name) product.name = call.request.name;
      if (call.request.price) product.price = call.request.price;
      await producer.send({
        topic: 'products-topic',
        messages: [{ value: JSON.stringify({ type: 'ProductUpdated', product }) }],
      });
      callback(null, { product });
    } else {
      callback({
        code: grpc.status.NOT_FOUND,
        details: 'Product not found',
      });
    }
  },
  DeleteProduct: async (call, callback) => {
    const index = products.findIndex(p => p.id == call.request.productId);
    if (index !== -1) {
      const [product] = products.splice(index, 1);
      await producer.send({
        topic: 'products-topic',
        messages: [{ value: JSON.stringify({ type: 'ProductDeleted', product }) }],
      });
      callback(null, { message: 'Product deleted' });
    } else {
      callback({
        code: grpc.status.NOT_FOUND,
        details: 'Product not found',
      });
    }
  },
});

producer.connect().then(() => {
  server.bindAsync('127.0.0.1:50052', grpc.ServerCredentials.createInsecure(), (error, port) => {
    if (error) {
      console.error(`Error binding server: ${error.message}`);
      process.exit(1);
    } else {
      console.log(`Product service running at http://127.0.0.1:${port}`);
      server.start();
    }
  });
}).catch(error => {
  console.error(`Error connecting Kafka producer: ${error.message}`);
  process.exit(1);
});
