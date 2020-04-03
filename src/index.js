#!/usr/bin/env node
const path = require('path')
const express = require('express')
const nofavicon = require('express-no-favicons')
const YouTube = require('./youtube')
const downloader = require('./downloader')

function getApp(tempDir) {
  const youtube = new YouTube(tempDir);
  const app = express()
  app.use(nofavicon())

  app.get('/', (req, res) => {
    const file = path.resolve(__dirname, 'index.html')
    res.sendFile(file)
  })

  app.get('/chunk/:videoId', (req, res) => {
    const videoId = req.params.videoId

    try {
      youtube.download({ id: videoId }, (err, { id, file }) => {
        if (err) return res.sendStatus(500, err)
        res.sendFile(file)
      })
    } catch (e) {
      res.status(500).send(e)
    }
  })

  app.get('/:videoId', (req, res) => {
    const videoId = req.params.videoId

    try {
      youtube.stream(videoId).pipe(res)
    } catch (e) {
      console.error('GOT STREAM ERROR', e)
      res.status(500).send(e)
    }
  })

  app.get('/cache/:videoId', (req, res) => {
    const videoId = req.params.videoId

    try {
      youtube.stream(videoId, true).pipe(res)
    } catch (e) {
      console.error('GOT ERROR', e)
      res.status(500).send(e)
    }
  })

  app.get('/search/:query/:page?', (req, res) => {
    const { query, page } = req.params
    youtube.search({ query, page }, (err, data) => {
      if (err) {
        console.log(err)
        res.status(500).send(err)
        return
      }

      res.json(data)
    })
  })

  app.get('/get/:id', (req, res) => {
    const id = req.params.id

    youtube.get(id, (err, data) => {
      if (err) {
        console.log(err)
        res.sendStatus(500, err)
        return
      }

      res.json(data)
    })
  })

  app.use((req, res) => {
    res.sendStatus(404)
  })

  return app;
}

function listen (port, callback = () => {}) {
  const app = getApp();
  app.listen(port, callback)
}

module.exports = {
  listen,
  getApp,
  downloader,
  get: (id, callback) => youtube.get(id, callback),
  search: ({ query, page }, callback) => youtube.search({ query, page }, callback),
  setKey: key => youtube.setKey(key)
}
