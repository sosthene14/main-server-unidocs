const mongoose = require("mongoose");

const Schema = new mongoose.Schema({
  nom: {
    type: String,
  },
  prenom: {
    type: String,
  },
  email: {
    type: String,
    unique: true
  },
  motDePasse: {
    type: String,
  },
  likes: {
    type: Object
  },
  hasVerified:{
    type: Boolean
  },
  
});
const model = mongoose.model(process.env.DB_NAME,Schema,process.env.CLUSTER);
module.exports = model;
