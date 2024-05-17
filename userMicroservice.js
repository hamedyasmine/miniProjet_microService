const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const dotenv = require('dotenv');
const { Kafka } = require('kafkajs');

dotenv.config();

const PROTO_PATH = './user.proto';
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});
const userProto = grpc.loadPackageDefinition(packageDefinition).UserService;

let users = [];

const kafka = new Kafka({
  clientId: 'user-service',
  brokers: [process.env.KAFKA_BROKER],
});

const producer = kafka.producer();

const server = new grpc.Server();

server.addService(userProto.service, {
  CreateUser: async (call, callback) => {
    const { username, email } = call.request;
    const user = { id: users.length + 1, username, email };
    users.push(user);
    await producer.send({
      topic: 'users-topic',
      messages: [{ value: JSON.stringify({ type: 'UserCreated', user }) }],
    });
    callback(null, { message: 'User created!', user });
  },
  GetUsers: (_, callback) => {
    callback(null, { users });
  },
  GetUser: (call, callback) => {
    const user = users.find(u => u.id == call.request.userId);
    if (user) {
      callback(null, { user });
    } else {
      callback({
        code: grpc.status.NOT_FOUND,
        details: 'User not found',
      });
    }
  },
  UpdateUser: async (call, callback) => {
    const user = users.find(u => u.id == call.request.userId);
    if (user) {
      if (call.request.username) user.username = call.request.username;
      if (call.request.email) user.email = call.request.email;
      await producer.send({
        topic: 'users-topic',
        messages: [{ value: JSON.stringify({ type: 'UserUpdated', user }) }],
      });
      callback(null, { user });
    } else {
      callback({
        code: grpc.status.NOT_FOUND,
        details: 'User not found',
      });
    }
  },
  DeleteUser: async (call, callback) => {
    const index = users.findIndex(u => u.id == call.request.userId);
    if (index !== -1) {
      const [user] = users.splice(index, 1);
      await producer.send({
        topic: 'users-topic',
        messages: [{ value: JSON.stringify({ type: 'UserDeleted', user }) }],
      });
      callback(null, { message: 'User deleted' });
    } else {
      callback({
        code: grpc.status.NOT_FOUND,
        details: 'User not found',
      });
    }
  },
});

producer.connect().then(() => {
  server.bindAsync('127.0.0.1:50051', grpc.ServerCredentials.createInsecure(), (error, port) => {
    if (error) {
      console.error(`Error binding server: ${error.message}`);
      process.exit(1);
    } else {
      console.log(`User service running at http://127.0.0.1:${port}`);
      server.start();
    }
  });
}).catch(error => {
  console.error(`Error connecting Kafka producer: ${error.message}`);
  process.exit(1);
});
