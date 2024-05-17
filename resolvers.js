const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');

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

const resolvers = {
  Query: {
    products: () => {
      return new Promise((resolve, reject) => {
        productClient.GetProducts({}, (err, response) => {
          if (err) {
            reject(err);
          } else {
            resolve(response.products);
          }
        });
      });
    },
    users: () => {
      return new Promise((resolve, reject) => {
        userClient.GetUsers({}, (err, response) => {
          if (err) {
            reject(err);
          } else {
            resolve(response.users);
          }
        });
      });
    },
    getProductById: (_, { id }) => {
      return new Promise((resolve, reject) => {
        productClient.GetProduct({ productId: id }, (err, response) => {
          if (err) {
            reject(err);
          } else {
            resolve(response.product);
          }
        });
      });
    },
    getUserById: (_, { id }) => {
      return new Promise((resolve, reject) => {
        userClient.GetUser({ userId: id }, (err, response) => {
          if (err) {
            reject(err);
          } else {
            resolve(response.user);
          }
        });
      });
    },
  },
  Mutation: {
    createProduct: (_, { name, price }) => {
      return new Promise((resolve, reject) => {
        productClient.CreateProduct({ name, price }, (err, response) => {
          if (err) {
            reject(err);
          } else {
            resolve(response.product);
          }
        });
      });
    },
    createUser: (_, { username, email }) => {
      return new Promise((resolve, reject) => {
        userClient.CreateUser({ username, email }, (err, response) => {
          if (err) {
            reject(err);
          } else {
            resolve(response.user);
          }
        });
      });
    },
    updateProduct: (_, { id, name, price }) => {
      return new Promise((resolve, reject) => {
        productClient.UpdateProduct({ productId: id, name, price }, (err, response) => {
          if (err) {
            reject(err);
          } else {
            resolve(response.product);
          }
        });
      });
    },
    updateUser: (_, { id, username, email }) => {
      return new Promise((resolve, reject) => {
        userClient.UpdateUser({ userId: id, username, email }, (err, response) => {
          if (err) {
            reject(err);
          } else {
            resolve(response.user);
          }
        });
      });
    },
    deleteProduct: (_, { id }) => {
      return new Promise((resolve, reject) => {
        productClient.DeleteProduct({ productId: id }, (err, response) => {
          if (err) {
            reject(err);
          } else {
            resolve(response.message);
          }
        });
      });
    },
    deleteUser: (_, { id }) => {
      return new Promise((resolve, reject) => {
        userClient.DeleteUser({ userId: id }, (err, response) => {
          if (err) {
            reject(err);
          } else {
            resolve(response.message);
          }
        });
      });
    },
  },
};

module.exports = resolvers;
