const dotenv = require('dotenv').config();
const express = require('express');
const app = express();
const crypto = require('crypto');
const cookie = require('cookie');
const nonce = require('nonce')();
const querystring = require('querystring');

const request = require('request-promise');
const axios = require('axios');

const apiKey = process.env.SHOPIFY_API_KEY;
const apiSecret = process.env.SHOPIFY_API_SECRET;
const scopes = 'read_products write_products';
const forwardingAddress = "https://ed0b89b5cf18.ngrok.io"; // Replace this with your HTTPS Forwarding address
const storeModel = require("../Model/storeModel");
const product = require('../Model/productModel');



const install = async(req, res) => {
  const shop = req.query.shop;
  // console.log(shop);
  try{
    const shopdetails = await storeModel.findOne({ storename : shop});
    if (shopdetails){
      const getproductsurl = forwardingAddress + "/getproducts/" + shop
      res.redirect(getproductsurl);
    }
    else{
      if (shop) {
        const state = nonce();
        const redirectUri = forwardingAddress + '/shopify/callback';
        const installUrl = 'https://' + shop +
          '/admin/oauth/authorize?client_id=' + apiKey +
          '&scope=' + scopes +
          '&state=' + state +
          '&redirect_uri=' + redirectUri;
        console.log(installUrl);
        res.cookie('state', state);
        res.redirect(installUrl);
      } else {
        return res.status(400).send('Missing shop parameter. Please add ?shop=your-development-shop.myshopify.com to your request');
      }
    }
  }catch(error){
    res.status(400).send(error)
  }
};

const callb = async (req, res) => {
  const { shop, hmac, code, state } = req.query;
  const stateCookie = cookie.parse(req.headers.cookie).state;
  if (state !== stateCookie) {
    return res.status(403).send('Request origin cannot be verified');
  }
  if (shop && hmac && code) {
    var hmacver = await veryhmac(req, hmac)
    if (hmacver == 500){
      return res.status(400).send('HMAC validation failed');
    }
    var access_token =  await getaccestoken(code, shop)
    console.log(access_token)
    const store = {
      'storename': shop,
      'accesstoken': access_token
    }
    try{
      const dbstore  = new storeModel(store)
      await dbstore.save();
      res.send(dbstore)
    }
    catch(error) {
      res.status(500).send(error);
    }
    // res.status(200).send("Got an access token, let's do something with it");
  } else {
    res.status(400).send('Required parameters missing');
  }
};

const veryhmac = async(req, hmac) => {
  const map = Object.assign({}, req.query);
  delete map['signature'];
  delete map['hmac'];
  const message = querystring.stringify(map);
  const providedHmac = Buffer.from(hmac, 'utf-8');
  const generatedHash = Buffer.from(
    crypto
      .createHmac('sha256', apiSecret)
      .update(message)
      .digest('hex'),
      'utf-8'
    );
  let hashEquals = false;
  // timingSafeEqual will prevent any timing attacks. Arguments must be buffers
  try {
    hashEquals = crypto.timingSafeEqual(generatedHash, providedHmac)
  // timingSafeEqual will return an error if the input buffers are not the same length.
  } catch (e) {
    hashEquals = false;
  };

  if (!hashEquals) {
    return 500;
  }

  return 200
}

const getaccestoken = async(code, shop) => {
  const header = {
    'Content - Type' : 'application/json',
    'Accept' : 'application/json'
  }
  const body = {
    client_id: apiKey,
    client_secret: apiSecret,
    code,
  };
    try {
      const response = await axios({
        method: 'post',
        url: `https://${shop}/admin/oauth/access_token`,
        header : header,
        data: body
      });
      return response.data.access_token
    } catch (error) {
      console.error(error);
    }
}

