const fs = require('fs')
const path = require('path')
const mkdirp = require('mkdirp')
const ytdl = require('ytdl-core')
const YtNode = require('youtube-node')
const through2 = require('through2')
const Ffmpeg = require('fluent-ffmpeg')
const cache = {}

class YouTube {
  constructor (tempFolder=null) {
    this.pageSize = 10
    this.tempFolder = tempFolder || path.resolve(__dirname, '../temp-audio')
    console.log('TEMP AUDIO FOLDER:', this.tempFolder)
    mkdirp(this.tempFolder) // Create temp folder if it doesn't exist.

    const envApiKey = process.env.KEY
    if (envApiKey) this.setKey(envApiKey)
  }

  setKey (apiKey) {
    this.ytNode = new YtNode()
    this.ytNode.setKey(apiKey)
  }

  streamDownloaded (id, callback) {
    const video = ytdl(id)
    const ffmpeg = new Ffmpeg(video)
    let sent = false

    try {
      const file = `${this.tempFolder}/${id}.mp3`
      ffmpeg
        .format('mp3')
        .on('end', () => {
          ffmpeg.kill()
        })
        .on('data', () => {
          if (sent) return
          sent = true
          callback(fs.createReadStream(file))
        })
        .save(file)
    } catch (e) {
      throw e
    }
  }

  stream (id, useCache) {
    if (useCache) {
      const cached = cache[id]
      if (cached) return cached
    }

    const video = ytdl(id)
    const ffmpeg = new Ffmpeg(video)
    const stream = through2()

    ffmpeg
      .format('mp3')
      .on('end', () => {
        cache[id] = null
        ffmpeg.kill()
      })
      .on('error', e => {
        console.log('GOT ERROR', e);
        stream.end();
      })
      .pipe(
        stream,
        { end: true }
      )

    cache[id] = stream
    return stream
  }

  download ({ id, file }, callback) {
    file = file || `${this.tempFolder}/${id}.mp3`
    const fileWriter = fs.createWriteStream(file)

    try {
      this.stream(id).pipe(fileWriter)
    } catch (e) {
      throw e
    }

    fileWriter.on('finish', () => {
      fileWriter.end()

      if (typeof callback === 'function') {
        callback(null, { id, file })
      }
    })

    fileWriter.on('error', error => {
      fileWriter.end()

      if (typeof callback === 'function') {
        callback(error, null)
      }
    })
  }

  search ({ query, page }, callback) {
    if (page) {
      this.ytNode.addParam('pageToken', page)
    }

    this.ytNode.search(query, this.pageSize, callback)
  }

  get (id, callback) {
    this.ytNode.getById(id, callback)
  }
}

module.exports = YouTube;
