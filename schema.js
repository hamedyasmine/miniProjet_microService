const { gql } = require('graphql-tag');

const typeDefs = gql`
  type Product {
    id: ID!
    name: String!
    price: Float!
  }

  type User {
    id: ID!
    username: String!
    email: String!
  }

  type Query {
    products: [Product]
    users: [User]
    getProductById(id: ID!): Product
    getUserById(id: ID!): User
  }

  type Mutation {
    createProduct(name: String!, price: Float!): Product
    createUser(username: String!, email: String!): User
    updateProduct(id: ID!, name: String, price: Float): Product
    updateUser(id: ID!, username: String, email: String): User
    deleteProduct(id: ID!): String
    deleteUser(id: ID!): String
  }
`;

module.exports = typeDefs;