const getproducts = async(request, response) =>{
  try{
    shop = request.params.storename
    const shopRequestUrl = 'https://' + shop + '/admin/api/2021-04/products.json';
    const shopdetails = await storeModel.findOne({ storename : shop});
    accessToken = shopdetails.accesstoken;
    console.log("URL",shopRequestUrl)
    console.log("access token",accessToken)
    const shopRequestHeaders = {
      'X-Shopify-Access-Token': accessToken,
    };
    try {
      const res = await axios({
        method: 'get',
        url : shopRequestUrl,
        headers : shopRequestHeaders
      });
      console.log(res.data.products)
      response.send(res.data.products)
    } catch (error) {
      console.log("error")
      console.error(error);
    }
  }catch (error){
    response.status(500).send(error);
  }
}

const createproducts = async(req, res) => {
  const shop = req.params.storename
  const shopRequestUrl = 'https://' + shop + '/admin/api/2021-04/products.json';
  console.log(shop)
  try{
    const shopdetails = await storeModel.findOne({ storename : shop});
    accessToken = shopdetails.accesstoken;
    const shopRequestHeaders = {
      'X-Shopify-Access-Token': accessToken,
    };
    sto = shop.split(".")
    const prod = {
      'title':req.body.title,
      'vendor':sto[0]
    }
    try{
      const pro = new product(prod)
      await pro.save()
      console.log("creeated in the database.")
    }catch(error){
      res.status(500).send(error);
    }
    const prod1 = {
      "product":prod
    }
    try{
      const re = await axios({
        method : 'post',
        url: shopRequestUrl,
        headers: shopRequestHeaders,
        data: prod1
      });
      console.log(re.data)
      res.send(re.data)
    }catch(error){
      console.log(error)
      // res.end(error)
    }
  }
  catch(error){
    console.log(error)
  }
}

const updateproducts = async(req, res) => {
  const prod = req.params.productid;
  const shop = req.body.storename;
  const oldtitle = req.body.oldtitle;
  const shopRequestUrl = 'https://' + shop + '/admin/api/2021-04/products/'+ prod +'.json';
  try{
    const shopdetails = await storeModel.findOne({ storename : shop});
    accessToken = shopdetails.accesstoken;
    console.log(shopdetails.accesstoken)
    const shopRequestHeaders = {
      'X-Shopify-Access-Token': accessToken,
    };
    try{
      const prod1 = {
        'title': req.body.title,
      }
      const detailsdb =  await product.findOne({ "title" : oldtitle})
      await product.findByIdAndUpdate(detailsdb.id, prod1);
      console.log("updated in the database.")
    }catch(error){
      res.status(500).send(error);
    }
    const prod1 = {
      "product":{
        "id":prod,
        "title":req.body.title
      }
    }
    try{
      const re = await axios({
        method : 'put',
        url: shopRequestUrl,
        headers: shopRequestHeaders,
        data: prod1
      });
      console.log(re.data)
      res.send(re.data)
    }catch(error){
      console.log("here",error)
      res.status(500).send(error)
    }
  } catch(error){
    console.log(error)
  }
}

const deleteproducts = async(req, res) => {
  const prod = req.params.productid;
  const shop = req.body.storename;
  const title = req.body.title;
  console.log(prod)
  const shopRequestUrl = 'https://' + shop + '/admin/api/2021-04/products/' + prod + '.json';
  try{
    const shopdetails = await storeModel.findOne({ storename : shop});
    accessToken = shopdetails.accesstoken;
    // console.log(shopdetails.accesstokesn)
    const shopRequestHeaders = {
      'X-Shopify-Access-Token': accessToken,
    };
    // try{
    //   const detailsdb =  await product.findOne({ "title" : title})
    //   await product.findByIdAndDelete(detailsdb.id);
    //   console.log("deleted in the database.")
    // }catch(error){
    //   res.status(500).send(error);
    // }
    try{
      const re = await axios({
        method : 'delete',
        url: shopRequestUrl,
        headers: shopRequestHeaders
      });
      console.log(re)
      res.end("deleted the product in the store")
    }catch(error){
      res.status(500).send(error)
    }
  }catch(error){
    console.log(error)
  }
}

module.exports ={
  install,callb, getproducts, createproducts, updateproducts,deleteproducts
}