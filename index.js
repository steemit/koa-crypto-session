'use strict'

const secureRandom = require('secure-random')
const session = require('koa-session')
const crypto = require('crypto')

module.exports = function(app, opts) {
  opts = opts || {}

  if (opts.signed === undefined) {
    opts.signed = true
  }

  if(!opts.crypto_key)
    throw new Error('Missing options.crypto_key')

  const key = opts.crypto_key
  const algorithm = opts.algorithm || 'aes-256-cbc'

  opts.encode = encode
  opts.decode = decode

  app.use(session(app, opts))

  function encode(body) {
      body = JSON.stringify(body)
      let base64 = new Buffer(body).toString('base64')
      
      return encrypt(base64, key, algorithm)
  }
  
  function decode(text) {
     
      let body = new Buffer(decrypt(text, key, algorithm), 'base64').toString('utf8')
      let json = JSON.parse(body)
      
      // check if the cookie is expired
      if (!json._expire) return null
      if (json._expire < Date.now()) return null
      
      return json
  }
}


function encrypt(text, key, algorithm) {
    const iv = secureRandom.randomBuffer(16)
    let cipher = crypto.createCipheriv(algorithm, key, iv)
    let crypted = iv.toString('base64') + ' ' + cipher.update(text, 'utf8', 'base64')
    crypted += cipher.final('base64')
    return crypted
}

function decrypt(text, key, algorithm) {
    const space = text.indexOf(' ')
    if(space == -1)
        throw new Error('Unrecognized encrypted session data format.')

    const iv = new Buffer(text.substring(0, space), 'base64')
    const ciphertext = text.substring(space + 1)
    let decipher = crypto.createDecipheriv(algorithm, key, iv)
    let dec = decipher.update(ciphertext, 'base64', 'utf8')
    dec += decipher.final('utf8')

    return dec
}
