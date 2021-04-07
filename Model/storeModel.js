const mongoose = require('mongoose');
// const Schema =  mongoose.schema

const storeModelSchema = new mongoose.Schema({
    storename: {
        type:String
    },
    accesstoken: {
        type:String
    },
});

const store = mongoose.model('storedetails', storeModelSchema) ;

module.exports = store;