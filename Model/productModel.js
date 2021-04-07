const mongoose = require('mongoose');

const productModelSchema = new mongoose.Schema({
    title: {
        type:String
    },
    vendor: {
        type:String
    }
});

const product = mongoose.model('productdetails', productModelSchema) ;

module.exports = product;